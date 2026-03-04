"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, Upload, X, CheckCircle2, AlertCircle } from "lucide-react";

type Step = "idle" | "locating" | "uploading" | "verifying" | "saving" | "done" | "error";

const STEP_LABELS: Record<Step, string> = {
  idle: "Location will be captured on submit",
  locating: "📍 Acquiring GPS coordinates...",
  uploading: "☁️ Uploading image...",
  verifying: "🤖 AI verifying image...",
  saving: "💾 Saving rescue request...",
  done: "✅ Report submitted!",
  error: "❌ Something went wrong",
};

export default function ReportPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("idle");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert("Image too large. Please use an image under 10MB.");
        return;
      }
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validatePhone = (value: string) => {
    const phoneRegex = /^\+?[\d\s\-]{10,15}$/;
    if (!value) { setPhoneError("Phone number is required."); return false; }
    if (!phoneRegex.test(value)) { setPhoneError("Enter a valid number, e.g. +91 9876543210"); return false; }
    setPhoneError("");
    return true;
  };

  const isLoading = step !== "idle" && step !== "error" && step !== "done";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) { alert("Please upload a photo."); return; }
    if (!description.trim()) { alert("Please describe the situation."); return; }
    if (!validatePhone(phone)) return;

    try {
      setStep("locating");
      if (!navigator.geolocation) throw new Error("Geolocation not supported.");

      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      );
      const { latitude, longitude } = position.coords;

      setStep("uploading");
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("upload_preset", UPLOAD_PRESET!);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );
      if (!uploadRes.ok) throw new Error("Image upload failed.");
      const { secure_url: imageUrl } = await uploadRes.json();

      setStep("verifying");
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, description, latitude, longitude, reporterPhone: phone }),
      });

      const responseData = await res.json();
      if (!res.ok) {
        if (responseData.error?.includes("AI Verification Failed")) clearImage();
        throw new Error(responseData.error || "Submission failed.");
      }

      setStep("done");
      setTimeout(() => router.push("/my-reports"), 1200);
    } catch (error: unknown) {
      setStep("error");
      const message = error instanceof Error ? error.message : "Something went wrong";
      alert(`⚠️ ${message}`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <Card className="w-full max-w-lg shadow-xl border-0">
        <CardHeader className="bg-orange-600 text-white rounded-t-xl p-6">
          <CardTitle className="text-2xl flex items-center gap-2">🚨 Report Stray Cattle</CardTitle>
          <p className="text-orange-100 text-sm">AI-verified and instantly sent to the nearest NGO.</p>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Photo */}
            <div className="space-y-2">
              <Label className="text-slate-600 font-semibold">1. Photo Evidence <span className="text-red-500">*</span></Label>
              {!previewUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-xl h-48 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 hover:border-orange-400 transition-all"
                >
                  <Upload className="h-8 w-8 text-slate-400 mb-2" />
                  <span className="text-sm text-slate-500 font-medium">Tap to upload photo</span>
                  <span className="text-xs text-slate-400 mt-1">Max 10MB</span>
                </div>
              ) : (
                <div className="relative h-64 w-full rounded-xl overflow-hidden">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={clearImage}
                    className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-black/80">
                    <X size={18} />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                    AI will verify this image
                  </div>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-600 font-semibold">
                2. Your Contact Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone" type="tel" placeholder="+91 9876543210" value={phone}
                onChange={(e) => { setPhone(e.target.value); if (phoneError) validatePhone(e.target.value); }}
                onBlur={() => validatePhone(phone)}
                className={phoneError ? "border-red-400" : ""}
                required
              />
              {phoneError ? (
                <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} />{phoneError}</p>
              ) : (
                <p className="text-xs text-slate-400">The rescue driver will call you for directions.</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="desc" className="text-slate-600 font-semibold">
                3. Situation Details <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="desc"
                placeholder="E.g., Adult cow with leg injury, unable to walk, near main market bus stand..."
                className="resize-none h-24 text-base"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
              />
              <p className="text-xs text-slate-400 text-right">{description.length}/500</p>
            </div>

            {/* Status */}
            <div className={`px-4 py-3 rounded-lg text-sm flex items-center gap-2 transition-all ${
              step === "done" ? "bg-green-50 text-green-700" :
              step === "error" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
            }`}>
              {step === "done" ? <CheckCircle2 size={16} /> : step === "error" ? <AlertCircle size={16} /> : <MapPin size={16} />}
              {STEP_LABELS[step]}
            </div>

            <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-lg py-6" disabled={isLoading}>
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{STEP_LABELS[step]}</> : "Submit Rescue Request 🚑"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}