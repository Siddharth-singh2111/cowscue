"use client";

import { useEffect, useState, useRef, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Navigation, Upload, CheckCircle2, ShieldCheck, MapPin, X, Activity, Play, Square } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";

// Dynamically import TrackingMap to prevent Leaflet SSR issues
const TrackingMap = dynamic(() => import("@/components/TrackingMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[300px] w-full bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center font-bold text-slate-400">
      Loading Driver Map...
    </div>
  ),
});

interface ReportData {
  _id: string;
  reporterName: string;
  reporterPhone: string;
  imageUrl: string;
  description: string;
  status: "pending" | "assigned" | "resolved";
  severity: "CRITICAL" | "MODERATE" | "ROUTINE";
  injuryType: string;
  resolvedImageUrl?: string;
  ngoName?: string;
  driverName?: string;
  driverPhone?: string;
  driverLatitude?: number;
  driverLongitude?: number;
  location: { coordinates: number[] };
}

export default function DriverPortalPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Tracking states
  const [isTracking, setIsTracking] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<[number, number] | null>(null);
  const watchIdRef = useRef<number | null>(null);

  // Resolution states
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveFile, setResolveFile] = useState<File | null>(null);
  const [resolvePreview, setResolvePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  // Fetch report details on mount
  useEffect(() => {
    fetch(`/api/reports/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.report) {
          setReport(data.report);
          if (data.report.driverLatitude && data.report.driverLongitude) {
            setCurrentCoords([data.report.driverLatitude, data.report.driverLongitude]);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching report:", err);
        setLoading(false);
      });

    // Cleanup geolocation watcher
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [id]);

  // Send driver coordinates to database
  const sendLocationUpdate = async (lat: number, lng: number) => {
    try {
      await fetch(`/api/reports/${id}/driver-location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });
    } catch (err) {
      console.error("Failed to post driver location:", err);
    }
  };

  // Toggle Geolocation watcher
  const toggleTracking = () => {
    if (isTracking) {
      // Stop tracking
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsTracking(false);
      toast.success("Location tracking disabled.");
    } else {
      // Start tracking
      if (!navigator.geolocation) {
        toast.error("Geolocation is not supported by your device.");
        return;
      }

      setIsTracking(true);
      toast.success("Location tracking enabled! Broadcasting location.");

      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setCurrentCoords([latitude, longitude]);
          sendLocationUpdate(latitude, longitude);
        },
        (err) => {
          console.error("Geolocation error:", err);
          toast.error("Failed to read GPS. Please check location permissions.");
          setIsTracking(false);
          if (watchIdRef.current !== null) {
            navigator.geolocation.clearWatch(watchIdRef.current);
            watchIdRef.current = null;
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    }
  };

  // Cloudinary image upload & rescue completion
  const submitResolution = async () => {
    if (!resolveFile) {
      return toast.warning("Photo Required: Please upload proof of the rescue.");
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", resolveFile);
      formData.append("upload_preset", UPLOAD_PRESET!);
      
      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();
      const resolvedImageUrl = uploadData.secure_url;

      if (!resolvedImageUrl) {
        throw new Error("Cloudinary upload failed");
      }

      // Update report status
      const res = await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved", resolvedImageUrl }),
      });

      if (res.ok) {
        const data = await res.json();
        setReport(data.report);
        toast.success("Rescue mission marked safe! Citizen has been alerted.");
        setShowResolveModal(false);
        setResolveFile(null);
        setResolvePreview(null);
        // Disable tracking since rescue is done
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        setIsTracking(false);
      } else {
        const errData = await res.json();
        toast.error(errData.error || "Failed to complete rescue.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to upload photo. Please check internet connection.");
    } finally {
      setIsUploading(false);
    }
  };

  const getGoogleMapsDirUrl = () => {
    if (!report) return "";
    const cowLat = report.location.coordinates[1];
    const cowLng = report.location.coordinates[0];
    if (currentCoords) {
      return `https://www.google.com/maps/dir/${currentCoords[0]},${currentCoords[1]}/${cowLat},${cowLng}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${cowLat},${cowLng}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="animate-spin text-orange-500 h-10 w-10 mb-4" />
        <p className="font-bold text-slate-600">Loading Dispatch Details...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Rescue Case Not Found</h2>
        <Link href="/"><Button className="rounded-full bg-slate-900 text-white font-bold px-6">Home</Button></Link>
      </div>
    );
  }

  const cowCoords: [number, number] = [report.location.coordinates[1], report.location.coordinates[0]];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 pt-20 pb-24 px-4 sm:px-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-orange-500/10 blur-[100px] rounded-full pointer-events-none"></div>

      <div className="max-w-md mx-auto space-y-6 relative z-10">
        
        {/* Header Block */}
        <div className="bg-slate-800/80 border border-slate-700/50 p-5 rounded-3xl flex justify-between items-center shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-xl text-slate-950 font-bold flex items-center justify-center">
              <Activity size={20} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight">Driver Dispatch</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{report.ngoName || "Rescue Team"}</p>
            </div>
          </div>
          <Badge className={`uppercase font-bold ${
            report.status === "resolved" 
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
          }`}>
            {report.status}
          </Badge>
        </div>

        {/* Action center (Tracking & Navigation) */}
        {report.status !== "resolved" && (
          <Card className="bg-slate-800 border border-slate-700/50 rounded-3xl overflow-hidden shadow-2xl text-slate-100">
            <CardHeader className="bg-slate-900 border-b border-slate-700/50 p-5">
              <CardTitle className="text-sm font-black flex items-center justify-between">
                <span>RESPONDER ACTION CENTER</span>
                {isTracking ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-400 font-extrabold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Live Broadcast Active
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 font-bold">Broadcasting Stopped</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Geolocation Button */}
              <Button 
                onClick={toggleTracking}
                className={`w-full rounded-2xl h-14 font-extrabold text-sm shadow-lg transition-all ${
                  isTracking 
                    ? "bg-red-600 hover:bg-red-700 text-white shadow-red-600/10" 
                    : "bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-emerald-500/10"
                }`}
              >
                {isTracking ? (
                  <>
                    <Square size={16} className="mr-2 fill-white" /> Stop Live Location Sharing
                  </>
                ) : (
                  <>
                    <Play size={16} className="mr-2 fill-slate-950" /> Start Live Location Sharing
                  </>
                )}
              </Button>

              {/* Navigation button */}
              <a href={getGoogleMapsDirUrl()} target="_blank" rel="noopener noreferrer" className="block w-full">
                <Button className="w-full rounded-2xl h-14 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm shadow-lg shadow-blue-600/10">
                  <Navigation size={16} className="mr-2 fill-white" /> Open Route in Google Maps
                </Button>
              </a>
            </CardContent>
          </Card>
        )}

        {/* Tracking Map preview */}
        <div className="bg-slate-800 border border-slate-700/50 p-4 rounded-3xl shadow-2xl">
          <h3 className="font-extrabold text-sm text-slate-300 mb-3 flex items-center gap-2 px-1">
            <MapPin size={16} className="text-orange-500" />
            Live Navigation Map
          </h3>
          <TrackingMap cowCoords={cowCoords} driverCoords={currentCoords} />
        </div>

        {/* Animal Details */}
        <Card className="bg-slate-800 border border-slate-700/50 rounded-3xl overflow-hidden shadow-2xl text-slate-100">
          <CardHeader className="bg-slate-900 border-b border-slate-700/50 p-5">
            <CardTitle className="text-sm font-black flex items-center gap-2">
              🚑 EMERGENCY INFO
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="flex gap-4">
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden shrink-0 bg-slate-900 border border-slate-700">
                <Image src={report.imageUrl} alt="Emergency cattle" fill className="object-cover" />
              </div>
              <div className="space-y-2">
                <div className="flex gap-1.5">
                  <Badge className="bg-red-500 text-slate-950 font-bold border-0 text-[9px]">{report.severity}</Badge>
                  <Badge variant="outline" className="border-slate-700 text-slate-400 bg-slate-900 text-[9px] font-bold">AI: {report.injuryType}</Badge>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-medium line-clamp-3">
                  {report.description}
                </p>
              </div>
            </div>

            <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-700/30">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reporter Contact</div>
              <div className="font-bold text-slate-200 mt-1">{report.reporterName}</div>
              <div className="font-mono text-sm text-blue-400 mt-1">{report.reporterPhone}</div>
            </div>
          </CardContent>
        </Card>

        {/* Case Actions */}
        {report.status !== "resolved" ? (
          <Button 
            onClick={() => setShowResolveModal(true)}
            className="w-full rounded-2xl h-14 bg-gradient-to-r from-emerald-400 to-green-500 hover:from-emerald-500 hover:to-green-600 text-slate-950 font-black tracking-wide text-sm shadow-xl shadow-emerald-500/10 transition-all transform hover:-translate-y-0.5"
          >
            <CheckCircle2 size={18} className="mr-2" /> Complete Rescue & Mark Safe
          </Button>
        ) : (
          <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-3xl p-6 text-center text-emerald-400 shadow-xl">
            <ShieldCheck size={36} className="mx-auto mb-2 text-emerald-400" />
            <h4 className="font-extrabold text-base">Rescue Mission Completed</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
              This report has been resolved. The location tracking is closed, and updates are locked.
            </p>
          </div>
        )}

      </div>

      {/* RESOLUTION MODAL */}
      {showResolveModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <Card className="w-full max-w-sm shadow-2xl animate-in zoom-in-95 rounded-3xl border-0 overflow-hidden bg-slate-800 text-slate-100">
            <CardHeader className="bg-emerald-500 text-slate-950 p-5">
              <CardTitle className="text-lg font-black">Upload Proof</CardTitle>
              <p className="text-[11px] text-emerald-900 mt-0.5 font-bold uppercase tracking-wider">Show the citizen the animal is safe.</p>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {!resolvePreview ? (
                <div 
                  onClick={() => fileInputRef.current?.click()} 
                  className="bg-slate-900 border-2 border-dashed border-slate-700 rounded-2xl h-44 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-900/50 hover:border-emerald-500 transition-colors group"
                >
                  <div className="bg-slate-800 p-3 rounded-full shadow-md mb-2 group-hover:scale-110 transition-transform">
                    <Upload className="h-5 w-5 text-emerald-400" />
                  </div>
                  <span className="text-xs text-slate-400 font-bold">Tap to upload &quot;After&quot; photo</span>
                </div>
              ) : (
                <div className="relative h-44 w-full rounded-2xl overflow-hidden border border-slate-700 shadow-inner">
                  <img src={resolvePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button 
                    onClick={() => { setResolveFile(null); setResolvePreview(null); }} 
                    className="absolute top-2.5 right-2.5 bg-slate-900/80 backdrop-blur-md text-white p-1.5 rounded-full hover:bg-slate-900 transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <input 
                ref={fileInputRef} type="file" accept="image/*" className="hidden" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (resolvePreview) URL.revokeObjectURL(resolvePreview);
                    setResolveFile(file);
                    setResolvePreview(URL.createObjectURL(file));
                  }
                }} 
              />
              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  className="flex-1 rounded-full h-11 font-bold bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-300" 
                  onClick={() => { setShowResolveModal(false); setResolveFile(null); setResolvePreview(null); }}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-full h-11 font-black shadow-lg shadow-emerald-500/10" 
                  onClick={submitResolution} 
                  disabled={isUploading}
                >
                  {isUploading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />} 
                  Resolve Case
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
