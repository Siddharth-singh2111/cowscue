import L from "leaflet";
import type { Severity } from "@/types";

const SEVERITY_HEX: Record<Severity, string> = { CRITICAL: "#e5484d", MODERATE: "#f0a020", ROUTINE: "#3b82f6" };

/** Pulsing severity pin rendered as a lightweight divIcon (no external image requests). */
export function severityIcon(severity: Severity, opts: { selected?: boolean; muted?: boolean } = {}) {
  const color = opts.muted ? "#a8a29e" : SEVERITY_HEX[severity];
  const size = opts.selected ? 22 : 16;
  const pulse = severity === "CRITICAL" && !opts.muted
    ? `<span style="position:absolute;inset:-6px;border-radius:9999px;background:${color};opacity:.35;animation:pulse-ring 1.8s cubic-bezier(.2,.6,.4,1) infinite"></span>`
    : "";
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<span style="position:relative;display:block;width:${size}px;height:${size}px">${pulse}<span style="position:absolute;inset:0;border-radius:9999px;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35)${opts.selected ? `,0 0 0 4px ${color}55` : ""}"></span></span>`,
  });
}

export function emojiIcon(emoji: string, bg: string, size = 40) {
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${bg};display:grid;place-items:center;font-size:${size * 0.48}px;border:3px solid white;box-shadow:0 6px 16px -4px rgba(0,0,0,.4)">${emoji}</div>`,
  });
}

export const cowIcon = () => emojiIcon("🐄", "#e5484d");
export const ambulanceIcon = () => emojiIcon("🚑", "#2563eb");
export const baseIcon = () => emojiIcon("🏠", "#16a34a", 32);

export const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
