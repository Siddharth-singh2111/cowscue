/** Geospatial helpers shared by dispatch, ETA estimation and duplicate detection. */

const EARTH_RADIUS_KM = 6371;

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Rough urban ETA. Uses a road-network detour factor (~1.4 for Indian city grids) and an average
 * ambulance speed of 25 km/h. Good enough for a citizen-facing "about N minutes" hint.
 */
export function estimateEtaMinutes(distanceKm: number, avgSpeedKmh = 25, detourFactor = 1.4): number {
  return Math.max(1, Math.round(((distanceKm * detourFactor) / avgSpeedKmh) * 60));
}

/**
 * Coarsens coordinates for public display (~1.1 km precision at 2 decimals) so the live impact
 * map shows hotspots without exposing a reporter's exact position.
 */
export function coarsen(value: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export const toPoint = (lat: number, lng: number) => ({ type: "Point" as const, coordinates: [lng, lat] });
