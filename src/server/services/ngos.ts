import { clerkClient } from "@clerk/nextjs/server";
import { isValidObjectId } from "mongoose";
import type { PublicNgo } from "@/types";
import { connectDB } from "../db/connect";
import { Ngo, type INgo, type NgoStatus } from "../models/Ngo";
import { Report } from "../models/Report";
import { Errors } from "../lib/errors";
import { logger } from "../lib/logger";
import { cached, CacheKeys, invalidate } from "../lib/cache";
import { invalidateIdentity, type Identity } from "../auth/identity";
import { toNgoProfile } from "./serializers";

interface GeoInput {
  operatingLatitude?: number | null;
  operatingLongitude?: number | null;
}

/** Keeps the legacy lat/lng fields and the indexed GeoJSON point in sync. */
function geoFields(input: GeoInput) {
  if (input.operatingLatitude != null && input.operatingLongitude != null) {
    return {
      $set: {
        operatingLatitude: input.operatingLatitude,
        operatingLongitude: input.operatingLongitude,
        operatingLocation: { type: "Point", coordinates: [input.operatingLongitude, input.operatingLatitude] },
      },
      $unset: {},
    };
  }
  return { $set: {}, $unset: { operatingLatitude: 1, operatingLongitude: 1, operatingLocation: 1 } };
}

export async function applyAsNgo(
  identity: Identity,
  input: Pick<INgo, "ngoName" | "registrationNumber" | "contactPerson" | "phone" | "address"> & GeoInput & { operatingRadius?: number }
) {
  await connectDB();
  const existing = await Ngo.findOne({ userId: identity.userId }, { status: 1 }).lean();
  if (existing && existing.status !== "rejected") {
    throw Errors.conflict(
      existing.status === "approved" ? "Your organisation is already a verified partner." : "Your application is already under review."
    );
  }
  const geo = geoFields(input);
  const doc = await Ngo.findOneAndUpdate(
    { userId: identity.userId },
    {
      $set: {
        userId: identity.userId,
        email: identity.email || "unknown",
        ngoName: input.ngoName,
        registrationNumber: input.registrationNumber,
        contactPerson: input.contactPerson,
        phone: input.phone,
        address: input.address,
        operatingRadius: input.operatingRadius ?? 15,
        status: "pending",
        isAccepting: true,
        ...geo.$set,
      },
      $unset: { rejectionReason: 1, ...geo.$unset },
    },
    { upsert: true, returnDocument: "after", lean: true }
  );
  if (!doc) throw Errors.unavailable("Could not save the application. Please try again.");
  await invalidate(CacheKeys.adminOverview);
  return toNgoProfile(doc);
}

export async function getApplicationStatus(userId: string) {
  await connectDB();
  const doc = await Ngo.findOne({ userId }).lean();
  return doc ? { ...toNgoProfile(doc), rejectionReason: doc.rejectionReason } : null;
}

export async function getMyNgo(identity: Identity) {
  await connectDB();
  const doc = await Ngo.findOne({ userId: identity.userId, status: "approved" }).lean();
  if (!doc) throw Errors.notFound("Approved NGO profile");
  return toNgoProfile(doc);
}

export async function updateMyNgo(
  identity: Identity,
  input: { ngoName: string; phone: string; address: string; operatingRadius: number } & GeoInput
) {
  await connectDB();
  const geo = geoFields(input);
  const doc = await Ngo.findOneAndUpdate(
    { userId: identity.userId, status: "approved" },
    {
      $set: { ngoName: input.ngoName, phone: input.phone, address: input.address, operatingRadius: input.operatingRadius, ...geo.$set },
      ...(Object.keys(geo.$unset).length ? { $unset: geo.$unset } : {}),
    },
    { returnDocument: "after", lean: true }
  );
  if (!doc) throw Errors.notFound("Approved NGO profile");
  await Promise.all([invalidateIdentity(identity.userId), invalidate(CacheKeys.ngoDirectory)]);
  syncClerkMetadata(identity.userId, { ngoName: doc.ngoName });
  return toNgoProfile(doc);
}

