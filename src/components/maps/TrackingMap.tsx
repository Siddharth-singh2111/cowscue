"use client";

import { useEffect, useRef } from "react";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ambulanceIcon, cowIcon, TILE_ATTRIBUTION, TILE_URL } from "./markers";
import { cn } from "@/lib/utils";

type LatLng = { lat: number; lng: number };

export interface TrackingMapProps {
  cow: LatLng;
  driver?: LatLng | null;
  className?: string;
  /** Keep both markers in view as the driver moves. */
  follow?: boolean;
}

function Fit({ cow, driver, follow }: { cow: LatLng; driver?: LatLng | null; follow?: boolean }) {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (driver) {
      if (!fitted.current || follow) {
        map.fitBounds(L.latLngBounds([cow, driver]), { padding: [60, 60], maxZoom: 16, animate: fitted.current });
        fitted.current = true;
      }
    } else if (!fitted.current) {
      map.setView(cow, 15);
    }
  }, [map, cow, driver, follow]);
  return null;
}

/** Live mission map: the animal, the ambulance, and a straight-line connector between them. */
export default function TrackingMap({ cow, driver, className, follow = true }: TrackingMapProps) {
  return (
    <div className={cn("relative isolate h-[360px] w-full overflow-hidden rounded-2xl", className)}>
      <MapContainer center={cow} zoom={15} className="size-full" scrollWheelZoom={false} zoomControl>
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <Marker position={cow} icon={cowIcon()}>
          <Tooltip direction="top" offset={[0, -18]}>Animal location</Tooltip>
        </Marker>
        {driver && (
          <>
            <Marker position={driver} icon={ambulanceIcon()}>
              <Tooltip direction="top" offset={[0, -18]}>Ambulance</Tooltip>
            </Marker>
            <Polyline positions={[driver, cow]} pathOptions={{ color: "#2563eb", weight: 3, dashArray: "6 8", opacity: 0.8 }} />
          </>
        )}
        <Fit cow={cow} driver={driver} follow={follow} />
      </MapContainer>
    </div>
  );
}
