"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect } from "react";

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
  reports: any[]; // We'll pass our cow reports here
}

export default function RescueMap({ reports }: MapProps) {
  // Center the map on India (default) or the first report
  const center: [number, number] = reports.length > 0 
    ? [reports[0].location.coordinates[1], reports[0].location.coordinates[0]] 
    : [20.5937, 78.9629]; // India Center

  return (
    <div className="h-[400px] w-full rounded-xl overflow-hidden shadow-lg border-2 border-slate-200 z-0">
      <MapContainer 
        center={center} 
        zoom={5} 
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
                <span className={`text-xs px-2 py-1 rounded ${
                    report.status === 'pending' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                }`}>
                  {report.status}
                </span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}