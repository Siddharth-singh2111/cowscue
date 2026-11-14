import { isValidObjectId, type QueryFilter } from "mongoose";
import {
  Channels,
  Events,
  type CitizenReport,
  type CloseReason,
  type OpsReport,
  type ReportStatus,
  type Triage,
} from "@/types";
import { connectDB } from "../db/connect";
import { Report, type IReport, type ITimelineEvent } from "../models/Report";
import { Errors } from "../lib/errors";
import { logger } from "../lib/logger";
import { CacheKeys, invalidate } from "../lib/cache";
import { signDriverToken } from "../lib/tokens";
import { driverLinkSecret, env } from "../config/env";
import { enqueue } from "../queue";
import { publish } from "./realtime";
import { slaDelayMs } from "./dispatch";
import { triageImage } from "./triage";
import { toCitizenReport, toOpsReport, toPublicReport } from "./serializers";
import type { Identity } from "../auth/identity";

/** Reports within this distance and window of an open case are flagged as probable duplicates. */
export const DUPLICATE_RADIUS_M = 150;
export const DUPLICATE_WINDOW_MS = 6 * 60 * 60 * 1000;
const ACTIVE: ReportStatus[] = ["pending", "assigned", "en_route"];
const EARTH_RADIUS_KM = 6378.1;

const event = (type: ITimelineEvent["type"], message: string, actor?: string): ITimelineEvent => ({
  type,
  message,
  actor,
  at: new Date(),
});

export function assertId(id: string) {
  if (!isValidObjectId(id)) throw Errors.notFound("Report");
}

// ─── Create ──────────────────────────────────────────────────────────────────

export interface CreateReportCommand {
  reporterId: string;
  reporterName: string;
  reporterPhone: string;
  channel: "web" | "whatsapp";
  imageUrl: string;
  description: string;
  latitude: number;
  longitude: number;
  /** Pre-computed triage (e.g. WhatsApp flow already ran it); otherwise it runs here. */
  triage?: Triage;
}

