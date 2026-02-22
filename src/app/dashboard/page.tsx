"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { MapPin, AlertTriangle, Truck, CheckCircle2, Clock } from "lucide-react";
import { pusherClient } from "@/lib/pusher"; // Real-time client

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
  const [radius, setRadius] = useState([15]); // Default 15km
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);

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
          (err) => {
            alert("Location access denied. Showing all reports.");
            fetchAllReports();
          }
        );
      }
    }
  }, [isLoaded, user, router]);

  // 🔔 REAL-TIME LISTENER
  useEffect(() => {
    const channel = pusherClient.subscribe("cowscue-alerts");

    // Listen for new reports
    channel.bind("new-report", (newReport: Report) => {
      setReports((prev) => [newReport, ...prev]);
    });

    // Listen for status changes (if another admin updates it)
    channel.bind("status-update", (updatedReport: Report) => {
      setReports((prev) => prev.map(r => r._id === updatedReport._id ? updatedReport : r));
    });

    return () => {
      pusherClient.unsubscribe("cowscue-alerts");
    };
  }, []);

  const fetchAllReports = async () => {
    setLoading(true);
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
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setReports((prev) => prev.map((r) => r._id === reportId ? data.report : r));
      }
    } catch (error) {
      console.error("Update failed", error);
    }
  };

  if (!isLoaded) return null;

  // --- DERIVED STATE (METRICS) ---
  const pendingReports = reports.filter(r => r.status === 'pending');
  const assignedReports = reports.filter(r => r.status === 'assigned');
  const resolvedReports = reports.filter(r => r.status === 'resolved');
  
  // Get the most recent successfully resolved rescue
  const lastRecovery = [...resolvedReports].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  return (
    <div className="min-h-screen p-4 md:p-8 bg-slate-100">
      
      {/* 1. HEADER & RADIUS CONTROLS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            Suraksha Command Center
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

      {/* 2. METRICS STRIP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-red-50 border-red-100 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600 uppercase tracking-wider">Critical Emergencies</p>
              <h2 className="text-4xl font-extrabold text-red-700 mt-2">{pendingReports.length}</h2>
            </div>
            <div className="h-12 w-12 bg-red-200 rounded-full flex items-center justify-center text-red-600">
              <AlertTriangle size={24} />
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-yellow-50 border-yellow-100 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600 uppercase tracking-wider">Dispatched / In Progress</p>
              <h2 className="text-4xl font-extrabold text-yellow-700 mt-2">{assignedReports.length}</h2>
            </div>
            <div className="h-12 w-12 bg-yellow-200 rounded-full flex items-center justify-center text-yellow-600">
              <Truck size={24} />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-100 shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600 uppercase tracking-wider">Successfully Rescued</p>
              <h2 className="text-4xl font-extrabold text-green-700 mt-2">{resolvedReports.length}</h2>
            </div>
            <div className="h-12 w-12 bg-green-200 rounded-full flex items-center justify-center text-green-600">
              <CheckCircle2 size={24} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. LAST RECOVERY HIGHLIGHT (Only shows if there is a resolved case) */}
      {lastRecovery && (
        <div className="mb-8 bg-white border border-green-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-4 shadow-sm">
          <div className="bg-green-100 text-green-700 px-4 py-2 rounded-xl font-bold flex items-center gap-2 whitespace-nowrap">
            <CheckCircle2 size={20} /> Last Recovery
          </div>
          <img src={lastRecovery.imageUrl} alt="Recovered" className="h-16 w-16 rounded-lg object-cover border border-slate-200" />
          <div className="flex-1">
            <p className="text-slate-800 font-medium line-clamp-1">{lastRecovery.description}</p>
            <p className="text-slate-500 text-sm flex items-center gap-1 mt-1">
               <Clock size={14}/> Resolved on {new Date(lastRecovery.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      )}

      {/* 4. MAP VIEW */}
      <div className="mb-8 rounded-2xl overflow-hidden shadow-sm border border-slate-200">
        <RescueMap reports={reports} />
      </div>

      {/* 5. TASK TRIAGE (Splitting actionable items from history) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: ACTION REQUIRED */}
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="text-red-500" /> Action Required
          </h2>
          <div className="space-y-4">
            {pendingReports.concat(assignedReports).length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-500">
                All clear! No active emergencies in this radius.
              </div>
            ) : (
              pendingReports.concat(assignedReports).map((report) => (
                <Card key={report._id} className="flex flex-col sm:flex-row overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <img src={report.imageUrl} alt="Injured Cow" className="w-full sm:w-40 h-40 object-cover" />
                  <div className="p-4 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <Badge className={`${report.status === 'pending' ? 'bg-red-500' : 'bg-yellow-500'}`}>
                          {report.status.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-slate-400">{new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-700 text-sm line-clamp-2 mb-4">{report.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 bg-slate-50" onClick={() => window.open(`http://maps.google.com/maps?q=loc:${report.location.coordinates[1]},${report.location.coordinates[0]}`)}>
                        <MapPin size={16} className="mr-1"/> Map
                      </Button>
                      
                      {report.status === 'pending' ? (
                        <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={() => handleStatusChange(report._id, "assigned")}>
                          Accept
                        </Button>
                      ) : (
                        <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700" onClick={() => handleStatusChange(report._id, "resolved")}>
                          Mark Safe
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: RECENT HISTORY */}
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <CheckCircle2 className="text-green-500" /> Recent History
          </h2>
          <div className="space-y-4">
            {resolvedReports.length === 0 ? (
               <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300 text-slate-500">
                 No rescued cattle in this radius yet.
               </div>
            ) : (
              resolvedReports.slice(0, 5).map((report) => ( // Only show last 5
                <div key={report._id} className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm opacity-75 hover:opacity-100 transition-opacity">
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