import type { ReportStatus, Severity } from "@/types";

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function timeAgo(iso: string | Date, now = Date.now()): string {
  const diff = (new Date(iso).getTime() - now) / 1000;
  const abs = Math.abs(diff);
  if (abs < 45) return "just now";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), "day");
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
export const formatINR = (n: number) => inr.format(n || 0);

const compact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });
export const formatCompact = (n: number) => compact.format(n || 0);

export function formatMinutes(min: number | null | undefined): string {
  if (min == null) return "—";
  if (min < 60) return `${Math.round(min)} min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h < 24) return m ? `${h}h ${m}m` : `${h}h`;
  return `${Math.round(h / 24)}d`;
}

/** mm:ss countdown text (negative values mean the SLA has been breached). */
export function formatCountdown(ms: number): string {
  const sign = ms < 0 ? "-" : "";
  const s = Math.floor(Math.abs(ms) / 1000);
  return `${sign}${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export const STATUS_LABEL: Record<ReportStatus, string> = {
  pending: "Awaiting team",
  assigned: "Team assigned",
  en_route: "En route",
  resolved: "Rescued",
  closed: "Closed",
};

export const SEVERITY_LABEL: Record<Severity, string> = {
  CRITICAL: "Critical",
  MODERATE: "Moderate",
  ROUTINE: "Routine",
};

export const SEVERITY_WEIGHT: Record<Severity, number> = { CRITICAL: 3, MODERATE: 2, ROUTINE: 1 };

export function maskPhone(phone?: string) {
  if (!phone) return "";
  const d = phone.replace(/\D/g, "");
  return d.length >= 4 ? `••••• ${d.slice(-5)}` : phone;
}
