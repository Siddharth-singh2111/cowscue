"use client";

import { MapContainer, TileLayer, Marker, Popup, GeoJSON } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for missing marker icons in React Leaflet
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

interface MapProps {
  reports: any[]; 
  optimizedRoute?: any; // 🟢 Added to accept routing data
}

export default function RescueMap({ reports, optimizedRoute }: MapProps) {
  const center: [number, number] = reports.length > 0 
    ? [reports[0].location.coordinates[1], reports[0].location.coordinates[0]] 
    : [20.5937, 78.9629]; 

  return (
    <div className="h-[400px] w-full rounded-xl overflow-hidden shadow-lg border-2 border-slate-200 z-0">
      <MapContainer 
        // 🟢 The key forces the map to refresh cleanly when a route is added
        key={`${center[0]}-${center[1]}-${optimizedRoute ? 'routed' : 'unrouted'}`} 
        center={center} 
        zoom={11} 
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {reports.map((report) => (
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
        ))}

        {/* 🟢 Draw the Route if it exists */}
        {optimizedRoute && (
           <GeoJSON 
             key={JSON.stringify(optimizedRoute)}
             data={optimizedRoute} 
             style={{ color: '#8b5cf6', weight: 6, opacity: 0.8 }} // Purple route line
           />
        )}
      </MapContainer>
    </div>
  );
}