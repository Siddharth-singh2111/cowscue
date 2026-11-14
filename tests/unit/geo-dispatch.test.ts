import { describe, expect, it } from "vitest";
import { coarsen, estimateEtaMinutes, haversineKm } from "@/server/lib/geo";
import { BROADCAST_RADIUS_KM, formatDispatchAlert, radiusMultiplier, slaDelayMs } from "@/server/services/dispatch";

describe("geo helpers", () => {
  it("computes great-circle distance (Delhi → Mumbai ≈ 1150 km)", () => {
    const km = haversineKm(28.6139, 77.209, 19.076, 72.8777);
    expect(km).toBeGreaterThan(1130);
    expect(km).toBeLessThan(1170);
  });

  it("is zero for identical points and symmetric", () => {
    expect(haversineKm(13.5, 80, 13.5, 80)).toBe(0);
    expect(haversineKm(13.5, 80, 13.6, 80.1)).toBeCloseTo(haversineKm(13.6, 80.1, 13.5, 80), 10);
  });

  it("estimates urban ETA with a detour factor and a 1-minute floor", () => {
    expect(estimateEtaMinutes(10)).toBe(34); // 10 km × 1.4 / 25 km/h
    expect(estimateEtaMinutes(0.01)).toBe(1);
  });

  it("coarsens coordinates to ~1 km for public display", () => {
    expect(coarsen(13.554321)).toBe(13.55);
    expect(coarsen(-79.996)).toBe(-80);
  });
});

describe("escalation policy", () => {
  it("widens the radius per level and broadcasts at the max level", () => {
    expect(radiusMultiplier(0)).toBe(1);
    expect(radiusMultiplier(1)).toBe(1.5);
    expect(radiusMultiplier(2)).toBe(2);
    expect(radiusMultiplier(3)).toBeNull();
    expect(BROADCAST_RADIUS_KM).toBe(100);
  });

  it("escalates critical cases fastest and backs off per level", () => {
    expect(slaDelayMs("CRITICAL", 0)).toBe(5 * 60_000);
    expect(slaDelayMs("ROUTINE", 0)).toBe(30 * 60_000);
    expect(slaDelayMs("CRITICAL", 2)).toBe(10 * 60_000);
  });

  it("formats an actionable WhatsApp alert", () => {
    const msg = formatDispatchAlert({
      severity: "CRITICAL",
      injuryType: "deep leg wound",
      description: "Calf hit by a truck near the bus stand",
      lat: 13.55,
      lng: 79.99,
      distanceKm: 3.2,
      level: 1,
      appUrl: "https://cowscue.app",
    });
    expect(msg).toContain("https://maps.google.com/?q=13.55,79.99");
    expect(msg).toContain("Escalated (level 1)");
    expect(msg).toContain("3.2 km");
    expect(msg).toContain("https://cowscue.app/dashboard");
  });
});
