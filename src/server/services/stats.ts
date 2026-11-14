import type { LeaderboardEntry, NgoStats, PublicStats, Severity } from "@/types";
import { connectDB } from "../db/connect";
import { Report } from "../models/Report";
import { Ngo } from "../models/Ngo";
import { Donation } from "../models/Donation";
import { cached, CacheKeys } from "../lib/cache";
import { coarsen } from "../lib/geo";

const DAY = 24 * 60 * 60 * 1000;

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return Math.round(s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2);
}

function dayKeys(days: number): string[] {
  const out: string[] = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) out.push(new Date(today.getTime() - i * DAY).toISOString().slice(0, 10));
  return out;
}

/**
 * Public, anonymised platform metrics for the landing page and the live impact dashboard.
 * One $facet aggregation computes everything in a single round-trip; the result is cached in
 * Redis for 30s (and invalidated on state changes), so traffic spikes never reach Mongo.
 */
export function publicStats(): Promise<PublicStats> {
  return cached(CacheKeys.publicStats, 30, async () => {
    await connectDB();
    const since14 = new Date(Date.now() - 14 * DAY);
    const since90 = new Date(Date.now() - 90 * DAY);

    const [facet] = await Report.aggregate([
      {
        $facet: {
          byStatus: [{ $group: { _id: "$status", n: { $sum: 1 } } }],
          bySeverity: [{ $match: { status: { $ne: "closed" } } }, { $group: { _id: "$severity", n: { $sum: 1 } } }],
          citizens: [{ $group: { _id: "$reporterId" } }, { $count: "n" }],
          raised: [{ $group: { _id: null, n: { $sum: "$fundraisingRaised" } } }],
          reportedDaily: [
            { $match: { createdAt: { $gte: since14 } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, n: { $sum: 1 } } },
          ],
          rescuedDaily: [
            { $match: { resolvedAt: { $gte: since14 } } },
            { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$resolvedAt" } }, n: { $sum: 1 } } },
          ],
          durations: [
            { $match: { assignedAt: { $exists: true }, createdAt: { $gte: since90 } } },
            { $sort: { createdAt: -1 } },
            { $limit: 2000 },
            {
              $project: {
                _id: 0,
                response: { $divide: [{ $subtract: ["$assignedAt", "$createdAt"] }, 60000] },
                resolution: {
                  $cond: [{ $ifNull: ["$resolvedAt", false] }, { $divide: [{ $subtract: ["$resolvedAt", "$createdAt"] }, 60000] }, null],
                },
              },
            },
          ],
          hotspots: [
            { $match: { createdAt: { $gte: since90 } } },
            {
              $group: {
                _id: {
                  lat: { $round: [{ $arrayElemAt: ["$location.coordinates", 1] }, 2] },
                  lng: { $round: [{ $arrayElemAt: ["$location.coordinates", 0] }, 2] },
                },
                n: { $sum: 1 },
              },
            },
            { $sort: { n: -1 } },
            { $limit: 250 },
          ],
          recent: [
            { $match: { status: { $ne: "closed" } } },
            { $sort: { createdAt: -1 } },
            { $limit: 8 },
            { $project: { status: 1, severity: 1, injuryType: 1, createdAt: 1, updatedAt: 1, location: 1 } },
          ],
        },
      },
    ]);

    const status = Object.fromEntries((facet.byStatus as { _id: string; n: number }[]).map((s) => [s._id, s.n]));
    const severityMix: Record<Severity, number> = { CRITICAL: 0, MODERATE: 0, ROUTINE: 0 };
    for (const s of facet.bySeverity as { _id: Severity; n: number }[]) severityMix[s._id] = s.n;

    const reportedMap = new Map((facet.reportedDaily as { _id: string; n: number }[]).map((d) => [d._id, d.n]));
    const rescuedMap = new Map((facet.rescuedDaily as { _id: string; n: number }[]).map((d) => [d._id, d.n]));
    const durations = facet.durations as { response: number; resolution: number | null }[];

    const [ngos, raisedFromLedger] = await Promise.all([
      Ngo.countDocuments({ status: "approved" }),
      Donation.aggregate<{ n: number }>([{ $group: { _id: null, n: { $sum: "$amount" } } }]),
    ]);

    return {
      totals: {
        reported: Object.values(status).reduce((a: number, b) => a + (b as number), 0) - (status.closed ?? 0),
        rescued: status.resolved ?? 0,
        active: (status.pending ?? 0) + (status.assigned ?? 0) + (status.en_route ?? 0),
        ngos,
        citizens: facet.citizens[0]?.n ?? 0,
        raised: Math.max(facet.raised[0]?.n ?? 0, raisedFromLedger[0]?.n ?? 0),
      },
      medianResponseMinutes: median(durations.map((d) => d.response).filter((n) => n >= 0)),
      medianResolutionMinutes: median(durations.map((d) => d.resolution).filter((n): n is number => n != null && n >= 0)),
      severityMix,
      daily: dayKeys(14).map((date) => ({ date, reported: reportedMap.get(date) ?? 0, rescued: rescuedMap.get(date) ?? 0 })),
      hotspots: (facet.hotspots as { _id: { lat: number; lng: number }; n: number }[]).map((h) => ({
        lat: h._id.lat,
        lng: h._id.lng,
        weight: h.n,
      })),
      recent: (facet.recent as { _id: unknown; status: PublicStats["recent"][number]["status"]; severity: Severity; injuryType: string; updatedAt: Date; location: { coordinates: number[] } }[]).map(
        (r) => ({
          id: String(r._id),
          status: r.status,
          severity: r.severity,
          injuryType: r.injuryType,
          at: new Date(r.updatedAt).toISOString(),
          area: `${coarsen(r.location.coordinates[1]!, 2).toFixed(2)}°N, ${coarsen(r.location.coordinates[0]!, 2).toFixed(2)}°E`,
        })
      ),
      generatedAt: new Date().toISOString(),
    };
  });
}

export function ngoStats(ngoUserId: string): Promise<NgoStats> {
  return cached(CacheKeys.ngoStats(ngoUserId), 60, async () => {
    await connectDB();
    const since30 = new Date(Date.now() - 30 * DAY);
    const docs = await Report.find(
      { ngoUserId },
      { status: 1, createdAt: 1, assignedAt: 1, resolvedAt: 1, fundraisingRaised: 1 }
    )
      .sort({ createdAt: -1 })
      .limit(2000)
      .lean();

    const resolvedDaily = new Map<string, number>();
    for (const d of docs) {
      if (d.resolvedAt && d.resolvedAt >= since30) {
        const k = d.resolvedAt.toISOString().slice(0, 10);
        resolvedDaily.set(k, (resolvedDaily.get(k) ?? 0) + 1);
      }
    }
    const minutes = (a?: Date, b?: Date) => (a && b ? (b.getTime() - a.getTime()) / 60000 : null);
    return {
      accepted: docs.length,
      resolved: docs.filter((d) => d.status === "resolved").length,
      active: docs.filter((d) => d.status === "assigned" || d.status === "en_route").length,
      medianResponseMinutes: median(docs.map((d) => minutes(d.createdAt, d.assignedAt)).filter((n): n is number => n != null)),
      medianResolutionMinutes: median(docs.map((d) => minutes(d.createdAt, d.resolvedAt)).filter((n): n is number => n != null)),
      raised: docs.reduce((s, d) => s + (d.fundraisingRaised ?? 0), 0),
      last30: dayKeys(30).map((date) => ({ date, resolved: resolvedDaily.get(date) ?? 0 })),
    };
  });
}

export function badgeFor(rescues: number): LeaderboardEntry["badge"] {
  if (rescues >= 25) return "Guardian";
  if (rescues >= 10) return "Protector";
  if (rescues >= 3) return "Rescuer";
  return "Helper";
}

export function leaderboard(): Promise<LeaderboardEntry[]> {
  return cached(CacheKeys.leaderboard, 120, async () => {
    await connectDB();
    const rows = await Report.aggregate<{ _id: string; name: string; phone: string; rescues: number; reports: number }>([
      { $match: { status: { $ne: "closed" } } },
      {
        $group: {
          _id: "$reporterId",
          name: { $last: "$reporterName" },
          phone: { $last: "$reporterPhone" },
          reports: { $sum: 1 },
          rescues: { $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] } },
        },
      },
      { $addFields: { karma: { $add: [{ $multiply: ["$rescues", 50] }, { $multiply: ["$reports", 10] }] } } },
      { $sort: { karma: -1, rescues: -1 } },
      { $limit: 50 },
    ]);
    return rows.map((r, i) => ({
      rank: i + 1,
      id: r._id,
      // Display first name + last initial only; WhatsApp reporters are shown by masked number.
      name: r._id.startsWith("whatsapp-") ? `WhatsApp ••${String(r.phone).slice(-4)}` : shortName(r.name),
      rescues: r.rescues,
      reports: r.reports,
      karma: r.rescues * 50 + r.reports * 10,
      badge: badgeFor(r.rescues),
    }));
  });
}

function shortName(name?: string) {
  if (!name) return "Anonymous";
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0]}.` : first!;
}

export function adminOverview() {
  return cached(CacheKeys.adminOverview, 30, async () => {
    await connectDB();
    const [byStatus, applications, escalated] = await Promise.all([
      Report.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
      Ngo.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
      Report.countDocuments({ status: "pending", escalationLevel: { $gte: 1 } }),
    ]);
    return {
      reports: Object.fromEntries(byStatus.map((s) => [s._id, s.n])),
      ngos: Object.fromEntries(applications.map((s) => [s._id, s.n])),
      escalatedPending: escalated,
    };
  });
}
