"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { MapPin, AlertTriangle, Truck, CheckCircle2, Clock, Route as RouteIcon, Loader2 } from "lucide-react";
import { pusherClient } from "@/lib/pusher";

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
  location: { coordinates: number[] };
}

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState([15]); 
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  
  // 🟢 NEW STATE FOR ROUTING
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [optimizedRoute, setOptimizedRoute] = useState<any>(null);
  const [isRouting, setIsRouting] = useState(false);

  const ADMIN_EMAILS = ["secretwars495@gmail.com", "sahilsinghrajpoot45@gmail.com"];

  useEffect(() => {
    if (isLoaded) {
      const email = user?.primaryEmailAddress?.emailAddress;
      if (!user || !email || !ADMIN_EMAILS.includes(email)) {
        router.push("/");
      } else {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setUserLocation(loc);
            fetchNearbyReports(loc.lat, loc.lng, radius[0]);
          },
          (err) => { fetchAllReports(); }
        );
      }
    }
  }, [isLoaded, user, router]);

  useEffect(() => {
    const channel = pusherClient.subscribe("cowscue-alerts");
    channel.bind("new-report", (newReport: Report) => setReports((prev) => [newReport, ...prev]));
    channel.bind("status-update", (updatedReport: Report) => setReports((prev) => prev.map(r => r._id === updatedReport._id ? updatedReport : r)));
    return () => { pusherClient.unsubscribe("cowscue-alerts"); };
  }, []);

  const fetchAllReports = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports");
      const data = await res.json();
      setReports(data.reports || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchNearbyReports = async (lat: number, lng: number, rad: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/nearby?lat=${lat}&lng=${lng}&radius=${rad}`);
      const data = await res.json();
      setReports(data.reports || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleStatusChange = async (reportId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.status === 409) return alert("Too late! Another NGO just accepted this case.");
      if (res.ok) {
        const data = await res.json();
        setReports((prev) => prev.map((r) => r._id === reportId ? data.report : r));
      }
    } catch (error) { console.error("Update failed", error); }
  };

  // 🟢 ROUTING ALGORITHM
  const calculateOptimizedRoute = async () => {
    if (!userLocation) return alert("Waiting for your GPS location...");
    
    setIsRouting(true);
    try {
      // 1. Get the coordinates of all selected cows
      const selectedCows = reports.filter(r => selectedReports.has(r._id));
      
      // 2. Format for OSRM: lon,lat;lon,lat;lon,lat
      // We force the NGO's current location to be the starting point
      const coordinates = [
        [userLocation.lng, userLocation.lat], 
        ...selectedCows.map(cow => [cow.location.coordinates[0], cow.location.coordinates[1]])
      ].map(c => c.join(',')).join(';');

      // 3. Call the public OSRM Trip API
      // source=first means it MUST start at the NGO. destination=any means it finds the most efficient ending point.
      const res = await fetch(`https://router.project-osrm.org/trip/v1/driving/${coordinates}?source=first&destination=any&roundtrip=false&geometries=geojson`);
      const data = await res.json();

      if (data.code === "Ok") {
        setOptimizedRoute(data.trips[0].geometry); // This is the Polyline GeoJSON
        
        // Scroll map into view
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        alert("Routing failed. Some locations might not be reachable by road.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to calculate route.");
    } finally {
      setIsRouting(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedReports);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedReports(newSet);
  };

  if (!isLoaded) return null;

  const pendingReports = reports.filter(r => r.status === 'pending');
  const assignedReports = reports.filter(r => r.status === 'assigned');
  const resolvedReports = reports.filter(r => r.status === 'resolved');

  return (
    <div className="min-h-screen p-4 md:p-8 bg-slate-100">
      
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            🚑 Suraksha Command Center
          </h1>
          <p className="text-slate-500 mt-1">
            {userLocation ? `Monitoring ${radius}km radius` : "Global Overview"} • {reports.length} Total Records
          </p>
        </div>

        <div className="w-full lg:w-auto min-w-[300px]">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-semibold text-slate-700">Search Radius: {radius}km</span>
            <MapPin className="h-4 w-4 text-orange-500" />
          </div>
          <Slider
            defaultValue={[15]}
            max={50}
            step={1}
            onValueChange={(val) => setRadius(val)}
            onValueCommit={(val) => userLocation && fetchNearbyReports(userLocation.lat, userLocation.lng, val[0])}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-red-50 border-red-100"><CardContent className="p-6"><div><p className="text-sm font-medium text-red-600 uppercase">Critical</p><h2 className="text-4xl font-extrabold text-red-700 mt-2">{pendingReports.length}</h2></div></CardContent></Card>
        <Card className="bg-yellow-50 border-yellow-100"><CardContent className="p-6"><div><p className="text-sm font-medium text-yellow-600 uppercase">In Progress</p><h2 className="text-4xl font-extrabold text-yellow-700 mt-2">{assignedReports.length}</h2></div></CardContent></Card>
        <Card className="bg-green-50 border-green-100"><CardContent className="p-6"><div><p className="text-sm font-medium text-green-600 uppercase">Rescued</p><h2 className="text-4xl font-extrabold text-green-700 mt-2">{resolvedReports.length}</h2></div></CardContent></Card>
      </div>

      {/* 4. MAP VIEW WITH ROUTING */}
      <div className="mb-8 rounded-2xl overflow-hidden shadow-sm border border-slate-200 relative">
        <RescueMap reports={reports} optimizedRoute={optimizedRoute} />
        
        {optimizedRoute && (
          <div className="absolute top-4 left-4 z-[1000] bg-white p-3 rounded-lg shadow-xl border border-purple-200">
            <p className="font-bold text-purple-700 text-sm flex items-center gap-2">
              <RouteIcon size={16}/> Optimal Route Generated
            </p>
            <Button size="sm" variant="ghost" onClick={() => setOptimizedRoute(null)} className="h-6 mt-1 text-xs w-full text-slate-500">Clear Route</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          {/* 🟢 BATCH ROUTING CONTROLS */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="text-red-500" /> Action Required
            </h2>
            
            {selectedReports.size >= 2 && (
              <Button 
                onClick={calculateOptimizedRoute} 
                disabled={isRouting}
                className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg animate-in slide-in-from-top-4"
              >
                {isRouting ? <Loader2 className="animate-spin mr-2" size={16}/> : <RouteIcon className="mr-2" size={16}/>}
                Optimize Batch Route
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {pendingReports.concat(assignedReports).length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-dashed text-slate-500">All clear!</div>
            ) : (
              pendingReports.concat(assignedReports).map((report) => (
                <Card key={report._id} className={`flex flex-col sm:flex-row overflow-hidden transition-all ${selectedReports.has(report._id) ? 'ring-2 ring-purple-500 shadow-md bg-purple-50/50' : 'border-slate-200 shadow-sm'}`}>
                  <img src={report.imageUrl} alt="Injured Cow" className="w-full sm:w-40 h-40 object-cover" />
                  <div className="p-4 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <Badge className={`${report.status === 'pending' ? 'bg-red-500' : 'bg-yellow-500'}`}>{report.status.toUpperCase()}</Badge>
                        <span className="text-xs text-slate-400">{new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-700 text-sm line-clamp-2 mb-4">{report.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {/* 🟢 SELECT FOR ROUTING BUTTON */}
                      <Button 
                        size="sm" 
                        variant={selectedReports.has(report._id) ? "default" : "outline"}
                        className={selectedReports.has(report._id) ? "bg-purple-600 hover:bg-purple-700 w-full sm:w-auto" : "bg-white w-full sm:w-auto"}
                        onClick={() => toggleSelection(report._id)}
                      >
                        {selectedReports.has(report._id) ? "✓ Added to Route" : "+ Add to Route"}
                      </Button>
                      
                      {report.status === 'pending' ? (
                        <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={() => handleStatusChange(report._id, "assigned")}>Accept</Button>
                      ) : (
                        <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleStatusChange(report._id, "resolved")}>Mark Safe</Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* RECENT HISTORY */}
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <CheckCircle2 className="text-green-500" /> Recent History
          </h2>
          <div className="space-y-4">
            {resolvedReports.length === 0 ? (
               <div className="p-8 text-center bg-white rounded-xl border border-dashed text-slate-500">No rescued cattle yet.</div>
            ) : (
              resolvedReports.slice(0, 5).map((report) => (
                <div key={report._id} className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm opacity-75">
                  <img src={report.imageUrl} alt="Cow" className="w-16 h-16 rounded-lg object-cover" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700 line-clamp-1">{report.description}</p>
                    <p className="text-xs text-slate-400 mt-1">Resolved: {new Date(report.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">RESOLVED</Badge>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}