import type { CitizenReport, Donation, NgoProfile, OpsReport, PublicReport, TimelineEvent } from "@/types";
import type { IReport } from "../models/Report";
import type { INgo } from "../models/Ngo";
import type { IDonation } from "../models/Donation";
import { haversineKm } from "../lib/geo";

type ReportDoc = Pick<IReport, keyof IReport>;

const iso = (d?: Date | string | null) => (d ? new Date(d).toISOString() : undefined);

/**
 * DTO mappers. These are the *only* way report data leaves the server, which makes it impossible
 * to accidentally leak reporter phone numbers through a public endpoint or realtime channel.
 */
export function toPublicReport(r: ReportDoc): PublicReport {
  const [lng, lat] = r.location.coordinates;
  const hasDriver = r.driverLatitude != null && r.driverLongitude != null && r.status !== "resolved";
  return {
    id: String(r._id),
    status: r.status,
    severity: r.severity,
    injuryType: r.injuryType,
    description: r.description,
    imageUrl: r.imageUrl,
    resolvedImageUrl: r.resolvedImageUrl,
    location: { lat: lat!, lng: lng! },
    ngoName: r.ngoName,
    driverName: r.driverName,
    driver: hasDriver
      ? { lat: r.driverLatitude!, lng: r.driverLongitude!, updatedAt: iso(r.driverUpdatedAt) }
      : undefined,
    firstAid: r.firstAid ?? [],
    fundraiser: {
      active: Boolean(r.isFundraising),
      title: r.fundraisingTitle,
      description: r.fundraisingDescription,
      goal: r.fundraisingGoal ?? 0,
      raised: r.fundraisingRaised ?? 0,
      donorCount: r.donorCount ?? 0,
    },
    timeline: (r.timeline ?? []).map(
      (t): TimelineEvent => ({ type: t.type, at: iso(t.at)!, message: t.message })
    ),
    escalationLevel: r.escalationLevel ?? 0,
    createdAt: iso(r.createdAt)!,
    assignedAt: iso(r.assignedAt),
    resolvedAt: iso(r.resolvedAt),
    closeReason: r.closeReason,
  };
}

export function toOpsReport(r: ReportDoc, viewer?: { userId?: string; lat?: number; lng?: number }): OpsReport {
  const base = toPublicReport(r);
  const distanceKm =
    viewer?.lat != null && viewer?.lng != null
      ? Math.round(haversineKm(viewer.lat, viewer.lng, base.location.lat, base.location.lng) * 10) / 10
      : undefined;
  return {
    ...base,
    reporterName: r.reporterName,
    reporterPhone: r.reporterPhone,
    reporterHistory: r.reporterHistory ?? 0,
    channel: r.channel ?? (r.reporterId?.startsWith("whatsapp-") ? "whatsapp" : "web"),
    ngoUserId: r.ngoUserId,
    driverPhone: r.driverPhone,
    duplicateOf: r.duplicateOf ? String(r.duplicateOf) : undefined,
    duplicateCount: r.duplicateCount ?? 0,
    distanceKm,
    isMine: Boolean(viewer?.userId && r.ngoUserId === viewer.userId),
  };
}

export function toCitizenReport(r: ReportDoc): CitizenReport {
  return { ...toPublicReport(r), duplicateOf: r.duplicateOf ? String(r.duplicateOf) : undefined };
}

export function toNgoProfile(n: Pick<INgo, keyof INgo>): NgoProfile {
  const [lng, lat] = n.operatingLocation?.coordinates ?? [n.operatingLongitude, n.operatingLatitude];
  return {
    id: String(n._id),
    ngoName: n.ngoName,
    registrationNumber: n.registrationNumber,
    contactPerson: n.contactPerson,
    phone: n.phone,
    email: n.email,
    address: n.address,
    operatingLatitude: lat ?? undefined,
    operatingLongitude: lng ?? undefined,
    operatingRadius: n.operatingRadius ?? 15,
    isAccepting: n.isAccepting !== false,
    status: n.status,
    createdAt: iso(n.createdAt)!,
  };
}

export function toDonation(d: Pick<IDonation, keyof IDonation>): Donation {
  return {
    id: String(d._id),
    amount: d.amount,
    sponsorName: d.sponsorName,
    message: d.message,
    createdAt: iso(d.createdAt)!,
  };
}
