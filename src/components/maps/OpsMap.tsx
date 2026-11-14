"use client";

import { useEffect, useMemo, useState } from "react";
import { Circle, GeoJSON, MapContainer, Marker, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import type { OpsReport, Severity } from "@/types";
import { ambulanceIcon, baseIcon, severityIcon, TILE_ATTRIBUTION, TILE_URL } from "./markers";
import { cn } from "@/lib/utils";

type LatLng = { lat: number; lng: number };

export interface OpsMapProps {
  reports: OpsReport[];
  selectedId?: string;
  onSelect?: (id: string) => void;
  center?: LatLng | null;
  radiusKm?: number;
  base?: LatLng | null;
  route?: GeoJSON.Geometry;
  showHeatmap?: boolean;
  className?: string;
}

const INDIA: LatLng = { lat: 22.5, lng: 79 };
const HEAT_WEIGHT: Record<Severity, number> = { CRITICAL: 1, MODERATE: 0.65, ROUTINE: 0.4 };

/** Re-centres when the monitored area changes (by value, not identity). */
function Recenter({ center }: { center?: LatLng | null }) {
  const map = useMap();
  const lat = center?.lat;
  const lng = center?.lng;
  useEffect(() => {
    if (lat == null || lng == null) return;
    map.setView([lat, lng], Math.max(map.getZoom(), 11), { animate: true });
  }, [map, lat, lng]);
  return null;
}

function FlyToSelected({ target }: { target?: LatLng }) {
  const map = useMap();
  const lat = target?.lat;
  const lng = target?.lng;
  useEffect(() => {
    if (lat == null || lng == null) return;
    map.flyTo([lat, lng], Math.max(map.getZoom(), 14), { duration: 0.8 });
  }, [map, lat, lng]);
  return null;
}

function FitRoute({ route }: { route?: GeoJSON.Geometry }) {
  const map = useMap();
  useEffect(() => {
    if (!route) return;
    const bounds = L.geoJSON(route).getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [48, 48] });
  }, [map, route]);
  return null;
}

function Heat({ reports }: { reports: OpsReport[] }) {
  const map = useMap();
  useEffect(() => {
    if (!reports.length) return;
    const layer = (L as unknown as { heatLayer: (p: number[][], o: object) => L.Layer }).heatLayer(
      reports.map((r) => [r.location.lat, r.location.lng, HEAT_WEIGHT[r.severity]]),
      { radius: 30, blur: 22, maxZoom: 14, gradient: { 0.3: "#fde68a", 0.6: "#fb923c", 1: "#dc2626" } }
    );
    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, reports]);
  return null;
}

/**
 * Command-center map. Mounted once — every prop change is applied to the live Leaflet instance
 * via child controllers instead of remounting the MapContainer.
 */
export default function OpsMap({
  reports,
  selectedId,
  onSelect,
  center,
  radiusKm,
  base,
  route,
  showHeatmap = false,
  className,
}: OpsMapProps) {
  // Initial view only — later changes are applied imperatively by <Recenter/> without remounting.
  const [initial] = useState<{ center: LatLng; zoom: number }>(() => ({
    center: center ?? reports[0]?.location ?? INDIA,
    zoom: center || reports.length ? 12 : 5,
  }));
  const selected = useMemo(() => reports.find((r) => r.id === selectedId), [reports, selectedId]);
  const routeKey = useMemo(() => (route ? JSON.stringify(route).length + ":" + JSON.stringify(route).slice(0, 64) : ""), [route]);

  const visible = showHeatmap ? reports.filter((r) => r.status !== "resolved" && r.status !== "closed") : reports;

  return (
    <div className={cn("relative isolate size-full min-h-[320px] overflow-hidden", className)}>
      <MapContainer center={initial.center} zoom={initial.zoom} className="size-full" scrollWheelZoom zoomControl>
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />

        {center && radiusKm ? (
          <Circle
            center={center}
            radius={radiusKm * 1000}
            pathOptions={{ color: "#e8742c", weight: 1.5, fillOpacity: 0.04, dashArray: "6 8" }}
          />
        ) : null}
        {base && (
          <Marker position={base} icon={baseIcon()}>
            <Tooltip direction="top" offset={[0, -14]}>Your base</Tooltip>
          </Marker>
        )}

        {showHeatmap && <Heat reports={reports} />}

        {visible.map((r) => {
          const done = r.status === "resolved" || r.status === "closed";
          return (
            <Marker
              key={r.id}
              position={r.location}
              icon={severityIcon(r.severity, { selected: r.id === selectedId, muted: done })}
              zIndexOffset={r.id === selectedId ? 1000 : done ? -100 : r.severity === "CRITICAL" ? 500 : 0}
              eventHandlers={{ click: () => onSelect?.(r.id) }}
            >
              <Tooltip direction="top" offset={[0, -10]}>
                <span className="font-medium">{r.injuryType}</span>
              </Tooltip>
            </Marker>
          );
        })}

        {reports
          .filter((r) => r.driver && (r.status === "assigned" || r.status === "en_route"))
          .map((r) => (
            <Marker key={`drv-${r.id}`} position={r.driver!} icon={ambulanceIcon()} eventHandlers={{ click: () => onSelect?.(r.id) }}>
              <Tooltip direction="top" offset={[0, -18]}>
                {r.driverName ?? "Ambulance"} → {r.injuryType}
              </Tooltip>
            </Marker>
          ))}

        {route && (
          <GeoJSON key={routeKey} data={route} style={{ color: "#7c3aed", weight: 5, opacity: 0.85 }} />
        )}

        <Recenter center={center} />
        <FlyToSelected target={selected?.location} />
        <FitRoute route={route} />
      </MapContainer>
    </div>
  );
}
