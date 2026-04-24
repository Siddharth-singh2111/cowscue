"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Building2, FileText, User, Phone, MapPin, ShieldCheck } from "lucide-react";
import { useUser } from "@clerk/nextjs";

export default function NgoApplyPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    ngoName: "",
    registrationNumber: "",
    contactPerson: "",
    phone: "",
    address: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.warning("Please sign in to apply.");

    setLoading(true);
    try {
      const res = await fetch("/api/ngo/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error);
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded) return null;

  if (success) {
    return (
      <div className="min-h-screen pt-36 pb-24 flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center max-w-md bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck size={40} />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Application Received!</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            Thank you for stepping up to help the voiceless. Our team will verify your NGO registration and grant you access to the Command Center shortly.
          </p>
          <Button onClick={() => router.push("/")} className="w-full rounded-full h-14 bg-slate-900 text-white font-bold hover:bg-slate-800">
            Return to Homepage
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-28 md:pt-36 pb-24 px-4 sm:px-6 relative overflow-hidden bg-slate-50 flex items-start justify-center">
      
      {/* Ambient Background Blurs */}
      <div className="absolute top-20 left-0 w-[400px] h-[400px] bg-blue-400/10 blur-[100px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-slate-400/10 blur-[100px] rounded-full pointer-events-none"></div>

      <Card className="w-full max-w-2xl shadow-2xl shadow-slate-200/50 rounded-[2.5rem] border border-white bg-white/90 backdrop-blur-xl relative z-10 overflow-hidden">
        
        {/* Dynamic Top Header */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 sm:p-10 text-center relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 blur-2xl rounded-full"></div>
          
          <div className="bg-white/10 p-3 rounded-2xl w-fit mx-auto mb-4 backdrop-blur-sm border border-white/20 shadow-inner">
            <Building2 size={32} className="text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-md">Partner with Cowscue</h2>
          <p className="text-slate-300 font-medium mt-2 text-sm max-w-sm mx-auto">
            Apply for verified NGO status to access the live Command Center and route optimization.
          </p>
        </div>

        <CardContent className="p-6 sm:p-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="ngoName" className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Building2 size={14} className="text-blue-500" /> NGO Name
                </Label>
                <Input id="ngoName" placeholder="e.g. Save The Cows Foundation" value={formData.ngoName} onChange={handleChange} required className="h-14 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-blue-500" />
              </div>

              <div className="space-y-3">
                <Label htmlFor="registrationNumber" className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <FileText size={14} className="text-blue-500" /> Registration No.
                </Label>
                <Input id="registrationNumber" placeholder="Govt. Registration ID" value={formData.registrationNumber} onChange={handleChange} required className="h-14 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-blue-500" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="contactPerson" className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <User size={14} className="text-blue-500" /> Contact Person
                </Label>
                <Input id="contactPerson" placeholder="Full Name" value={formData.contactPerson} onChange={handleChange} required className="h-14 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-blue-500" />
              </div>

              <div className="space-y-3">
                <Label htmlFor="phone" className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Phone size={14} className="text-blue-500" /> Phone Number
                </Label>
                <Input id="phone" type="tel" placeholder="+91 9876543210" value={formData.phone} onChange={handleChange} required className="h-14 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-blue-500" />
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="address" className="text-xs font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <MapPin size={14} className="text-blue-500" /> Shelter Address
              </Label>
              <Textarea id="address" placeholder="Full operational address of the Gaushala/NGO..." value={formData.address} onChange={handleChange} required className="h-24 rounded-xl bg-slate-50 border-slate-200 focus-visible:ring-blue-500 resize-none p-4" />
            </div>

            <Button
              type="submit"
              className="w-full h-16 text-lg font-extrabold rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/20 border-0 transition-transform hover:-translate-y-1"
              disabled={loading}
            >
              {loading ? <><Loader2 className="mr-3 h-6 w-6 animate-spin" /> Submitting...</> : "Submit Application"}
            </Button>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}