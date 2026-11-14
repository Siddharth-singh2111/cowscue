import { SLA_MINUTES, type OpsReport, type PublicReport } from "@/types";
import { SEVERITY_WEIGHT } from "@/lib/format";

/** When the current SLA window for a pending case ends (mirrors the server's slaDelayMs). */
export function slaDeadline(r: Pick<PublicReport, "severity" | "escalationLevel" | "createdAt" | "timeline">): number {
  const lastEscalation = [...r.timeline].reverse().find((t) => t.type === "escalated");
  const start = new Date(lastEscalation?.at ?? r.createdAt).getTime();
  return start + SLA_MINUTES[r.severity] * 60_000 * (1 + (r.escalationLevel ?? 0) * 0.5);
}

export function sortQueue(a: OpsReport, b: OpsReport) {
  const sev = SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity];
  return sev !== 0 ? sev : slaDeadline(a) - slaDeadline(b);
}

export const isActive = (r: Pick<PublicReport, "status">) => r.status === "assigned" || r.status === "en_route";
export const isDone = (r: Pick<PublicReport, "status">) => r.status === "resolved" || r.status === "closed";

/** Digits for wa.me links; bare 10-digit Indian numbers get the +91 country code. */
export function waNumber(phone?: string) {
  const d = (phone ?? "").replace(/\D/g, "");
  return d.length === 10 ? `91${d}` : d;
}

export function waLink(phone: string | undefined, text?: string) {
  const n = waNumber(phone);
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export const mapsLink = (lat: number, lng: number) => `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** Rough urban ETA: 1.4 road-detour factor at ~25 km/h. */
export const etaMinutes = (km: number) => Math.max(1, Math.round(((km * 1.4) / 25) * 60));
