/**
 * Client-safe DTOs shared by API routes and React components.
 * Nothing in this file may import server-only modules.
 */

export const REPORT_STATUSES = ["pending", "assigned", "en_route", "resolved", "closed"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const SEVERITIES = ["CRITICAL", "MODERATE", "ROUTINE"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const CLOSE_REASONS = ["duplicate", "false_alarm", "not_found", "other"] as const;
export type CloseReason = (typeof CLOSE_REASONS)[number];

export type TimelineEventType =
  | "reported"
  | "triaged"
  | "duplicate_flagged"
  | "ngos_notified"
  | "escalated"
  | "assigned"
  | "en_route"
  | "resolved"
  | "closed"
  | "fundraiser_started"
  | "fundraiser_paused"
  | "donation";

export interface TimelineEvent {
  type: TimelineEventType;
  at: string;
  message: string;
}

export interface Triage {
  isCattle: boolean;
  severity: Severity;
  injuryType: string;
  confidence: number;
  firstAid: string[];
  source: "ai" | "fallback";
}

export interface Fundraiser {
  active: boolean;
  title?: string;
  description?: string;
  goal: number;
  raised: number;
  donorCount: number;
}

/** What anyone with the tracking link may see. No reporter or driver phone numbers. */
export interface PublicReport {
  id: string;
  status: ReportStatus;
  severity: Severity;
  injuryType: string;
  description: string;
  imageUrl: string;
  resolvedImageUrl?: string;
  location: { lat: number; lng: number };
  ngoName?: string;
  driverName?: string;
  driver?: { lat: number; lng: number; updatedAt?: string };
  firstAid: string[];
  fundraiser: Fundraiser;
  timeline: TimelineEvent[];
  escalationLevel: number;
  createdAt: string;
  assignedAt?: string;
  resolvedAt?: string;
  closeReason?: CloseReason;
}

/** Full operational view for NGO responders and the assigned driver. */
export interface OpsReport extends PublicReport {
  reporterName: string;
  reporterPhone: string;
  reporterHistory: number;
  channel: "web" | "whatsapp";
  ngoUserId?: string;
  driverPhone?: string;
  duplicateOf?: string;
  duplicateCount: number;
  distanceKm?: number;
  isMine: boolean;
}

/** What a citizen sees in "My reports". */
export interface CitizenReport extends PublicReport {
  duplicateOf?: string;
}

export interface Donation {
  id: string;
  amount: number;
  sponsorName: string;
  message?: string;
  createdAt: string;
}

export interface NgoProfile {
  id: string;
  ngoName: string;
  registrationNumber: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  operatingLatitude?: number;
  operatingLongitude?: number;
  operatingRadius: number;
  isAccepting: boolean;
  status: "pending" | "approved" | "rejected" | "suspended";
  createdAt: string;
}

export interface PublicNgo {
  id: string;
  ngoName: string;
  address: string;
  operatingRadius: number;
  location?: { lat: number; lng: number };
  isAccepting: boolean;
  rescues: number;
}

export interface PublicStats {
  totals: { reported: number; rescued: number; active: number; ngos: number; citizens: number; raised: number };
  medianResponseMinutes: number | null;
  medianResolutionMinutes: number | null;
  severityMix: Record<Severity, number>;
  daily: { date: string; reported: number; rescued: number }[];
  hotspots: { lat: number; lng: number; weight: number }[];
  recent: { id: string; status: ReportStatus; severity: Severity; injuryType: string; at: string; area: string }[];
  generatedAt: string;
}

export interface NgoStats {
  accepted: number;
  resolved: number;
  active: number;
  medianResponseMinutes: number | null;
  medianResolutionMinutes: number | null;
  raised: number;
  last30: { date: string; resolved: number }[];
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  rescues: number;
  reports: number;
  karma: number;
  badge: "Guardian" | "Protector" | "Rescuer" | "Helper";
}

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

/** Realtime channel + event names, shared by publisher and subscribers. */
export const Channels = {
  ngoFeed: "private-ngo-feed",
  publicFeed: "cowscue-public",
  report: (id: string) => `report-${id}`,
} as const;

export const Events = {
  reportCreated: "report.created",
  reportUpdated: "report.updated",
  driverMoved: "driver.moved",
  donation: "donation.received",
  statsChanged: "stats.changed",
} as const;

/** SLA targets (minutes until an unaccepted case auto-escalates), by severity. */
export const SLA_MINUTES: Record<Severity, number> = { CRITICAL: 5, MODERATE: 15, ROUTINE: 30 };
export const MAX_ESCALATION_LEVEL = 3;
