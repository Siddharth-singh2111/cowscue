"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Power,Flame, MapPin, AlertTriangle, CheckCircle2, Route as RouteIcon, Loader2, Star, Navigation, MessageCircle } from "lucide-react";
import { pusherClient } from "@/lib/pusher";

const RescueMap = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => <div className="h-[400px] w-full bg-slate-100 animate-pulse rounded-xl">Loading Map...</div>
});

interface Report {
  _id: string;
  reporterName: string;
  reporterPhone: string;
  reporterHistory: number;
  imageUrl: string;
  description: string;
  status: string;
  severity: string;
  injuryType: string;
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
  const [showHeatmap, setShowHeatmap] = useState(false);
  const initialStatus = user?.publicMetadata?.isAcceptingRescues !== false;
  const [isAccepting, setIsAccepting] = useState(initialStatus);
  const [isToggling, setIsToggling] = useState(false);

  // ROUTING STATE
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [optimizedRoute, setOptimizedRoute] = useState<any>(null);
  const [isRouting, setIsRouting] = useState(false);

 



  useEffect(() => {
    if (isLoaded) {
      // 🟢 Check Clerk Metadata
      const role = user?.publicMetadata?.role as string | undefined;
      
      if (!user || role !== "ngo") {
        router.push("/"); // Kick them out if not an NGO
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
  const handleToggleStatus = async () => {
    setIsToggling(true);
    const newState = !isAccepting;
    setIsAccepting(newState); // Optimistic UI update for instant feedback
    
    try {
      const res = await fetch("/api/ngo/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAccepting: newState }),
      });
      if (!res.ok) throw new Error("Failed to update");
    } catch (error) {
      setIsAccepting(!newState); // Revert if it fails
      console.error("Failed to update status");
      alert("Failed to update status. Please try again.");
    } finally {
      setIsToggling(false);
    }
  };

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

  const calculateOptimizedRoute = async () => {
    if (!userLocation) return alert("Waiting for your GPS location...");
    setIsRouting(true);
    try {
      const selectedCows = reports.filter(r => selectedReports.has(r._id));
      const coordinates = [
        [userLocation.lng, userLocation.lat],
        ...selectedCows.map(cow => [cow.location.coordinates[0], cow.location.coordinates[1]])
      ].map(c => c.join(',')).join(';');

      const res = await fetch(`https://router.project-osrm.org/trip/v1/driving/${coordinates}?source=first&destination=any&roundtrip=false&geometries=geojson`);
      const data = await res.json();

      if (data.code === "Ok") {
        setOptimizedRoute(data.trips[0].geometry);
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

  // 🟢 NEW: Google Maps Multi-Stop Generator
  const generateGoogleMapsUrl = () => {
    if (!userLocation || selectedReports.size === 0) return "";
    const selectedCows = reports.filter(r => selectedReports.has(r._id));

    // Base URL starting at Command Center
    let url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}`;

    // Add each cow's location as a waypoint
    selectedCows.forEach(cow => {
      url += `/${cow.location.coordinates[1]},${cow.location.coordinates[0]}`;
    });
    return url;
  };

  const handleSendRouteToDriver = () => {
    const url = generateGoogleMapsUrl();
    if (!url) return;
    const message = `🚑 *Suraksha Rescue Dispatch*\n\nYou have been assigned ${selectedReports.size} rescue(s). Click the link below to start turn-by-turn navigation:\n\n📍 ${url}`;
    // Opens WhatsApp to select a contact
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleOpenGoogleMaps = () => {
    const url = generateGoogleMapsUrl();
    if (url) window.open(url, "_blank");
  };

  if (!isLoaded) return null;

  const severityWeight: Record<string, number> = { "CRITICAL": 3, "MODERATE": 2, "ROUTINE": 1 };

  const pendingReports = reports
    .filter(r => r.status === 'pending')
    .sort((a, b) => (severityWeight[b.severity] || 0) - (severityWeight[a.severity] || 0));

  const assignedReports = reports.filter(r => r.status === 'assigned');
  const resolvedReports = reports
    .filter(r => r.status === 'resolved')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

        <div className="w-full lg:w-auto min-w-[300px] flex flex-col gap-4">
          <Button
            variant={showHeatmap ? "default" : "outline"}
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={showHeatmap ? "bg-orange-500 hover:bg-orange-600 w-full" : "w-full"}
          >
            <Flame className="mr-2 h-4 w-4" /> {showHeatmap ? "Hide Analytics Heatmap" : "View Analytics Heatmap"}
          </Button>
          <Button 
              variant={isAccepting ? "default" : "destructive"} 
              onClick={handleToggleStatus}
              disabled={isToggling}
              className={`flex-1 ${isAccepting ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
            >
              {isToggling ? <Loader2 className="animate-spin h-4 w-4" /> : <Power className="mr-2 h-4 w-4" />} 
              {isAccepting ? "Accepting" : "On Break"}
            </Button>
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-semibold text-slate-700">Search Radius: {radius}km</span>
              <MapPin className="h-4 w-4 text-orange-500" />
            </div>
            <Slider defaultValue={[15]} max={50} step={1} onValueChange={(val) => setRadius(val)} onValueCommit={(val) => userLocation && fetchNearbyReports(userLocation.lat, userLocation.lng, val[0])} />
          
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-red-50 border-red-100"><CardContent className="p-6"><div><p className="text-sm font-medium text-red-600 uppercase">Critical</p><h2 className="text-4xl font-extrabold text-red-700 mt-2">{pendingReports.length}</h2></div></CardContent></Card>
        <Card className="bg-yellow-50 border-yellow-100"><CardContent className="p-6"><div><p className="text-sm font-medium text-yellow-600 uppercase">In Progress</p><h2 className="text-4xl font-extrabold text-yellow-700 mt-2">{assignedReports.length}</h2></div></CardContent></Card>
        <Card className="bg-green-50 border-green-100"><CardContent className="p-6"><div><p className="text-sm font-medium text-green-600 uppercase">Rescued</p><h2 className="text-4xl font-extrabold text-green-700 mt-2">{resolvedReports.length}</h2></div></CardContent></Card>
      </div>

      {/* MAP VIEW WITH ROUTING */}
      <div className="mb-8 rounded-2xl overflow-hidden shadow-sm border border-slate-200 relative">
        <RescueMap reports={reports} optimizedRoute={optimizedRoute} showHeatmap={showHeatmap} />

        {optimizedRoute && (
          <div className="absolute top-4 left-4 z-[1000] bg-white p-3 rounded-lg shadow-xl border border-purple-200">
            <p className="font-bold text-purple-700 text-sm flex items-center gap-2">
              <RouteIcon size={16} /> Optimal Route Generated
            </p>
            <Button size="sm" variant="ghost" onClick={() => setOptimizedRoute(null)} className="h-6 mt-1 text-xs w-full text-slate-500">Clear Route</Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          {/* BATCH ROUTING CONTROLS */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="text-red-500" /> Action Required
            </h2>

            {/*  Multi-button Dispatcher Controls */}
            {selectedReports.size > 0 && (
              <div className="flex flex-wrap gap-2 animate-in slide-in-from-top-4 w-full sm:w-auto">
                {selectedReports.size >= 2 && (
                  <Button
                    onClick={calculateOptimizedRoute}
                    disabled={isRouting}
                    variant="outline"
                    className="border-purple-200 text-purple-700 hover:bg-purple-50 flex-1 sm:flex-none"
                  >
                    {isRouting ? <Loader2 className="animate-spin mr-2" size={16} /> : <RouteIcon className="mr-2" size={16} />}
                    <span className="hidden sm:inline">Optimize</span>
                  </Button>
                )}

                <Button onClick={handleOpenGoogleMaps} className="bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-none">
                  <Navigation className="mr-2" size={16} />
                  Nav
                </Button>

                <Button onClick={handleSendRouteToDriver} className="bg-[#25D366] hover:bg-[#1DA851] text-white shadow-md flex-1 sm:flex-none">
                  <MessageCircle className="mr-2" size={16} />
                  Dispatch
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {pendingReports.concat(assignedReports).length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-dashed text-slate-500">All clear!</div>
            ) : (
              pendingReports.concat(assignedReports).map((report) => (
                <Card key={report._id} className={`flex flex-col sm:flex-row overflow-hidden transition-all ${selectedReports.has(report._id) ? 'ring-2 ring-purple-500 shadow-md bg-purple-50/50' : 'border-slate-200 shadow-sm'}`}>
                  <img src={report.imageUrl} alt="Injured Cow" className="w-full sm:w-40 h-40 sm:h-auto object-cover" />
                  <div className="p-4 flex flex-col justify-between flex-1">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex gap-2 flex-wrap">
                          <Badge className={`${report.status === 'pending' ? 'bg-red-500' : 'bg-yellow-500'}`}>
                            {report.status.toUpperCase()}
                          </Badge>

                          {report.severity === 'CRITICAL' && <Badge className="bg-red-600 animate-pulse">🚨 CRITICAL</Badge>}
                          {report.severity === 'MODERATE' && <Badge className="bg-orange-500">⚠️ MODERATE</Badge>}
                          {report.severity === 'ROUTINE' && <Badge className="bg-blue-500">ℹ️ ROUTINE</Badge>}

                          {report.injuryType && (
                            <Badge variant="outline" className="border-slate-300 text-slate-600 bg-white">
                              🤖 AI: {report.injuryType}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 shrink-0 ml-2">{new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-slate-700 text-sm line-clamp-2 mb-4">{report.description}</p>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-slate-800">👤 {report.reporterName || "Citizen"}</span>
                        {report.reporterHistory > 0 ? (
                          <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Star size={12} className="fill-green-600 text-green-600" /> Trusted ({report.reporterHistory})
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">New User</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 font-mono">{report.reporterPhone || "No number provided"}</span>
                        {report.reporterPhone && (
                          <div className="flex gap-2">
                            <a href={`tel:${report.reporterPhone}`}>
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-blue-200 text-blue-700 hover:bg-blue-50">
                                📞 Call
                              </Button>
                            </a>
                            <a href={`https://wa.me/${report.reporterPhone.replace(/\D/g, '')}?text=Hi, calling from Cowscue NGO regarding the injured cow you reported. Can you share your live location?`} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-green-200 text-green-700 hover:bg-green-50">
                                💬 WhatsApp
                              </Button>
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
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
