"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Power, Flame, Upload, X, MapPin, AlertTriangle, CheckCircle2, Route as RouteIcon, Loader2, Star, Navigation, MessageCircle, Activity, ShieldCheck, Settings } from "lucide-react";
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
  ngoName?: string;
  driverName?: string;
  driverPhone?: string;
  driverLatitude?: number;
  driverLongitude?: number;
  isFundraising?: boolean;
  fundraisingTitle?: string;
  fundraisingDescription?: string;
  fundraisingGoal?: number;
  fundraisingRaised?: number;
}

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState([15]);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [isAccepting, setIsAccepting] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveFile, setResolveFile] = useState<File | null>(null);
  const [resolvePreview, setResolvePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dispatchingId, setDispatchingId] = useState<string | null>(null);
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");

  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [optimizedRoute, setOptimizedRoute] = useState<GeoJSON.Geometry | undefined>(undefined);
  const [isRouting, setIsRouting] = useState(false);

  // NGO Settings Modal State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsNgoName, setSettingsNgoName] = useState("");
  const [settingsPhone, setSettingsPhone] = useState("");
  const [settingsAddress, setSettingsAddress] = useState("");
  const [settingsLat, setSettingsLat] = useState("");
  const [settingsLng, setSettingsLng] = useState("");
  const [settingsRadius, setSettingsRadius] = useState<number>(15);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  // NGO Sponsorship Modal State
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [selectedSponsorReport, setSelectedSponsorReport] = useState<Report | null>(null);
  const [sponsorTitle, setSponsorTitle] = useState("");
  const [sponsorDescription, setSponsorDescription] = useState("");
  const [sponsorGoal, setSponsorGoal] = useState("");
  const [isSponsorActive, setIsSponsorActive] = useState(false);
  const [isSavingSponsor, setIsSavingSponsor] = useState(false);

  const openSponsorshipModal = (report: Report) => {
    setSelectedSponsorReport(report);
    setSponsorTitle(report.fundraisingTitle || `Medical Fund for Injured Animal`);
    setSponsorDescription(report.fundraisingDescription || `This animal requires urgent veterinary medical attention, medicines, and specialized feed. Please sponsor their recovery.`);
    setSponsorGoal(report.fundraisingGoal ? String(report.fundraisingGoal) : "5000");
    setIsSponsorActive(!!report.isFundraising);
    setShowSponsorModal(true);
  };

  const saveSponsorship = async () => {
    if (!selectedSponsorReport) return;
    if (isSponsorActive && (!sponsorTitle.trim() || !sponsorDescription.trim() || !sponsorGoal)) {
      return toast.warning("Please fill in the fundraising title, description, and goal.");
    }
    const goalVal = parseFloat(sponsorGoal);
    if (isSponsorActive && (isNaN(goalVal) || goalVal <= 0)) {
      return toast.warning("Goal must be a positive number.");
    }

    setIsSavingSponsor(true);
    try {
      const res = await fetch(`/api/reports/${selectedSponsorReport._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isFundraising: isSponsorActive,
          fundraisingTitle: sponsorTitle,
          fundraisingDescription: sponsorDescription,
          fundraisingGoal: goalVal || 0,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setReports((prev) => prev.map((r) => r._id === selectedSponsorReport._id ? data.report : r));
        toast.success(isSponsorActive ? "Sponsorship campaign active!" : "Sponsorship campaign paused.");
        setShowSponsorModal(false);
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Failed to update sponsorship.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong saving sponsorship settings.");
    } finally {
      setIsSavingSponsor(false);
    }
  };

  const openSettings = async () => {
    setShowSettingsModal(true);
    try {
      const res = await fetch("/api/ngo/profile");
      const data = await res.json();
      if (data.ngo) {
        setSettingsNgoName(data.ngo.ngoName || "");
        setSettingsPhone(data.ngo.phone || "");
        setSettingsAddress(data.ngo.address || "");
        setSettingsLat(data.ngo.operatingLatitude != null ? String(data.ngo.operatingLatitude) : "");
        setSettingsLng(data.ngo.operatingLongitude != null ? String(data.ngo.operatingLongitude) : "");
        setSettingsRadius(data.ngo.operatingRadius || 15);
      }
    } catch (err) {
      console.error("Failed to fetch NGO settings:", err);
      toast.error("Failed to load settings. Please try again.");
    }
  };

  const detectSettingsLocation = () => {
    if (!navigator.geolocation) {
      return toast.error("Geolocation is not supported by your browser.");
    }
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSettingsLat(String(pos.coords.latitude));
        setSettingsLng(String(pos.coords.longitude));
        setIsDetectingLocation(false);
        toast.success("Location coordinates detected!");
      },
      (err) => {
        console.error("Error detecting location:", err);
        toast.error("Failed to detect location. Please input manually.");
        setIsDetectingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const saveSettings = async () => {
    if (!settingsNgoName.trim() || !settingsPhone.trim() || !settingsAddress.trim()) {
      return toast.warning("Please fill in NGO Name, Phone, and Address.");
    }
    
    const lat = settingsLat ? parseFloat(settingsLat) : undefined;
    const lng = settingsLng ? parseFloat(settingsLng) : undefined;
    if ((settingsLat && isNaN(lat!)) || (settingsLng && isNaN(lng!))) {
      return toast.warning("Latitude and Longitude must be valid numbers.");
    }

    setIsSavingSettings(true);
    try {
      const res = await fetch("/api/ngo/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ngoName: settingsNgoName,
          phone: settingsPhone,
          address: settingsAddress,
          operatingLatitude: lat,
          operatingLongitude: lng,
          operatingRadius: settingsRadius,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success("Workspace settings updated successfully!");
        setShowSettingsModal(false);
        
        if (lat != null && lng != null) {
          setUserLocation({ lat, lng });
          setRadius([settingsRadius]);
          fetchNearbyReports(lat, lng, settingsRadius);
        } else {
          fetchAllReports();
        }
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Failed to save settings.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong while saving.");
    } finally {
      setIsSavingSettings(false);
    }
  };

  const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  useEffect(() => {
    if (isLoaded) {
      const role = user?.publicMetadata?.role as string | undefined;
      if (!user || role !== "ngo") {
        router.push("/");
      } else {
        // Sync accepting status from Clerk metadata
        setIsAccepting(user.publicMetadata?.isAcceptingRescues !== false);

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
      toast.error("Failed to update status. Please try again.");
    } finally {
      setIsToggling(false);
    }
  };

  const submitResolution = async () => {
    if (!resolveFile || !resolvingId) {
      return toast.warning("Photo Required: Please upload proof of the rescue.");
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
        toast.success("Rescue Complete! The citizen has been notified.");
        setResolvingId(null);
        setResolveFile(null);
        setResolvePreview(null);
      }
    } catch (e) {
      toast.error("Failed to upload photo.");
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
      const ngoName = user?.firstName || "Suraksha Rescue Team";
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus,ngoName: newStatus === 'assigned' ? ngoName : undefined,
          driverName: newStatus === 'assigned' ? driverName : undefined,
          driverPhone: newStatus === 'assigned' ? driverPhone : undefined }),
      });
      if (res.status === 409) return toast.warning("Too late! Another NGO just accepted this case.");
      if (res.ok) {
        const data = await res.json();
        setReports((prev) => prev.map((r) => r._id === reportId ? data.report : r));
        setDispatchingId(null);
        setDriverName("");
        setDriverPhone("");
      }
    } catch (error) { console.error("Update failed", error); }
  };

  const calculateOptimizedRoute = async () => {
    if (!userLocation) return toast.info("Waiting for your GPS location...");
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
        toast.error("Routing failed. Some locations might not be reachable by road.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to calculate route.");
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
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={openSettings} 
                className="rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 p-2 h-9 w-9 shrink-0 ml-1 transition-all"
                title="Workspace Settings"
              >
                <Settings size={20} className="hover:rotate-45 transition-transform" />
              </Button>
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
              <Button size="sm" variant="ghost" onClick={() => setOptimizedRoute(undefined)} className="h-8 mt-2 text-xs w-full text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full font-bold">Clear Route</Button>
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

                      {report.status === 'assigned' && (
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 space-y-3">
                          <div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping"></span> Live Tracking Active
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-[11px] font-bold border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg flex-1 py-2 h-auto"
                              onClick={() => {
                                const url = `${window.location.origin}/track/${report._id}`;
                                navigator.clipboard.writeText(url);
                                toast.success("Citizen tracking link copied!");
                              }}
                            >
                              🔗 Citizen Link
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-[11px] font-bold border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg flex-1 py-2 h-auto"
                              onClick={() => {
                                const url = `${window.location.origin}/driver/${report._id}`;
                                navigator.clipboard.writeText(url);
                                toast.success("Driver portal link copied!");
                              }}
                            >
                              🚑 Driver Portal
                            </Button>
                          </div>
                          {report.driverName && (
                            <div className="text-xs font-semibold text-slate-500 flex justify-between">
                              <span>Driver: <strong className="text-slate-700">{report.driverName}</strong></span>
                              {report.driverPhone && <span>Phone: <strong className="font-mono text-slate-700">{report.driverPhone}</strong></span>}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-3">
                        <Button
                          variant={selectedReports.has(report._id) ? "default" : "outline"}
                          className={`rounded-xl font-bold flex-1 sm:flex-none ${selectedReports.has(report._id) ? "bg-purple-600 hover:bg-purple-700 text-white border-0 shadow-md" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                          onClick={() => toggleSelection(report._id)}
                        >
                          {selectedReports.has(report._id) ? "✓ Route Added" : "+ Add Route"}
                        </Button>

                        {report.status === 'pending' ? (
                          <Button className="flex-1 rounded-xl font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-md" onClick={() => setDispatchingId(report._id)}>Accept Case</Button>
                        ) : (
                          <div className="flex gap-2 flex-1 w-full sm:w-auto">
                            <Button 
                              variant="outline"
                              className="rounded-xl font-bold border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center gap-1.5 h-11 px-4 flex-1 sm:flex-none"
                              onClick={() => openSponsorshipModal(report)}
                            >
                              💝 {report.isFundraising ? "Fundraiser Live" : "Raise Funds"}
                            </Button>
                            <Button className="flex-grow rounded-xl font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-md h-11 px-4" onClick={() => setResolvingId(report._id)}>Mark Safe</Button>
                          </div>
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
      {/* 🟢 NEW: DISPATCH DRIVER MODAL */}
      {dispatchingId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 rounded-[2rem] border-0 overflow-hidden">
            <CardHeader className="bg-slate-900 text-white p-6">
              <CardTitle className="text-2xl font-extrabold flex items-center gap-2">
                🚑 Dispatch Rescue
              </CardTitle>
              <p className="text-sm text-slate-400 mt-1 font-medium">Let the citizen know who is coming.</p>
            </CardHeader>
            <CardContent className="p-6 sm:p-8 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Driver Name</label>
                <input 
                  type="text" 
                  className="w-full h-12 rounded-xl bg-slate-50 border border-slate-200 px-4 font-medium focus:ring-2 focus:ring-orange-500 outline-none" 
                  placeholder="e.g. Ramesh Kumar"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Driver Phone (For Live Location)</label>
                <input 
                  type="tel" 
                  className="w-full h-12 rounded-xl bg-slate-50 border border-slate-200 px-4 font-medium focus:ring-2 focus:ring-orange-500 outline-none" 
                  placeholder="e.g. 9876543210"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" className="flex-1 rounded-full h-12 font-bold" onClick={() => setDispatchingId(null)}>Cancel</Button>
                <Button 
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-full h-12 font-bold" 
                  onClick={() => handleStatusChange(dispatchingId, "assigned")}
                  disabled={!driverName || !driverPhone}
                >
                  Send Ambulance
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
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
                  <span className="text-sm text-slate-600 font-bold">Tap to upload &quot;After&quot; photo</span>
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
                  if (file) {
                    // Revoke previous object URL to prevent memory leak
                    if (resolvePreview) URL.revokeObjectURL(resolvePreview);
                    setResolveFile(file);
                    setResolvePreview(URL.createObjectURL(file));
                  }
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
      {/* ⚙️ NEW: NGO WORKSPACE SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-lg shadow-2xl animate-in zoom-in-95 rounded-[2rem] border-0 overflow-hidden my-8">
            <CardHeader className="bg-slate-900 text-white p-6">
              <CardTitle className="text-2xl font-extrabold flex items-center gap-2">
                ⚙️ Workspace Settings
              </CardTitle>
              <p className="text-sm text-slate-400 mt-1 font-medium">Manage your NGO profile, location center, and geofencing radius.</p>
            </CardHeader>
            <CardContent className="p-6 sm:p-8 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">NGO Brand Name</label>
                <input 
                  type="text" 
                  className="w-full h-12 rounded-xl bg-slate-50 border border-slate-200 px-4 font-medium focus:ring-2 focus:ring-orange-500 outline-none" 
                  placeholder="NGO Name"
                  value={settingsNgoName}
                  onChange={(e) => setSettingsNgoName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Public Phone Number</label>
                <input 
                  type="tel" 
                  className="w-full h-12 rounded-xl bg-slate-50 border border-slate-200 px-4 font-medium focus:ring-2 focus:ring-orange-500 outline-none" 
                  placeholder="+91 98765 43210"
                  value={settingsPhone}
                  onChange={(e) => setSettingsPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Office Address</label>
                <input 
                  type="text" 
                  className="w-full h-12 rounded-xl bg-slate-50 border border-slate-200 px-4 font-medium focus:ring-2 focus:ring-orange-500 outline-none" 
                  placeholder="e.g. 123 Rescue Way, New Delhi"
                  value={settingsAddress}
                  onChange={(e) => setSettingsAddress(e.target.value)}
                />
              </div>

              <div className="border-t border-slate-100 my-4 pt-4 space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Geofence Operating Coordinates</label>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    disabled={isDetectingLocation}
                    className="h-8 text-xs font-bold rounded-lg border-orange-200 text-orange-600 hover:bg-orange-50"
                    onClick={detectSettingsLocation}
                  >
                    {isDetectingLocation ? <Loader2 className="animate-spin h-3.5 w-3.5 mr-1" /> : <MapPin className="h-3.5 w-3.5 mr-1" />}
                    Detect GPS
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Latitude</label>
                    <input 
                      type="text" 
                      className="w-full h-10 rounded-lg bg-slate-50 border border-slate-200 px-3 font-mono text-xs focus:ring-2 focus:ring-orange-500 outline-none" 
                      placeholder="e.g. 28.6139"
                      value={settingsLat}
                      onChange={(e) => setSettingsLat(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Longitude</label>
                    <input 
                      type="text" 
                      className="w-full h-10 rounded-lg bg-slate-50 border border-slate-200 px-3 font-mono text-xs focus:ring-2 focus:ring-orange-500 outline-none" 
                      placeholder="e.g. 77.2090"
                      value={settingsLng}
                      onChange={(e) => setSettingsLng(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-widest">
                  <span>Coverage Radius</span>
                  <span className="text-orange-600 font-mono text-sm">{settingsRadius} km</span>
                </div>
                <div className="pt-2">
                  <Slider 
                    value={[settingsRadius]} 
                    min={1} 
                    max={100} 
                    step={1} 
                    onValueChange={(val) => setSettingsRadius(val[0])} 
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-slate-100">
                <Button variant="outline" className="flex-1 rounded-full h-12 font-bold" onClick={() => setShowSettingsModal(false)}>Cancel</Button>
                <Button 
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-full h-12 font-bold shadow-lg shadow-orange-500/25 border-0" 
                  onClick={saveSettings}
                  disabled={isSavingSettings}
                >
                  {isSavingSettings ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* 💝 NEW: NGO SPONSORSHIP SETUP MODAL */}
      {showSponsorModal && selectedSponsorReport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 rounded-[2rem] border-0 overflow-hidden my-8">
            <CardHeader className="bg-slate-900 text-white p-6">
              <CardTitle className="text-2xl font-extrabold flex items-center gap-2">
                💝 Sponsor Rescue Fund
              </CardTitle>
              <p className="text-sm text-slate-400 mt-1 font-medium">Activate public crowdfunding for this animal&apos;s medical expenses.</p>
            </CardHeader>
            <CardContent className="p-6 sm:p-8 space-y-4 max-h-[70vh] overflow-y-auto">
              
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100 mb-2">
                <div className="space-y-0.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Fundraiser Status</label>
                  <p className="text-xs text-slate-400 font-medium">Allow public donations to this rescue.</p>
                </div>
                <input 
                  type="checkbox"
                  className="w-10 h-6 bg-slate-200 checked:bg-rose-500 rounded-full cursor-pointer focus:ring-0 outline-none transition-colors accent-rose-500"
                  checked={isSponsorActive}
                  onChange={(e) => setIsSponsorActive(e.target.checked)}
                />
              </div>

              {isSponsorActive && (
                <div className="space-y-4 animate-in slide-in-from-top-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Fundraiser Title</label>
                    <input 
                      type="text" 
                      className="w-full h-12 rounded-xl bg-slate-50 border border-slate-200 px-4 font-medium focus:ring-2 focus:ring-rose-500 outline-none" 
                      placeholder="e.g. Help Ramesh walk again"
                      value={sponsorTitle}
                      onChange={(e) => setSponsorTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Goal Target Amount (INR/USD)</label>
                    <input 
                      type="number" 
                      className="w-full h-12 rounded-xl bg-slate-50 border border-slate-200 px-4 font-medium focus:ring-2 focus:ring-rose-500 outline-none font-mono" 
                      placeholder="e.g. 5000"
                      value={sponsorGoal}
                      onChange={(e) => setSponsorGoal(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Description & Expenses Context</label>
                    <textarea 
                      rows={3}
                      className="w-full rounded-xl bg-slate-50 border border-slate-200 p-4 font-medium focus:ring-2 focus:ring-rose-500 outline-none text-sm resize-none" 
                      placeholder="Describe what the funds will be used for (vet fees, transport, medicines)..."
                      value={sponsorDescription}
                      onChange={(e) => setSponsorDescription(e.target.value)}
                    />
                  </div>

                  {selectedSponsorReport.fundraisingRaised != null && (
                    <div className="text-xs font-bold text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100 flex justify-between">
                      <span>Total Raised So Far:</span>
                      <span className="text-rose-600 font-mono text-sm">${selectedSponsorReport.fundraisingRaised}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-6 border-t border-slate-100">
                <Button variant="outline" className="flex-1 rounded-full h-12 font-bold" onClick={() => setShowSponsorModal(false)}>Cancel</Button>
                <Button 
                  className="flex-1 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white rounded-full h-12 font-bold shadow-lg shadow-rose-500/25 border-0" 
                  onClick={saveSponsorship}
                  disabled={isSavingSponsor}
                >
                  {isSavingSponsor ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : "Save Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}