export async function setAccepting(identity: Identity, isAccepting: boolean) {
  await connectDB();
  const res = await Ngo.updateOne({ userId: identity.userId, status: "approved" }, { $set: { isAccepting } });
  if (!res.matchedCount) throw Errors.notFound("Approved NGO profile");
  await Promise.all([invalidateIdentity(identity.userId), invalidate(CacheKeys.ngoDirectory)]);
  return { isAccepting };
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export async function listApplications(status?: NgoStatus) {
  await connectDB();
  const docs = await Ngo.find(status ? { status } : {}).sort({ createdAt: -1 }).limit(500).lean();
  return docs.map((d) => ({ ...toNgoProfile(d), rejectionReason: d.rejectionReason }));
}

export async function decideApplication(
  id: string,
  admin: Identity,
  decision: "approved" | "rejected" | "suspended",
  reason?: string
) {
  if (!isValidObjectId(id)) throw Errors.notFound("Application");
  await connectDB();
  const allowedFrom: Record<typeof decision, NgoStatus[]> = {
    approved: ["pending", "rejected", "suspended"],
    rejected: ["pending"],
    suspended: ["approved"],
  };
  const doc = await Ngo.findOneAndUpdate(
    { _id: id, status: { $in: allowedFrom[decision] } },
    {
      $set: { status: decision, reviewedBy: admin.userId, reviewedAt: new Date(), ...(reason ? { rejectionReason: reason } : {}) },
      ...(decision === "approved" ? { $unset: { rejectionReason: 1 } } : {}),
    },
    { returnDocument: "after", lean: true }
  );
  if (!doc) {
    const exists = await Ngo.exists({ _id: id });
    throw exists ? Errors.conflict(`Application cannot be ${decision} from its current state.`) : Errors.notFound("Application");
  }

  await Promise.all([invalidateIdentity(doc.userId), invalidate(CacheKeys.ngoDirectory, CacheKeys.adminOverview)]);
  // Clerk metadata is only a UI hint; the server always authorises against Mongo.
  syncClerkMetadata(doc.userId, decision === "approved" ? { role: "ngo", ngoName: doc.ngoName } : { role: null });
  return toNgoProfile(doc);
}

function syncClerkMetadata(userId: string, publicMetadata: Record<string, unknown>) {
  void (async () => {
    try {
      const client = await clerkClient();
      await client.users.updateUserMetadata(userId, { publicMetadata });
    } catch (err) {
      logger.warn({ err }, "clerk metadata sync failed");
    }
  })();
}

// ─── Public directory ────────────────────────────────────────────────────────

export function ngoDirectory(): Promise<PublicNgo[]> {
  return cached(CacheKeys.ngoDirectory, 300, async () => {
    await connectDB();
    const [ngos, counts] = await Promise.all([
      Ngo.find({ status: "approved" }, { ngoName: 1, address: 1, operatingRadius: 1, operatingLocation: 1, isAccepting: 1 }).lean(),
      Report.aggregate<{ _id: string; n: number }>([
        { $match: { status: "resolved", ngoUserId: { $exists: true } } },
        { $group: { _id: "$ngoName", n: { $sum: 1 } } },
      ]),
    ]);
    const byName = new Map(counts.map((c) => [c._id, c.n]));
    return ngos
      .map((n) => {
        const [lng, lat] = n.operatingLocation?.coordinates ?? [];
        return {
          id: String(n._id),
          ngoName: n.ngoName,
          address: n.address,
          operatingRadius: n.operatingRadius ?? 15,
          // Coarsened: the directory shows coverage areas, not exact office pins.
          location: lat != null && lng != null ? { lat: Math.round(lat * 100) / 100, lng: Math.round(lng * 100) / 100 } : undefined,
          isAccepting: n.isAccepting !== false,
          rescues: byName.get(n.ngoName) ?? 0,
        };
      })
      .sort((a, b) => b.rescues - a.rescues);
  });
}
