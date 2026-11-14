"use client";

import { useEffect } from "react";
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import type { PublicNgo } from "@/types";
import { TILE_ATTRIBUTION, TILE_URL } from "./markers";
import { cn } from "@/lib/utils";

type Hotspot = { lat: number; lng: number; weight: number };

function Heat({ points }: { points: Hotspot[] }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const max = Math.max(...points.map((p) => p.weight), 1);
    const layer = (L as unknown as { heatLayer: (p: number[][], o: object) => L.Layer }).heatLayer(
      points.map((p) => [p.lat, p.lng, p.weight / max]),
      { radius: 28, blur: 22, maxZoom: 13, gradient: { 0.3: "#fde68a", 0.6: "#fb923c", 1: "#dc2626" } }
    );
    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, points]);
  return null;
}

function FitAll({ points }: { points: { lat: number; lng: number }[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length) map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 12 });
  }, [map, points]);
  return null;
}

/**
 * Anonymised public map: rescue-demand heat (coordinates are coarsened server-side to ~1 km)
 * plus partner NGO coverage circles.
 */
export default function HotspotMap({ hotspots, ngos = [], className }: { hotspots: Hotspot[]; ngos?: PublicNgo[]; className?: string }) {
  const covered = ngos.filter((n) => n.location);
  const all = [...hotspots, ...covered.map((n) => n.location!)];
  return (
    <div className={cn("relative isolate h-[420px] w-full overflow-hidden rounded-2xl", className)}>
      <MapContainer center={[22.5, 79]} zoom={5} className="size-full" scrollWheelZoom={false}>
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        {covered.map((n) => (
          <Circle
            key={n.id}
            center={n.location!}
            radius={n.operatingRadius * 1000}
            pathOptions={{ color: "#16a34a", weight: 1, fillOpacity: 0.06, dashArray: "4 6" }}
          />
        ))}
        {covered.map((n) => (
          <CircleMarker key={`${n.id}-c`} center={n.location!} radius={5} pathOptions={{ color: "#fff", weight: 2, fillColor: "#16a34a", fillOpacity: 1 }}>
            <Tooltip>{n.ngoName}</Tooltip>
          </CircleMarker>
        ))}
        <Heat points={hotspots} />
        <FitAll points={all} />
      </MapContainer>
    </div>
  );
}
