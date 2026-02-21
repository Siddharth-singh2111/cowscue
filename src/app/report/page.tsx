"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MapPin, Upload, X } from "lucide-react";

export default function ReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "locating" | "found" | "error">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Environment variables
  const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile || !description) {
      alert("Please provide an image and description.");
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

      // 2. Upload to Cloudinary
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

      // 3. Submit Report
      // 3. Submit Report
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, description, latitude, longitude }),
      });

      const responseData = await res.json();

      if (!res.ok) {
        alert(`⚠️ ${responseData.error || "Failed to submit report"}`);
        setLocationStatus("error");
        setLoading(false); 
        if (responseData.error?.includes("AI Verification Failed")) {
          clearImage();
        }
        return;
      }

      alert("Report submitted successfully!");
      router.push("/my-reports");

    } catch (error: any) {
      console.error(error);
      setLocationStatus("error");
      alert(`⚠️ ${error.message || "Something went wrong"}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <Card className="w-full max-w-lg shadow-xl border-0">
        <CardHeader className="bg-orange-600 text-white rounded-t-xl p-6">
          <CardTitle className="text-2xl flex items-center gap-2">
            🚨 Report Stray Cattle
          </CardTitle>
          <p className="text-orange-100 text-sm">Help us locate and rescue.</p>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-slate-600 font-semibold">1. Photo Evidence</Label>

              {!previewUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <Upload className="h-8 w-8 text-slate-400 mb-2" />
                  <span className="text-sm text-slate-500">Tap to upload photo</span>
                </div>
              ) : (
                <div className="relative h-64 w-full rounded-xl overflow-hidden group">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"
                  >
                    <X size={20} />
                  </button>
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

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="desc" className="text-slate-600 font-semibold">2. Situation Details</Label>
              <Textarea
                id="desc"
                placeholder="E.g., Male calf with leg injury near the main market..."
                className="resize-none h-24 text-base"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Location Indicator (Visual only) */}
            <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
              <MapPin size={16} />
              {locationStatus === "idle" && "Location will be captured on submit"}
              {locationStatus === "locating" && "Acquiring GPS coordinates..."}
              {locationStatus === "found" && "GPS Location Locked ✅"}
              {locationStatus === "error" && "Could not fetch location ❌"}
            </div>

            <Button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-700 text-lg py-6"
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
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