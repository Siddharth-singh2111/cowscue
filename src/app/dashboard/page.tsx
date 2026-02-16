"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge"; // Make sure to install: npx shadcn@latest add badge
import { Slider } from "@/components/ui/slider"; // Make sure to install: npx shadcn@latest add slider
import { MapPin, RefreshCw } from "lucide-react";

// Dynamically import Map
const RescueMap = dynamic(() => import("@/components/Map"), { 
  ssr: false,
  loading: () => <div className="h-[400px] w-full bg-slate-100 animate-pulse rounded-xl">Loading Map...</div>
});

interface Report {
  _id: string;
  imageUrl: string;
  description: string;
  status: string;
  createdAt: string;
  location: {
    coordinates: number[];
  };
}

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState([10]); // Default 10km
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  // 🔴 REPLACE WITH YOUR ACTUAL ADMIN EMAIL LIST CHECK
  const ADMIN_EMAILS = ["secretwars495@gmail.com", "sahilsinghrajpoot45@gmail.com"];

  useEffect(() => {
    if (isLoaded) {
      const email = user?.primaryEmailAddress?.emailAddress;
      if (!user || !email || !ADMIN_EMAILS.includes(email)) {
        router.push("/");
      } else {
        // 1. Get Admin Location first, then fetch reports
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setUserLocation(loc);
            fetchNearbyReports(loc.lat, loc.lng, radius[0]);
          }, 
          (err) => {
            alert("Location access denied. Showing all reports.");
            fetchAllReports(); // Fallback
          }
        );
      }
    }
  }, [isLoaded, user, router]);

  const fetchAllReports = async () => {
    try {
      const res = await fetch("/api/reports");
      const data = await res.json();
      setReports(data.reports || []);
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  const fetchNearbyReports = async (lat: number, lng: number, rad: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/nearby?lat=${lat}&lng=${lng}&radius=${rad}`);
      const data = await res.json();
      setReports(data.reports || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleStatusChange = async (reportId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.status === 409) {
        alert("Too late! Another NGO just accepted this case.");
        return; // Don't update local state
      }

      if (res.ok) {
        setReports((prev) => prev.map((r) => r._id === reportId ? { ...r, status: newStatus } : r));
      }
    } catch (error) {
      console.error("Update failed", error);
    }
  };

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen p-4 md:p-8 bg-slate-50">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            🚑 Rescue Dashboard
          </h1>
          <p className="text-slate-500">
            {userLocation ? `Showing reports within ${radius}km of your location` : "Showing all global reports"}
          </p>
        </div>
        
        {/* Radius Slider Controls */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 w-full md:w-auto min-w-[300px]">
           <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold">Search Radius: {radius}km</span>
              <MapPin className="h-4 w-4 text-orange-500"/>
           </div>
           <Slider 
             defaultValue={[10]} 
             max={50} 
             step={1} 
             onValueChange={(val) => setRadius(val)}
             onValueCommit={(val) => userLocation && fetchNearbyReports(userLocation.lat, userLocation.lng, val[0])}
           />
        </div>
      </div>

      {/* Map View */}
      <div className="mb-8">
        <RescueMap reports={reports} />
      </div>

      {/* Grid View */}
      {reports.length === 0 && !loading ? (
        <div className="text-center py-20 text-slate-400">No injured cattle found in this area.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <Card key={report._id} className="hover:shadow-lg transition-shadow border-slate-200 overflow-hidden">
              <div className="relative h-48 w-full">
                <img
                  src={report.imageUrl}
                  alt="Injured Cow"
                  className="w-full h-full object-cover"
                />
                <Badge className={`absolute top-2 right-2 ${
                  report.status === 'pending' ? 'bg-red-500 hover:bg-red-600' : 
                  report.status === 'assigned' ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-green-500 hover:bg-green-600'
                }`}>
                  {report.status.toUpperCase()}
                </Badge>
              </div>
              
              <CardContent className="pt-4">
                 <p className="text-slate-700 font-medium mb-4 line-clamp-2">{report.description}</p>
                 <div className="text-xs text-slate-400 mb-4 flex items-center gap-1">
                    <MapPin size={12}/> Reported {new Date(report.createdAt).toLocaleDateString()}
                 </div>

                 {report.status === 'pending' && (
                   <Button 
                     className="w-full bg-blue-600 hover:bg-blue-700"
                     onClick={() => handleStatusChange(report._id, "assigned")}
                   >
                     Accept Rescue Mission
                   </Button>
                 )}
                 
                 {report.status === 'assigned' && (
                   <Button 
                     className="w-full bg-green-600 hover:bg-green-700"
                     onClick={() => handleStatusChange(report._id, "resolved")}
                   >
                     Mark as Safe & Resolved
                   </Button>
                 )}
                 
                 {report.status === 'resolved' && (
                   <Button variant="outline" disabled className="w-full">
                     ✅ Rescue Complete
                   </Button>
                 )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}