"use client";

import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { Report } from "@/types";

const createColoredIcon = (color: string) =>
  L.divIcon({
    className: "",
    html: `<div style="width:28px;height:28px;background:${color};border:3px solid white;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  });

const ICONS = {
  pending: {
    critical: createColoredIcon("#dc2626"),
    moderate: createColoredIcon("#f97316"),
    routine:  createColoredIcon("#3b82f6"),
  },
  assigned: {
    critical: createColoredIcon("#d97706"),
    moderate: createColoredIcon("#d97706"),
    routine:  createColoredIcon("#d97706"),
  },
  resolved: {
    critical: createColoredIcon("#16a34a"),
    moderate: createColoredIcon("#16a34a"),
    routine:  createColoredIcon("#16a34a"),
  },
};

function getIcon(report: Report) {
  return ICONS[report.status]?.[report.severity ?? "routine"] ?? ICONS.pending.routine;
}

interface MapProps {
  reports: Report[];
  optimizedRoute?: unknown;
}

export default function RescueMap({ reports, optimizedRoute }: MapProps) {
  const center: [number, number] =
    reports.length > 0
      ? [reports[0].location.coordinates[1], reports[0].location.coordinates[0]]
      : [20.5937, 78.9629];

  return (
    <div className="h-[450px] w-full rounded-xl overflow-hidden shadow-lg border-2 border-slate-200">
      <MapContainer
        key={optimizedRoute ? "routed" : "default"}  // FIX: stable key
        center={center} zoom={11}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {reports.map((report) => (
          <Marker
            key={report._id}
            position={[report.location.coordinates[1], report.location.coordinates[0]]}
            icon={getIcon(report)}
          >
            <Popup>
              <div className="text-center w-40">
                <img src={report.imageUrl} alt="Cow" className="w-full h-28 object-cover rounded-lg mb-2" />
                <p className="font-bold text-xs text-slate-800 line-clamp-2 mb-1">{report.description}</p>
                <div className="flex gap-1 justify-center flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${
                    report.severity === "critical" ? "bg-red-500" :
                    report.severity === "moderate" ? "bg-orange-500" : "bg-blue-500"
                  }`}>{report.severity ?? "routine"}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    report.status === "resolved" ? "bg-green-100 text-green-700" :
                    report.status === "assigned" ? "bg-yellow-100 text-yellow-700" :
                    "bg-red-100 text-red-700"
                  }`}>{report.status}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">By {report.reporterName}</p>
              </div>
            </Popup>
          </Marker>
        ))}
        {optimizedRoute && (
          <GeoJSON
            key="route"
            data={optimizedRoute as GeoJSON.GeoJsonObject}
            style={{ color: "#8b5cf6", weight: 6, opacity: 0.85 }}
          />
        )}
      </MapContainer>
    </div>
  );
}