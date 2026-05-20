"use client";

import { useEffect, useState, use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { pusherClient } from "@/lib/pusher";
import { ShieldCheck, Phone, Navigation, Heart, Clock, CheckCircle2, User, Loader2, Coins, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";

// Dynamically import TrackingMap to prevent Leaflet SSR issues
const TrackingMap = dynamic(() => import("@/components/TrackingMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] w-full bg-slate-100 animate-pulse rounded-3xl flex items-center justify-center font-bold text-slate-400">
      Loading Live Tracking Map...
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
  isFundraising?: boolean;
  fundraisingTitle?: string;
  fundraisingDescription?: string;
  fundraisingGoal?: number;
  fundraisingRaised?: number;
  location: { coordinates: number[] };
  createdAt: string;
}

export default function CitizenTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [driverCoords, setDriverCoords] = useState<[number, number] | null>(null);

  // Donation state variables
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [donationAmount, setDonationAmount] = useState("25");
  const [donationSponsorName, setDonationSponsorName] = useState("");
  const [isSubmittingDonation, setIsSubmittingDonation] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [recentDonation, setRecentDonation] = useState<{ amount: number; sponsorName: string } | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Fetch report details initially
  useEffect(() => {
    fetch(`/api/reports/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.report) {
          setReport(data.report);
          if (data.report.driverLatitude && data.report.driverLongitude) {
            setDriverCoords([data.report.driverLatitude, data.report.driverLongitude]);
          }
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching report:", err);
        setLoading(false);
      });
  }, [id]);

  // Subscribe to real-time Pusher updates for status change, driver movement, and donations
  useEffect(() => {
    const channelName = `report-${id}`;
    const channel = pusherClient.subscribe(channelName);

    // Bind driver movement event
    channel.bind("driver-moved", (data: { latitude: number; longitude: number }) => {
      setDriverCoords([data.latitude, data.longitude]);
      setReport((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          driverLatitude: data.latitude,
          driverLongitude: data.longitude,
        };
      });
    });

    // Bind donation event
    channel.bind("donation-received", (data: { amount: number; sponsorName: string; report: ReportData }) => {
      setReport(data.report);
      setRecentDonation({ amount: data.amount, sponsorName: data.sponsorName });
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
      setTimeout(() => setRecentDonation(null), 7000);
    });

    // Also listen to status updates from NGO dashboard
    const alertsChannel = pusherClient.subscribe("cowscue-alerts");
    alertsChannel.bind("status-update", (updatedReport: ReportData) => {
      if (updatedReport._id === id) {
        setReport(updatedReport);
        if (updatedReport.driverLatitude && updatedReport.driverLongitude) {
          setDriverCoords([updatedReport.driverLatitude, updatedReport.driverLongitude]);
        }
      }
    });

    return () => {
      pusherClient.unsubscribe(channelName);
      pusherClient.unsubscribe("cowscue-alerts");
    };
  }, [id]);

  const submitDonation = async () => {
    const amountVal = parseFloat(donationAmount);
    if (isNaN(amountVal) || amountVal <= 0) return;

    setIsSubmittingDonation(true);
    try {
      const res = await fetch(`/api/reports/${id}/donate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountVal,
          sponsorName: donationSponsorName,
        }),
      });

      if (res.ok) {
        setSubmitSuccess(true);
        setTimeout(() => {
          setSubmitSuccess(false);
          setShowDonateModal(false);
          setDonationSponsorName("");
        }, 1500);
      }
    } catch (err) {
      console.error("Donation submission failed:", err);
    } finally {
      setIsSubmittingDonation(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="animate-spin text-orange-500 h-10 w-10 mb-4" />
        <p className="font-bold text-slate-600">Loading Live Rescue Details...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md text-center border border-slate-100">
          <p className="text-5xl mb-4">🔍</p>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Report Not Found</h2>
          <p className="text-slate-500 mb-6">
            The rescue mission you are tracking does not exist or may have been archived.
          </p>
          <Link href="/">
            <Button className="rounded-full bg-slate-900 text-white hover:bg-slate-800 px-6 font-bold">
              Go to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const cowCoords: [number, number] = [report.location.coordinates[1], report.location.coordinates[0]];

  // Stepper helper
  const getStepStatus = (step: number) => {
    if (report.status === "resolved") return "completed";
    if (report.status === "assigned") {
      if (step <= 2) return "completed";
      if (step === 3 && driverCoords) return "active"; // driver is driving
      return "upcoming";
    }
    // pending
    if (step === 1) return "completed";
    return "upcoming";
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24 md:pt-32 pb-20 px-4 sm:px-6 relative overflow-hidden">
      {/* Background Blurs */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-orange-400/5 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/60 backdrop-blur-xl p-6 rounded-3xl shadow-xl border border-white gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-extrabold text-slate-800">Rescue Tracker</span>
              <Badge className={`uppercase font-bold ${
                report.status === "resolved" 
                  ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
                  : report.status === "assigned"
                  ? "bg-amber-100 text-amber-700 border-amber-200"
                  : "bg-red-100 text-red-700 border-red-200"
              }`}>
                {report.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-2">ID: {report._id}</p>
          </div>
          <Link href="/">
            <Button variant="ghost" className="rounded-full text-slate-600 hover:bg-slate-100 font-bold">
              ← Exit Tracker
            </Button>
          </Link>
        </div>

        {/* Live Stepper */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-100">
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Alert Received", icon: Clock },
              { label: "NGO Dispatched", icon: Navigation },
              { label: "Ambulance En Route", icon: Loader2 },
              { label: "Cow Safe", icon: ShieldCheck },
            ].map((step, idx) => {
              const status = getStepStatus(idx + 1);
              const StepIcon = step.icon;
              return (
                <div key={idx} className="flex flex-col items-center text-center space-y-2 relative">
                  {/* Connect Line */}
                  {idx < 3 && (
                    <div className={`hidden sm:block absolute top-5 left-[60%] w-[80%] h-0.5 z-0 ${
                      getStepStatus(idx + 2) === "completed" ? "bg-emerald-500" : "bg-slate-200"
                    }`} />
                  )}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 transition-colors ${
                    status === "completed" 
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                      : status === "active"
                      ? "bg-blue-600 text-white animate-pulse shadow-lg shadow-blue-500/25"
                      : "bg-slate-100 text-slate-400"
                  }`}>
                    <StepIcon size={18} className={status === "active" && idx === 2 ? "animate-spin" : ""} />
                  </div>
                  <span className={`text-[10px] sm:text-xs font-bold ${
                    status !== "upcoming" ? "text-slate-800" : "text-slate-400"
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 💝 SPONSORSHIP CAMPAIGN CARD */}
        {report.isFundraising && (
          <div className="bg-gradient-to-br from-rose-50 to-pink-50/30 border border-rose-100 p-6 sm:p-8 rounded-3xl shadow-xl shadow-rose-100/30 flex flex-col md:flex-row gap-6 justify-between items-stretch md:items-center relative overflow-hidden">
            {/* Background sparkle effects */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-pink-300/10 blur-2xl rounded-full pointer-events-none"></div>
            
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-rose-100 text-rose-700 border-rose-200 uppercase font-bold flex items-center gap-1">
                  <Heart className="h-3 w-3 fill-rose-500 text-rose-700 animate-pulse" /> Sponsorship Active
                </Badge>
                <Badge variant="outline" className="border-rose-200 text-rose-600 bg-white font-mono text-[10px] font-bold">
                  SaaS Routing Enabled
                </Badge>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-800 leading-tight">
                  {report.fundraisingTitle || "Support Medical Recovery"}
                </h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed max-w-xl font-medium">
                  {report.fundraisingDescription || "This rescued animal requires urgent veterinary medical attention, recovery treatment, and shelter support."}
                </p>
              </div>

              {/* Progress Tracker */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between items-end text-xs font-bold text-slate-500">
                  <span className="uppercase tracking-wider">Campaign Progress</span>
                  <span className="text-rose-600 font-mono text-sm">
                    ${report.fundraisingRaised || 0} raised of ${report.fundraisingGoal || 0} goal
                  </span>
                </div>
                
                {/* Progress bar container */}
                <div className="h-3 bg-rose-100 rounded-full overflow-hidden w-full border border-rose-200/40">
                  <div 
                    className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full transition-all duration-1000 ease-out relative"
                    style={{
                      width: `${Math.min(100, Math.round(((report.fundraisingRaised || 0) / (report.fundraisingGoal || 1)) * 100))}%`
                    }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                  </div>
                </div>

                <div className="flex justify-between text-[10px] font-extrabold text-rose-500/80 uppercase tracking-widest pt-0.5">
                  <span>Start</span>
                  <span>{Math.min(100, Math.round(((report.fundraisingRaised || 0) / (report.fundraisingGoal || 1)) * 100))}% Funded</span>
                  <span>Complete</span>
                </div>
              </div>
            </div>

            {/* CTA sponsorship action */}
            <div className="flex flex-col justify-center items-center shrink-0 gap-2 border-t md:border-t-0 md:border-l border-rose-200/50 pt-4 md:pt-0 md:pl-8">
              <div className="text-center mb-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Direct Sponsorship</p>
                <p className="text-2xl font-black text-slate-800 font-mono mt-0.5">100% Go-To-NGO</p>
              </div>
              <Button 
                onClick={() => setShowDonateModal(true)}
                className="w-full md:w-auto rounded-full bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-extrabold h-13 px-8 shadow-lg shadow-rose-500/30 hover:scale-105 transition-transform flex items-center justify-center gap-2 border-0"
              >
                <Sparkles size={16} /> Sponsor Recovery
              </Button>
            </div>
          </div>
        )}

        {/* Live Map */}
        <div className="bg-white p-4 rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          <h3 className="font-extrabold text-slate-800 mb-4 px-2 flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping"></span>
            Real-Time Map Overview
          </h3>
          <TrackingMap cowCoords={cowCoords} driverCoords={driverCoords} />
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Driver details (Only if assigned) */}
          {report.status === "assigned" && (
            <Card className="rounded-3xl border-0 shadow-lg shadow-slate-200/40 bg-white overflow-hidden">
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2"><User size={18} className="text-orange-500" /> Dispatch Details</h3>
                <Badge className="bg-orange-500 text-slate-950 hover:bg-orange-600 font-extrabold">Active</Badge>
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase">Assigned NGO</span>
                  <span className="font-bold text-slate-800">{report.ngoName || "NGO Team"}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-400 uppercase">Ambulance Driver</span>
                  <span className="font-bold text-slate-800">{report.driverName || "On Site Team"}</span>
                </div>
                {report.driverPhone && (
                  <div className="flex gap-2 pt-4">
                    <a href={`tel:${report.driverPhone}`} className="flex-1">
                      <Button className="w-full rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11">
                        <Phone size={16} className="mr-2" /> Call Driver
                      </Button>
                    </a>
                    <a href={`https://wa.me/${report.driverPhone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button variant="outline" className="w-full rounded-full border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-bold h-11">
                        💬 WhatsApp
                      </Button>
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Cow status / Case summary */}
          <Card className="rounded-3xl border-0 shadow-lg shadow-slate-200/40 bg-white overflow-hidden md:col-span-1">
            <div className="bg-slate-900 text-white p-5">
              <h3 className="font-bold flex items-center gap-2"><Heart size={18} className="text-red-500 fill-red-500" /> Animal & Report Details</h3>
            </div>
            <CardContent className="p-6 flex gap-4 items-start">
              <div className="relative w-24 h-24 rounded-2xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 shadow-inner">
                <Image src={report.imageUrl} alt="Injured cattle" fill className="object-cover" />
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  <Badge className="bg-red-500 text-white border-0 text-[10px] font-bold">{report.severity}</Badge>
                  <Badge variant="outline" className="border-slate-200 text-slate-500 bg-slate-50 text-[10px] font-bold">
                    AI: {report.injuryType}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-slate-600 line-clamp-3 leading-relaxed">
                  {report.description}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resolved Proof Card */}
        {report.status === "resolved" && report.resolvedImageUrl && (
          <Card className="rounded-3xl border border-emerald-100 shadow-xl shadow-emerald-50/50 bg-gradient-to-br from-white to-emerald-50/40 overflow-hidden">
            <div className="bg-emerald-500 text-white p-5 flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2"><CheckCircle2 size={18} /> Verification of Safety</h3>
              <Badge className="bg-white text-emerald-700 hover:bg-emerald-50 font-bold uppercase">Success</Badge>
            </div>
            <CardContent className="p-6 flex flex-col sm:flex-row gap-6 items-center">
              <div className="relative w-full sm:w-48 h-48 rounded-2xl overflow-hidden bg-slate-100 border border-emerald-200/50 shadow-md">
                <Image src={report.resolvedImageUrl} alt="Rescued Animal" fill className="object-cover" />
              </div>
              <div className="text-center sm:text-left space-y-2">
                <h4 className="font-extrabold text-slate-800 text-lg">Animal Safely Rescued!</h4>
                <p className="text-sm text-slate-500 leading-relaxed max-w-md">
                  The rescue team has successfully verified the rescue. The cattle is now under professional care at the gaushala/shelter.
                </p>
                <div className="pt-2 text-xs font-semibold text-emerald-700">Thank you for making a difference! 💚</div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Live Recent Donation Toast */}
      {recentDonation && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-4 rounded-2xl shadow-2xl border border-slate-800 flex items-center gap-3 animate-bounce z-[110] max-w-sm">
          <div className="bg-rose-500 p-2.5 rounded-xl"><Sparkles className="text-white" size={18} /></div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Live Sponsorship!</p>
            <p className="text-sm font-bold text-slate-100">
              <span className="text-rose-400">{recentDonation.sponsorName}</span> sponsored <span className="font-mono text-rose-400">${recentDonation.amount}</span>
            </p>
          </div>
        </div>
      )}

      {/* Confetti Falling Animation Elements */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[120] overflow-hidden">
          {Array.from({ length: 25 }).map((_, i) => (
            <div 
              key={i} 
              className="absolute text-2xl animate-fall"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${3 + Math.random() * 2}s`,
                top: `-5%`,
              }}
            >
              {["💝", "💖", "🌸", "✨", "🐄"][i % 5]}
            </div>
          ))}
        </div>
      )}

      {/* 💝 SPONSOR DONATION MODAL */}
      {showDonateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 rounded-[2rem] border-0 overflow-hidden">
            <CardHeader className="bg-rose-500 text-white p-6">
              <CardTitle className="text-2xl font-extrabold flex items-center gap-2">
                🚑 Recovery Sponsor
              </CardTitle>
              <p className="text-sm text-rose-50 mt-1 font-medium">Sponsor medical expenses directly. Safe, live-tracked transaction.</p>
            </CardHeader>
            <CardContent className="p-6 sm:p-8 space-y-4">
              
              {submitSuccess ? (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-3 animate-in zoom-in-95">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 mb-2">
                    <CheckCircle2 size={36} className="animate-bounce" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">Sponsorship Processed!</h3>
                  <p className="text-sm text-slate-500 font-medium">Thank you for supporting this animal&apos;s rescue. 💚</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sponsor Name (Optional)</label>
                    <input 
                      type="text" 
                      className="w-full h-12 rounded-xl bg-slate-50 border border-slate-200 px-4 font-medium focus:ring-2 focus:ring-rose-500 outline-none" 
                      placeholder="Anonymous"
                      value={donationSponsorName}
                      onChange={(e) => setDonationSponsorName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest font-semibold text-slate-700">Select Donation Amount</label>
                    <div className="grid grid-cols-4 gap-2">
                      {["10", "25", "50", "100"].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setDonationAmount(amt)}
                          className={`h-11 rounded-xl font-bold border transition-colors ${
                            donationAmount === amt 
                              ? "bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/20" 
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          ${amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Or Custom Amount ($)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 font-bold">$</div>
                      <input 
                        type="number" 
                        className="w-full h-12 rounded-xl bg-slate-50 border border-slate-200 pl-8 pr-4 font-bold font-mono focus:ring-2 focus:ring-rose-500 outline-none" 
                        placeholder="50"
                        value={donationAmount}
                        onChange={(e) => setDonationAmount(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button variant="outline" className="flex-1 rounded-full h-12 font-bold text-slate-600 hover:bg-slate-100" onClick={() => setShowDonateModal(false)}>Cancel</Button>
                    <Button 
                      className="flex-1 bg-rose-500 hover:bg-rose-600 text-white rounded-full h-12 font-bold shadow-lg shadow-rose-500/20 border-0 flex items-center justify-center gap-1.5" 
                      onClick={submitDonation}
                      disabled={isSubmittingDonation || !donationAmount}
                    >
                      {isSubmittingDonation ? <Loader2 className="animate-spin h-5 w-5" /> : <>💝 Donate ${donationAmount}</>}
                    </Button>
                  </div>
                </>
              )}

            </CardContent>
          </Card>
        </div>
      )}

      {/* Pure CSS Confetti fall keyframes */}
      <style jsx global>{`
        @keyframes fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(105vh) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-fall {
          animation: fall linear forwards;
        }
      `}</style>
    </div>
  );
}
