"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MapPin, Upload, X, Camera, CheckCircle2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function ReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [phone,setPhone]=useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "locating" | "found" | "error">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Revoke previous URL to prevent memory leak
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearImage = () => {
    // Revoke object URL to prevent memory leak
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setImageFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile || !description) {
      toast.warning("Please provide an image and description.");
      return;
    }

    setLoading(true);
    setLocationStatus("locating");

    try {
      if (!navigator.geolocation) throw new Error("Geolocation not supported");

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000
        });
      });

      setLocationStatus("found");
      const { latitude, longitude } = position.coords;

      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("upload_preset", UPLOAD_PRESET!);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );

      if (!uploadRes.ok) throw new Error("Image upload failed");
      const uploadData = await uploadRes.json();
      const imageUrl = uploadData.secure_url;

      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, description, latitude, longitude,reporterPhone: phone }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        toast.error(responseData.error || "Failed to submit report");
        setLocationStatus("error");
        setLoading(false); 
        if (responseData.error?.includes("AI Verification Failed")) {
          clearImage();
        }
        return;
      }

      toast.success("Report submitted successfully!");
      router.push("/my-reports");

    } catch (error: any) {
      console.error(error);
      setLocationStatus("error");
      toast.error(error.message || "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-28 md:pt-36 pb-24 px-4 sm:px-6 relative overflow-hidden bg-slate-50 flex items-start justify-center">
      
      {/* Ambient Background Blurs */}
      <div className="absolute top-20 left-0 w-[400px] h-[400px] bg-orange-400/10 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-amber-400/10 blur-[100px] rounded-full pointer-events-none"></div>

      <Card className="w-full max-w-xl shadow-2xl shadow-slate-200/50 rounded-[2.5rem] border border-white bg-white/90 backdrop-blur-xl relative z-10 overflow-hidden">
        
        {/* Dynamic Top Header */}
        <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-8 sm:p-10 text-center relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/20 blur-2xl rounded-full"></div>
          <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-orange-600/40 blur-2xl rounded-full"></div>
          
          <div className="bg-white/20 p-3 rounded-2xl w-fit mx-auto mb-4 backdrop-blur-sm border border-white/30 shadow-inner">
            <Camera size={32} className="text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-md">Report Emergency</h2>
          <p className="text-orange-50 font-medium mt-2 text-sm max-w-xs mx-auto">
            Our AI will verify the image and dispatch the nearest NGO immediately.
          </p>
        </div>

        <CardContent className="p-6 sm:p-10">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* 1. PHOTO EVIDENCE */}
            <div className="space-y-3">
              <Label className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span> Step 1: Photo Evidence
              </Label>

              {!previewUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 bg-slate-50/50 rounded-[1.5rem] h-56 flex flex-col items-center justify-center cursor-pointer hover:bg-orange-50 hover:border-orange-300 transition-all group shadow-inner"
                >
                  <div className="bg-white p-4 rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform duration-300">
                    <Upload className="h-6 w-6 text-orange-500" />
                  </div>
                  <span className="text-sm text-slate-600 font-bold">Tap to upload a clear photo</span>
                  <span className="text-xs text-slate-400 mt-1">AI will verify cattle presence</span>
                </div>
              ) : (
                <div className="relative h-64 w-full rounded-[1.5rem] overflow-hidden group shadow-inner border-4 border-slate-100">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute top-4 right-4 bg-slate-900/60 backdrop-blur-md text-white p-2 rounded-full hover:bg-slate-900 transition-colors shadow-lg"
                  >
                    <X size={16} />
                  </button>
                  <div className="absolute bottom-4 left-4 bg-emerald-500/90 backdrop-blur-md text-white px-3 py-1 text-xs font-bold rounded-full shadow-lg border border-white/20">
                    Photo Attached ✓
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {/* 2. CONTACT NUMBER */}
            <div className="space-y-3">
              <Label htmlFor="phone" className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-orange-500"></span> Step 2: Contact Number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+91 9876543210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="h-14 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-orange-500 focus-visible:border-orange-500 text-lg px-4 shadow-inner"
              />
              <p className="text-xs text-slate-400 font-medium ml-1">So the rescue driver can call you for exact directions.</p>
            </div>

            {/* 3. SITUATION DETAILS */}
            <div className="space-y-3">
              <Label htmlFor="desc" className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                 <span className="w-2 h-2 rounded-full bg-orange-500"></span> Step 3: Situation Details
              </Label>
              <Textarea
                id="desc"
                placeholder="E.g., Male calf with leg injury near the main market crossing..."
                className="resize-none h-28 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-orange-500 focus-visible:border-orange-500 text-base p-4 shadow-inner"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* GPS LOCATION INDICATOR */}
            <div className={`p-4 rounded-2xl text-sm font-bold flex items-center gap-3 transition-colors duration-500 ${
              locationStatus === 'found' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
              locationStatus === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
              locationStatus === 'locating' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
              'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              {locationStatus === 'found' ? <CheckCircle2 size={20} className="text-emerald-500" /> :
               locationStatus === 'error' ? <AlertTriangle size={20} className="text-red-500" /> :
               locationStatus === 'locating' ? <Loader2 size={20} className="text-amber-500 animate-spin" /> :
               <MapPin size={20} className="text-blue-500" />}
              
              <span className="flex-1">
                {locationStatus === "idle" && "GPS Location will be captured on submit"}
                {locationStatus === "locating" && "Acquiring highly accurate GPS coordinates..."}
                {locationStatus === "found" && "GPS Location Locked & Verified"}
                {locationStatus === "error" && "Could not fetch location. Check browser permissions."}
              </span>
            </div>

            {/* SUBMIT BUTTON */}
            <Button
              type="submit"
              className="w-full h-16 text-lg font-extrabold rounded-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-xl shadow-orange-500/30 border-0 transition-transform hover:-translate-y-1 active:translate-y-0"
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="mr-3 h-6 w-6 animate-spin" /> Transmitting to AI Server...</>
              ) : (
                "Submit Rescue Request"
              )}
            </Button>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}