import type { Types } from "mongoose";
import { MAX_ESCALATION_LEVEL, SLA_MINUTES, type Severity } from "@/types";
import { connectDB } from "../db/connect";
import { Ngo } from "../models/Ngo";

/**
 * Geofenced dispatch.
 *
 * Each NGO defines an operating centre + radius. A report is dispatched to every approved NGO that
 * is accepting rescues and whose (escalation-scaled) circle contains the report. This runs as a
 * single `$geoNear` aggregation on a 2dsphere index — O(log n) instead of scanning every NGO and
 * computing Haversine in application code.
 *
 * Escalation widens the net: level 0 = each NGO's own radius, level 1 = 1.5×, level 2 = 2×,
 * level 3 = broadcast to every accepting NGO within 100 km regardless of radius.
 */
export const ESCALATION_MULTIPLIERS = [1, 1.5, 2] as const;
export const BROADCAST_RADIUS_KM = 100;

export interface DispatchTarget {
  id: Types.ObjectId;
  userId: string;
  ngoName: string;
  phone: string;
  distanceKm: number;
}

export function radiusMultiplier(level: number): number | null {
  if (level >= MAX_ESCALATION_LEVEL) return null; // broadcast
  return ESCALATION_MULTIPLIERS[Math.max(0, level)] ?? ESCALATION_MULTIPLIERS.at(-1)!;
}

export async function findDispatchTargets(lat: number, lng: number, level = 0): Promise<DispatchTarget[]> {
  await connectDB();
  const multiplier = radiusMultiplier(level);

  const pipeline: Parameters<typeof Ngo.aggregate>[0] = [
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        key: "operatingLocation",
        distanceField: "distanceM",
        spherical: true,
        maxDistance: BROADCAST_RADIUS_KM * 1000,
        query: { status: "approved", isAccepting: { $ne: false } },
      },
    },
  ];
  if (multiplier !== null) {
    pipeline.push({
      $match: {
        $expr: { $lte: ["$distanceM", { $multiply: [{ $ifNull: ["$operatingRadius", 15] }, 1000, multiplier] }] },
      },
    });
  }
  pipeline.push({ $limit: 25 }, { $project: { userId: 1, ngoName: 1, phone: 1, distanceM: 1 } });

  const rows = await Ngo.aggregate<{ _id: Types.ObjectId; userId: string; ngoName: string; phone: string; distanceM: number }>(
    pipeline
  );
  return rows.map((r) => ({
    id: r._id,
    userId: r.userId,
    ngoName: r.ngoName,
    phone: r.phone,
    distanceKm: Math.round((r.distanceM / 1000) * 10) / 10,
  }));
}

/** When should the SLA timer for this severity/level fire? Later levels wait a little longer. */
export function slaDelayMs(severity: Severity, level: number): number {
  return SLA_MINUTES[severity] * 60_000 * (1 + level * 0.5);
}

export function formatDispatchAlert(input: {
  severity: Severity;
  injuryType: string;
  description: string;
  lat: number;
  lng: number;
  distanceKm?: number;
  level: number;
  appUrl: string;
}) {
  const icon = input.severity === "CRITICAL" ? "🔴" : input.severity === "MODERATE" ? "🟠" : "🔵";
  const escalation = input.level > 0 ? `\n⚠️ *Escalated (level ${input.level})* — no team has accepted yet.` : "";
  const distance = input.distanceKm != null ? ` · ${input.distanceKm} km from your base` : "";
  return (
    `🚨 *Cowscue rescue alert* ${icon} ${input.severity}${escalation}\n\n` +
    `*Condition:* ${input.injuryType}\n` +
    `*Note:* ${input.description.slice(0, 200)}\n\n` +
    `📍 https://maps.google.com/?q=${input.lat},${input.lng}${distance}\n\n` +
    `Accept it in the command center: ${input.appUrl}/dashboard`
  );
}
