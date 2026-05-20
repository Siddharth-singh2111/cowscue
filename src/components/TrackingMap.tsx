"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const cowIcon = L.divIcon({
  className: "bg-red-500 text-white rounded-full p-2 w-10 h-10 flex items-center justify-center shadow-lg border-2 border-white text-lg",
  html: "🐄",
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

const driverIcon = L.divIcon({
  className: "bg-blue-600 text-white rounded-full p-2 w-10 h-10 flex items-center justify-center shadow-lg border-2 border-white text-lg animate-pulse",
  html: "🚑",
  iconSize: [40, 40],
  iconAnchor: [20, 20]
});

function MapController({ cowCoords, driverCoords }: { cowCoords: [number, number], driverCoords: [number, number] | null }) {
  const map = useMap();
  const didFitRef = useRef(false);

  useEffect(() => {
    if (didFitRef.current) return;
    if (driverCoords) {
      // Zoom out to fit both markers
      const bounds = L.latLngBounds([cowCoords, driverCoords]);
      map.fitBounds(bounds, { padding: [50, 50] });
      didFitRef.current = true;
    } else {
      map.setView(cowCoords, 14);
    }
  }, [map, cowCoords, driverCoords]);

  return null;
}

interface TrackingMapProps {
  cowCoords: [number, number];
  driverCoords: [number, number] | null;
}

export default function TrackingMap({ cowCoords, driverCoords }: TrackingMapProps) {
  return (
    <div className="h-[400px] w-full rounded-3xl overflow-hidden shadow-xl border border-slate-200 z-0">
      <MapContainer 
        center={cowCoords} 
        zoom={14} 
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Cow Marker */}
        <Marker position={cowCoords} icon={cowIcon}>
          <Popup>
            <div className="text-center font-bold">Injured Cow Location</div>
          </Popup>
        </Marker>

        {/* Driver Marker */}
        {driverCoords && (
          <Marker position={driverCoords} icon={driverIcon}>
            <Popup>
              <div className="text-center font-bold">Ambulance Location</div>
            </Popup>
          </Marker>
        )}

        <MapController cowCoords={cowCoords} driverCoords={driverCoords} />
      </MapContainer>
    </div>
  );
}