export async function createReport(cmd: CreateReportCommand) {
  const triage = cmd.triage ?? (await triageImage({ imageUrl: cmd.imageUrl, description: cmd.description }));
  if (!triage.isCattle) {
    throw Errors.unprocessable(
      "Our AI couldn't find a cow or cattle in this photo. Please retake it with the animal clearly visible.",
      { reason: "NOT_CATTLE" }
    );
  }

  await connectDB();
  const coordinates = [cmd.longitude, cmd.latitude];

  const [reporterHistory, duplicateOf] = await Promise.all([
    Report.countDocuments({ reporterId: cmd.reporterId, status: "resolved" }),
    Report.findOne(
      {
        status: { $in: ACTIVE },
        createdAt: { $gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
        location: { $nearSphere: { $geometry: { type: "Point", coordinates }, $maxDistance: DUPLICATE_RADIUS_M } },
      },
      { _id: 1 }
    ).lean(),
  ]);

  const timeline: ITimelineEvent[] = [
    event("reported", `Reported via ${cmd.channel === "whatsapp" ? "WhatsApp" : "web app"}.`),
    event(
      "triaged",
      triage.source === "ai"
        ? `AI triage: ${triage.severity.toLowerCase()} — ${triage.injuryType} (${Math.round(triage.confidence * 100)}% confidence).`
        : `Triage estimated as ${triage.severity.toLowerCase()} from the description; a responder will confirm.`
    ),
  ];
  if (duplicateOf) {
    timeline.push(event("duplicate_flagged", "Linked to an open case reported nearby — responders are already notified."));
  }

  const report = await Report.create({
    reporterId: cmd.reporterId,
    reporterName: cmd.reporterName,
    reporterPhone: cmd.reporterPhone,
    reporterHistory,
    channel: cmd.channel,
    imageUrl: cmd.imageUrl,
    description: cmd.description,
    location: { type: "Point", coordinates },
    severity: triage.severity,
    injuryType: triage.injuryType,
    triageConfidence: triage.confidence,
    triageSource: triage.source,
    firstAid: triage.firstAid,
    duplicateOf: duplicateOf?._id,
    timeline,
  });

  if (duplicateOf) {
    await Report.updateOne(
      { _id: duplicateOf._id },
      { $inc: { duplicateCount: 1 }, $push: { timeline: event("duplicate_flagged", "Another citizen reported this animal.") } }
    );
  }

  const doc = report.toObject();
  await Promise.all([
    publish(Channels.ngoFeed, Events.reportCreated, toOpsReport(doc)),
    publish(Channels.publicFeed, Events.statsChanged, { at: Date.now() }),
    invalidate(CacheKeys.publicStats),
  ]);

  if (!duplicateOf) {
    const id = String(report._id);
    await enqueue("dispatch.notify", { reportId: id, level: 0 }, { jobId: `dispatch:${id}:0` });
    await enqueue("sla.check", { reportId: id, level: 0 }, { delayMs: slaDelayMs(triage.severity, 0), jobId: `sla:${id}:0` });
  }

  logger.info({ reportId: String(report._id), severity: triage.severity, duplicate: Boolean(duplicateOf) }, "report created");
  return { report: toCitizenReport(doc), duplicate: Boolean(duplicateOf) };
}

// ─── Reads ───────────────────────────────────────────────────────────────────

export async function getPublicReport(id: string) {
  assertId(id);
  await connectDB();
  const r = await Report.findById(id).lean();
  if (!r) throw Errors.notFound("Report");
  return toPublicReport(r);
}

export async function getOpsReport(id: string, viewer?: { userId?: string }) {
  assertId(id);
  await connectDB();
  const r = await Report.findById(id).lean();
  if (!r) throw Errors.notFound("Report");
  return toOpsReport(r, viewer);
}

/**
 * The NGO command-center feed: everything inside the requested area from the last 30 days plus
 * every open case this NGO owns (even if the driver has since moved outside the area).
 * Uses $geoWithin (index-backed and, unlike $near, sortable by recency).
 */
export async function listNgoFeed(
  identity: Identity,
  area: { lat?: number; lng?: number; radiusKm: number }
): Promise<OpsReport[]> {
  await connectDB();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const filter: QueryFilter<IReport> = { createdAt: { $gte: since } };
  if (area.lat != null && area.lng != null) {
    filter.location = { $geoWithin: { $centerSphere: [[area.lng, area.lat], area.radiusKm / EARTH_RADIUS_KM] } };
  }

  const [inArea, mine] = await Promise.all([
    Report.find(filter).sort({ createdAt: -1 }).limit(300).lean(),
    Report.find({ ngoUserId: identity.userId, status: { $in: ACTIVE } }).lean(),
  ]);

  const byId = new Map<string, IReport>();
  for (const r of [...mine, ...inArea]) byId.set(String(r._id), r);
  const viewer = { userId: identity.userId, lat: area.lat, lng: area.lng };
  return [...byId.values()].map((r) => toOpsReport(r, viewer));
}

export async function listCitizenReports(userId: string) {
  await connectDB();
  const docs = await Report.find({ reporterId: userId }).sort({ createdAt: -1 }).limit(100).lean();
  const reports: CitizenReport[] = docs.map(toCitizenReport);
  const rescued = docs.filter((d) => d.status === "resolved").length;
  return {
    reports,
    stats: {
      totalReported: docs.length,
      rescued,
      active: docs.filter((d) => ACTIVE.includes(d.status)).length,
      karma: rescued * 50 + docs.length * 10,
    },
  };
}

// ─── Lifecycle transitions ───────────────────────────────────────────────────

export function driverLink(reportId: string) {
  return `${env().NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/driver/${reportId}?t=${signDriverToken(reportId, driverLinkSecret())}`;
}

/**
 * Accept a case. The status precondition inside findOneAndUpdate makes this an atomic
 * compare-and-set: if two NGOs click "accept" at the same instant exactly one wins and the other
 * receives a 409 — no locks, works across any number of replicas.
 */
export async function assignReport(id: string, identity: Identity, input: { driverName: string; driverPhone: string }) {
  assertId(id);
  if (!identity.ngo && identity.role !== "superadmin") throw Errors.forbidden("Only partner NGOs can accept rescues.");
  await connectDB();
  const ngoName = identity.ngo?.ngoName ?? "Cowscue Ops";

  const updated = await Report.findOneAndUpdate(
    { _id: id, status: "pending" },
    {
      $set: {
        status: "assigned",
        ngoUserId: identity.userId,
        ngoId: identity.ngo?.id,
        ngoName,
        driverName: input.driverName,
        driverPhone: input.driverPhone,
        assignedAt: new Date(),
      },
      $push: { timeline: event("assigned", `${ngoName} accepted the rescue. ${input.driverName} is being dispatched.`, identity.userId) },
    },
    { returnDocument: "after", lean: true }
  );

  if (!updated) {
    const exists = await Report.exists({ _id: id });
    if (!exists) throw Errors.notFound("Report");
    throw Errors.conflict("Another team has already accepted this rescue.");
  }

  await afterTransition(updated);
  await enqueue("citizen.notify", { reportId: id, kind: "assigned" });
  return { report: toOpsReport(updated, { userId: identity.userId }), driverLink: driverLink(id) };
}

export async function updateDriverLocation(id: string, coords: { latitude: number; longitude: number }) {
  assertId(id);
  await connectDB();
  const now = new Date();
  const set = { driverLatitude: coords.latitude, driverLongitude: coords.longitude, driverUpdatedAt: now };

  // First fix after acceptance moves the case to "en route" (single atomic transition).
  let updated = await Report.findOneAndUpdate(
    { _id: id, status: "assigned" },
    { $set: { ...set, status: "en_route", enRouteAt: now }, $push: { timeline: event("en_route", "Ambulance is on the way with live GPS tracking.") } },
    { returnDocument: "after", lean: true }
  );
  if (updated) {
    await afterTransition(updated);
  } else {
    updated = await Report.findOneAndUpdate({ _id: id, status: "en_route" }, { $set: set }, { returnDocument: "after", lean: true });
    if (!updated) throw Errors.conflict("This rescue is not active any more.");
  }

  const payload = { id, lat: coords.latitude, lng: coords.longitude, updatedAt: now.toISOString() };
  await Promise.all([
    publish(Channels.report(id), Events.driverMoved, payload),
    publish(Channels.ngoFeed, Events.driverMoved, payload),
  ]);
  return payload;
}

type Actor = { kind: "ngo"; identity: Identity } | { kind: "driver" };

export async function resolveReport(id: string, actor: Actor, input: { resolvedImageUrl: string; notes?: string }) {
  assertId(id);
  await connectDB();
  const filter: QueryFilter<IReport> = { _id: id, status: { $in: ["assigned", "en_route"] } };
  if (actor.kind === "ngo" && actor.identity.role !== "superadmin") filter.ngoUserId = actor.identity.userId;

  const updated = await Report.findOneAndUpdate(
    filter,
    {
      $set: { status: "resolved", resolvedImageUrl: input.resolvedImageUrl, resolutionNotes: input.notes, resolvedAt: new Date() },
      $push: { timeline: event("resolved", "The animal is safe and in care. Thank you for reporting! 💚") },
    },
    { returnDocument: "after", lean: true }
  );
  if (!updated) throw await explainTransitionFailure(id, actor);

  await afterTransition(updated, true);
  await enqueue("citizen.notify", { reportId: id, kind: "resolved" });
  return toOpsReport(updated, actor.kind === "ngo" ? { userId: actor.identity.userId } : undefined);
}

const CLOSE_LABEL: Record<CloseReason, string> = {
  duplicate: "Closed as a duplicate of another report.",
  false_alarm: "Closed — responders found no animal in distress.",
  not_found: "Closed — the animal could not be located at the pinned spot.",
  other: "Closed by the responding team.",
};

export async function closeReport(id: string, identity: Identity, input: { reason: CloseReason; note?: string }) {
  assertId(id);
  await connectDB();
  const isAdmin = identity.role === "superadmin";
  const filter: QueryFilter<IReport> = isAdmin
    ? { _id: id, status: { $in: ACTIVE } }
    : { _id: id, $or: [{ status: "pending" }, { status: { $in: ["assigned", "en_route"] }, ngoUserId: identity.userId }] };

  const message = input.note ? `${CLOSE_LABEL[input.reason]} Note: ${input.note}` : CLOSE_LABEL[input.reason];
  const updated = await Report.findOneAndUpdate(
    filter,
    { $set: { status: "closed", closeReason: input.reason, closedAt: new Date() }, $push: { timeline: event("closed", message, identity.userId) } },
    { returnDocument: "after", lean: true }
  );
  if (!updated) throw await explainTransitionFailure(id, { kind: "ngo", identity });

  await afterTransition(updated, true);
  await enqueue("citizen.notify", { reportId: id, kind: "closed" });
  return toOpsReport(updated, { userId: identity.userId });
}

export async function updateFundraiser(
  id: string,
  identity: Identity,
  input: { active: boolean; title?: string; description?: string; goal?: number }
) {
  assertId(id);
  await connectDB();
  const filter: QueryFilter<IReport> = { _id: id, status: { $in: ["assigned", "en_route", "resolved"] } };
  if (identity.role !== "superadmin") filter.ngoUserId = identity.userId;

  const set: Partial<IReport> = { isFundraising: input.active };
  if (input.title !== undefined) set.fundraisingTitle = input.title;
  if (input.description !== undefined) set.fundraisingDescription = input.description;
  if (input.goal !== undefined) set.fundraisingGoal = input.goal;

  const updated = await Report.findOneAndUpdate(
    filter,
    {
      $set: set,
      $push: {
        timeline: input.active
          ? event("fundraiser_started", `${identity.ngo?.ngoName ?? "The NGO"} opened a recovery fund.`, identity.userId)
          : event("fundraiser_paused", "The recovery fund was paused.", identity.userId),
      },
    },
    { returnDocument: "after", lean: true }
  );
  if (!updated) throw Errors.forbidden("Only the team handling this rescue can manage its fundraiser.");
  await afterTransition(updated);
  return toOpsReport(updated, { userId: identity.userId });
}

// ─── Internals ───────────────────────────────────────────────────────────────

async function afterTransition(doc: IReport, affectsStats = false) {
  const id = String(doc._id);
  const tasks: Promise<unknown>[] = [
    publish(Channels.report(id), Events.reportUpdated, toPublicReport(doc)),
    publish(Channels.ngoFeed, Events.reportUpdated, toOpsReport(doc)),
  ];
  if (affectsStats) {
    tasks.push(
      invalidate(CacheKeys.publicStats, CacheKeys.leaderboard, CacheKeys.adminOverview, ...(doc.ngoUserId ? [CacheKeys.ngoStats(doc.ngoUserId)] : [])),
      publish(Channels.publicFeed, Events.statsChanged, { at: Date.now() })
    );
  }
  await Promise.all(tasks);
}

async function explainTransitionFailure(id: string, actor: Actor) {
  const current = await Report.findById(id, { status: 1, ngoUserId: 1 }).lean();
  if (!current) return Errors.notFound("Report");
  if (actor.kind === "ngo" && current.ngoUserId && current.ngoUserId !== actor.identity.userId && actor.identity.role !== "superadmin") {
    return Errors.forbidden("This rescue is being handled by another team.");
  }
  return Errors.conflict(`This rescue is already ${current.status.replace("_", " ")}.`);
}

