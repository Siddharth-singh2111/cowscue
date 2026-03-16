"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Power, Flame, Upload, X, MapPin, AlertTriangle, CheckCircle2, Route as RouteIcon, Loader2, Star, Navigation, MessageCircle, Activity, ShieldCheck } from "lucide-react";
import { pusherClient } from "@/lib/pusher";

const RescueMap = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => <div className="h-[400px] w-full bg-slate-100 animate-pulse rounded-[2rem]">Loading Map...</div>
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
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveFile, setResolveFile] = useState<File | null>(null);
  const [resolvePreview, setResolvePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [optimizedRoute, setOptimizedRoute] = useState<any>(null);
  const [isRouting, setIsRouting] = useState(false);

  const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  useEffect(() => {
    if (isLoaded) {
      const role = user?.publicMetadata?.role as string | undefined;
      if (!user || role !== "ngo") {
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

  const handleToggleStatus = async () => {
    setIsToggling(true);
    const newState = !isAccepting;
    setIsAccepting(newState); 
    try {
      const res = await fetch("/api/ngo/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAccepting: newState }),
      });
      if (!res.ok) throw new Error("Failed to update");
    } catch (error) {
      setIsAccepting(!newState);
      console.error("Failed to update status");
      alert("Failed to update status. Please try again.");
    } finally {
      setIsToggling(false);
    }
  };

  const submitResolution = async () => {
    if (!resolveFile || !resolvingId) {
      return alert("Photo Required: Please upload proof of the rescue.");
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", resolveFile);
      formData.append("upload_preset", UPLOAD_PRESET!);
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
      const uploadData = await uploadRes.json();
      const resolvedImageUrl = uploadData.secure_url;

      const res = await fetch(`/api/reports/${resolvingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved", resolvedImageUrl }),
      });

      if (res.ok) {
        const data = await res.json();
        setReports((prev) => prev.map((r) => r._id === resolvingId ? data.report : r));
        alert("Rescue Complete! The citizen has been notified.");
        setResolvingId(null);
        setResolveFile(null);
        setResolvePreview(null);
      }
    } catch (e) {
      alert("Error: Failed to upload photo.");
    } finally {
      setIsUploading(false);
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

  const generateGoogleMapsUrl = () => {
    if (!userLocation || selectedReports.size === 0) return "";
    const selectedCows = reports.filter(r => selectedReports.has(r._id));
    let url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}`;
    selectedCows.forEach(cow => { url += `/${cow.location.coordinates[1]},${cow.location.coordinates[0]}`; });
    return url;
  };

  const handleSendRouteToDriver = () => {
    const url = generateGoogleMapsUrl();
    if (!url) return;
    const message = `🚑 *Suraksha Rescue Dispatch*\n\nYou have been assigned ${selectedReports.size} rescue(s). Click the link below to start turn-by-turn navigation:\n\n📍 ${url}`;
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
    <div className="min-h-screen p-4 pt-24 md:p-8 md:pt-32 bg-slate-50 relative overflow-hidden">
      
      {/* Ambient Background Blur */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-400/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-400/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* HEADER GLASS ISLAND */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6 bg-white/60 backdrop-blur-xl p-6 sm:p-8 rounded-[2rem] shadow-xl shadow-slate-200/40 border border-white">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 flex items-center gap-3 tracking-tight">
              <div className="bg-slate-900 p-2 rounded-xl"><Activity className="text-orange-500" size={24}/></div> 
              Suraksha Command
            </h1>
            <p className="text-slate-500 mt-2 font-medium flex items-center gap-2">
              <MapPin size={16} className="text-slate-400"/>
              {userLocation ? `Monitoring ${radius}km radius` : "Global Overview"} • {reports.length} Total Records
            </p>
          </div>

          <div className="w-full lg:w-auto min-w-[320px] flex flex-col gap-5">
            <div className="flex gap-3">
              <Button
                variant={showHeatmap ? "default" : "outline"}
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`flex-1 rounded-full font-bold transition-all ${showHeatmap ? "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-md text-white border-0" : "bg-white text-slate-700 hover:bg-slate-50"}`}
              >
                <Flame className="mr-2 h-4 w-4" /> {showHeatmap ? "Hide Heatmap" : "View Heatmap"}
              </Button>
              <Button 
                variant={isAccepting ? "default" : "destructive"} 
                onClick={handleToggleStatus}
                disabled={isToggling}
                className={`flex-1 rounded-full font-bold transition-all border-0 shadow-md ${isAccepting ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white" : ""}`}
              >
                {isToggling ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Power className="mr-2 h-4 w-4" />} 
                {isAccepting ? "Accepting" : "On Break"}
              </Button>
            </div>
            
            <div className="bg-slate-100/50 p-3 rounded-2xl border border-slate-200/50">
              <div className="flex justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Search Radius: {radius}km</span>
              </div>
              <Slider defaultValue={[15]} max={50} step={1} onValueChange={(val) => setRadius(val)} onValueCommit={(val) => userLocation && fetchNearbyReports(userLocation.lat, userLocation.lng, val[0])} />
            </div>
          </div>
        </div>

        {/* BENTO BOX STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card className="rounded-[2rem] border border-red-100 shadow-xl shadow-red-100/30 bg-gradient-to-br from-white to-red-50/50 relative overflow-hidden group hover:-translate-y-1 transition-transform">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-red-500/10 blur-2xl rounded-full"></div>
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-red-600 uppercase tracking-widest">Critical</p>
                <div className="bg-red-100 p-2 rounded-xl text-red-600"><AlertTriangle size={20}/></div>
              </div>
              <h2 className="text-5xl font-black text-slate-900">{pendingReports.length}</h2>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border border-amber-100 shadow-xl shadow-amber-100/30 bg-gradient-to-br from-white to-amber-50/50 relative overflow-hidden group hover:-translate-y-1 transition-transform">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-amber-500/10 blur-2xl rounded-full"></div>
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-amber-600 uppercase tracking-widest">In Progress</p>
                <div className="bg-amber-100 p-2 rounded-xl text-amber-600"><RouteIcon size={20}/></div>
              </div>
              <h2 className="text-5xl font-black text-slate-900">{assignedReports.length}</h2>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border border-green-100 shadow-xl shadow-green-100/30 bg-gradient-to-br from-white to-green-50/50 relative overflow-hidden group hover:-translate-y-1 transition-transform">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-green-500/10 blur-2xl rounded-full"></div>
            <CardContent className="p-6 sm:p-8">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-green-600 uppercase tracking-widest">Rescued</p>
                <div className="bg-green-100 p-2 rounded-xl text-green-600"><ShieldCheck size={20}/></div>
              </div>
              <h2 className="text-5xl font-black text-slate-900">{resolvedReports.length}</h2>
            </CardContent>
          </Card>
        </div>

        {/* MAP VIEW WITH ROUTING */}
        <div className="mb-12 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-300/50 border-[6px] border-white relative bg-slate-200">
          <RescueMap reports={reports} optimizedRoute={optimizedRoute} showHeatmap={showHeatmap} />
          {optimizedRoute && (
            <div className="absolute top-4 left-4 z-[1000] bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-purple-100">
              <p className="font-extrabold text-purple-700 text-sm flex items-center gap-2">
                <RouteIcon size={18} /> Optimal Route Active
              </p>
              <Button size="sm" variant="ghost" onClick={() => setOptimizedRoute(null)} className="h-8 mt-2 text-xs w-full text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full font-bold">Clear Route</Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 xl:gap-12">
          
          {/* LEFT: ACTION REQUIRED */}
          <div className="xl:col-span-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="text-red-500" /> Action Required
              </h2>

              {selectedReports.size > 0 && (
                <div className="flex flex-wrap gap-2 animate-in slide-in-from-top-4 w-full sm:w-auto bg-white p-1.5 rounded-full shadow-md border border-slate-100">
                  {selectedReports.size >= 2 && (
                    <Button onClick={calculateOptimizedRoute} disabled={isRouting} variant="ghost" className="rounded-full text-purple-700 hover:bg-purple-50 font-bold flex-1 sm:flex-none">
                      {isRouting ? <Loader2 className="animate-spin mr-2" size={16} /> : <RouteIcon className="mr-2" size={16} />}
                      <span className="hidden sm:inline">Optimize</span>
                    </Button>
                  )}
                  <Button onClick={handleOpenGoogleMaps} className="rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold flex-1 sm:flex-none">
                    <Navigation className="mr-2" size={16} /> Nav
                  </Button>
                  <Button onClick={handleSendRouteToDriver} className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-md flex-1 sm:flex-none">
                    <MessageCircle className="mr-2" size={16} /> Dispatch
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-5">
              {pendingReports.concat(assignedReports).length === 0 ? (
                <div className="p-12 text-center bg-white/50 backdrop-blur-sm rounded-[2rem] border-2 border-dashed border-slate-200 text-slate-500 font-medium">All clear! No pending rescues in this area.</div>
              ) : (
                pendingReports.concat(assignedReports).map((report) => (
                  <Card key={report._id} className={`flex flex-col sm:flex-row overflow-hidden transition-all duration-300 rounded-[1.5rem] border-0 hover:-translate-y-1 ${selectedReports.has(report._id) ? 'ring-2 ring-purple-500 shadow-xl bg-purple-50/40' : 'shadow-lg shadow-slate-200/40 bg-white'}`}>
                    <img src={report.imageUrl} alt="Injured Cow" className="w-full sm:w-48 h-48 sm:h-auto object-cover" />
                    
                    <div className="p-5 sm:p-6 flex flex-col justify-between flex-1">
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex gap-2 flex-wrap">
                            <Badge className={`px-3 py-1 text-[10px] font-bold ${report.status === 'pending' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                              {report.status.toUpperCase()}
                            </Badge>
                            {report.severity === 'CRITICAL' && <Badge className="bg-red-500 text-white border-0 px-3 py-1 text-[10px] animate-pulse">🚨 CRITICAL</Badge>}
                            {report.severity === 'MODERATE' && <Badge className="bg-orange-500 text-white border-0 px-3 py-1 text-[10px]">⚠️ MODERATE</Badge>}
                            {report.severity === 'ROUTINE' && <Badge className="bg-blue-500 text-white border-0 px-3 py-1 text-[10px]">ℹ️ ROUTINE</Badge>}
                            {report.injuryType && (
                              <Badge variant="outline" className="border-slate-200 text-slate-600 bg-slate-50 px-3 py-1 text-[10px]">
                                🤖 AI: {report.injuryType}
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs font-semibold text-slate-400 shrink-0 ml-2 bg-slate-50 px-2 py-1 rounded-md">{new Date(report.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-700 text-base font-medium line-clamp-2 mb-4 leading-relaxed">{report.description}</p>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-5">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <div className="bg-slate-200 p-1 rounded-full"><Star size={12} className="text-slate-600"/></div>
                            {report.reporterName || "Citizen"}
                          </span>
                          {report.reporterHistory > 0 ? (
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md flex items-center gap-1">
                              <ShieldCheck size={14} className="text-emerald-600" /> Trusted ({report.reporterHistory})
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2.5 py-1 rounded-md">New User</span>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <span className="text-sm font-mono text-slate-600 bg-white px-2 py-1 rounded border border-slate-200">{report.reporterPhone || "No number"}</span>
                          {report.reporterPhone && (
                            <div className="flex gap-2 w-full sm:w-auto">
                              <a href={`tel:${report.reporterPhone}`} className="flex-1 sm:flex-none">
                                <Button size="sm" variant="outline" className="w-full h-8 px-3 text-xs font-bold border-blue-200 text-blue-700 hover:bg-blue-50 rounded-lg">📞 Call</Button>
                              </a>
                              <a href={`https://wa.me/${report.reporterPhone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex-1 sm:flex-none">
                                <Button size="sm" variant="outline" className="w-full h-8 px-3 text-xs font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50 rounded-lg">💬 Chat</Button>
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Button
                          variant={selectedReports.has(report._id) ? "default" : "outline"}
                          className={`rounded-xl font-bold flex-1 sm:flex-none ${selectedReports.has(report._id) ? "bg-purple-600 hover:bg-purple-700 text-white border-0 shadow-md" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                          onClick={() => toggleSelection(report._id)}
                        >
                          {selectedReports.has(report._id) ? "✓ Route Added" : "+ Add Route"}
                        </Button>

                        {report.status === 'pending' ? (
                          <Button className="flex-1 rounded-xl font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-md" onClick={() => handleStatusChange(report._id, "assigned")}>Accept Case</Button>
                        ) : (
                          <Button className="flex-1 rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-md" onClick={() => setResolvingId(report._id)}>Mark Safe</Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* RIGHT: RECENT HISTORY */}
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-6 flex items-center gap-2">
              <CheckCircle2 className="text-emerald-500" /> Recent History
            </h2>
            <div className="space-y-4 bg-white p-6 rounded-[2rem] shadow-xl shadow-slate-200/40 border border-slate-100">
              {resolvedReports.length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-medium">No rescued cattle yet.</div>
              ) : (
                resolvedReports.slice(0, 5).map((report) => (
                  <div key={report._id} className="flex items-center gap-4 bg-slate-50 p-3 rounded-2xl border border-slate-100 transition-all hover:bg-slate-100">
                    <img src={report.imageUrl} alt="Cow" className="w-16 h-16 rounded-xl object-cover shadow-sm" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-800 line-clamp-1">{report.description}</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{new Date(report.createdAt).toLocaleDateString()}</p>
                    </div>
                    <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-100 font-bold text-[10px] px-2 py-1">RESOLVED</Badge>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* RESOLUTION MODAL */}
      {resolvingId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 rounded-[2rem] border-0 overflow-hidden">
            <CardHeader className="bg-emerald-500 text-white p-6">
              <CardTitle className="text-2xl font-extrabold">Upload Proof</CardTitle>
              <p className="text-sm text-emerald-50 mt-1 font-medium">Show the citizen that the animal is safe.</p>
            </CardHeader>
            <CardContent className="p-6 sm:p-8 space-y-6">
              {!resolvePreview ? (
                <div onClick={() => fileInputRef.current?.click()} className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-[1.5rem] h-48 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 hover:border-emerald-300 transition-colors group">
                  <div className="bg-white p-3 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform"><Upload className="h-6 w-6 text-emerald-500" /></div>
                  <span className="text-sm text-slate-600 font-bold">Tap to upload "After" photo</span>
                </div>
              ) : (
                <div className="relative h-48 w-full rounded-[1.5rem] overflow-hidden border-4 border-slate-100 shadow-inner">
                  <img src={resolvePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button onClick={() => { setResolveFile(null); setResolvePreview(null); }} className="absolute top-3 right-3 bg-slate-900/60 backdrop-blur-md text-white p-2 rounded-full hover:bg-slate-900 transition-colors">
                    <X size={16} />
                  </button>
                </div>
              )}
              <input 
                ref={fileInputRef} type="file" accept="image/*" className="hidden" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) { setResolveFile(file); setResolvePreview(URL.createObjectURL(file)); }
                }} 
              />
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 rounded-full h-12 font-bold text-slate-600 hover:bg-slate-100" onClick={() => { setResolvingId(null); setResolveFile(null); setResolvePreview(null); }}>Cancel</Button>
                <Button className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full h-12 font-bold shadow-lg shadow-emerald-500/20" onClick={submitResolution} disabled={isUploading}>
                  {isUploading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-2" />} 
                  Complete Rescue
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}