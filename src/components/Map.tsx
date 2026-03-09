"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet.heat"; // 🟢 Import the heatmap plugin

const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// 🟢 Custom Component to inject the Heatmap into Leaflet
function HeatmapLayer({ reports }: { reports: any[] }) {
  const map = useMap();

  useEffect(() => {
    if (!reports || reports.length === 0) return;
    
    // Map reports to [lat, lng, intensity]
    const points = reports.map(r => [r.location.coordinates[1], r.location.coordinates[0], 1]);
    
    // Create and add the heatmap layer
    const heatLayer = (L as any).heatLayer(points, {
      radius: 25,
      blur: 15,
      maxZoom: 15,
      gradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1: 'red' }
    }).addTo(map);

    return () => {
      map.removeLayer(heatLayer); // Cleanup on unmount
    };
  }, [map, reports]);

  return null;
}

interface MapProps {
  reports: any[]; 
  optimizedRoute?: any;
  showHeatmap?: boolean; // 🟢 New Prop
}

export default function RescueMap({ reports, optimizedRoute, showHeatmap = false }: MapProps) {
  const center: [number, number] = reports.length > 0 
    ? [reports[0].location.coordinates[1], reports[0].location.coordinates[0]] 
    : [20.5937, 78.9629]; 

  return (
    <div className="h-[400px] w-full rounded-xl overflow-hidden shadow-lg border-2 border-slate-200 z-0">
      <MapContainer 
        key={`${center[0]}-${center[1]}-${optimizedRoute ? 'routed' : 'unrouted'}-${showHeatmap ? 'heat' : 'pins'}`} 
        center={center} 
        zoom={11} 
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* 🟢 Toggle between Heatmap and Markers */}
        {showHeatmap ? (
          <HeatmapLayer reports={reports} />
        ) : (
          reports.map((report) => (
            <Marker 
              key={report._id} 
              position={[report.location.coordinates[1], report.location.coordinates[0]]}
              icon={icon}
            >
              <Popup>
                <div className="text-center">
                  <img src={report.imageUrl} alt="Cow" className="w-24 h-24 object-cover rounded mb-2 mx-auto"/>
                  <p className="font-bold text-sm">{report.description}</p>
                </div>
              </Popup>
            </Marker>
          ))
        )}

        {optimizedRoute && !showHeatmap && (
           <GeoJSON 
             key={JSON.stringify(optimizedRoute)}
             data={optimizedRoute} 
             style={{ color: '#8b5cf6', weight: 6, opacity: 0.8 }}
           />
        )}
      </MapContainer>
    </div>
  );
}