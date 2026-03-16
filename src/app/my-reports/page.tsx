"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { pusherClient } from "@/lib/pusher";
import { Heart, Shield, Star, Sparkles, MapPin, CheckCircle2, Clock, Camera } from "lucide-react"; 

interface Report {
  _id: string;
  imageUrl: string;
  description: string;
  status: string;
  resolvedImageUrl?:string;
  createdAt: string;
}

interface UserStats {
  karmaPoints: number;
  rescuedCows: number;
  totalReported: number;
}

export default function MyReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<UserStats>({ karmaPoints: 0, rescuedCows: 0, totalReported: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyReports = async () => {
      try {
        const res = await fetch("/api/reports/mine");
        const data = await res.json();
        setReports(data.reports || []);
        if (data.stats) setStats(data.stats);
      } catch (error) {
        console.error("Failed to load reports", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMyReports();
  }, []);

  useEffect(() => {
    const channel = pusherClient.subscribe("cowscue-alerts");
    channel.bind("status-update", (updatedReport: Report) => {
      setReports((prevReports) => {
        const newReports = prevReports.map((report) =>
          report._id === updatedReport._id 
            ? { ...report, status: updatedReport.status } 
            : report
        );
        
        const newResolvedCount = newReports.filter(r => r.status === 'resolved').length;
        setStats({
          totalReported: newReports.length,
          rescuedCows: newResolvedCount,
          karmaPoints: newResolvedCount * 50
        });

        return newReports;
      });
    });

    return () => { pusherClient.unsubscribe("cowscue-alerts"); };
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending": return "bg-red-500/90 text-white shadow-lg shadow-red-500/30 backdrop-blur-md";
      case "assigned": return "bg-amber-500/90 text-white shadow-lg shadow-amber-500/30 backdrop-blur-md";
      case "resolved": return "bg-emerald-500/90 text-white shadow-lg shadow-emerald-500/30 backdrop-blur-md";
      default: return "bg-slate-500/90 text-white backdrop-blur-md";
    }
  };

  if (loading) return (
    <div className="min-h-screen pt-32 flex flex-col items-center justify-center bg-slate-50">
      <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-500 font-medium animate-pulse">Loading your impact...</p>
    </div>
  );

  return (
    <div className="min-h-screen pt-28 md:pt-36 pb-24 px-4 sm:px-6 relative overflow-hidden bg-slate-50">
      
      {/* Ambient Background Blur */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-orange-400/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-rose-400/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-7xl mx-auto relative z-10 space-y-12">
        
        {/* 🏆 PREMIUM IMPACT BANNER */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[3rem] p-8 sm:p-12 md:p-16 text-white shadow-2xl shadow-slate-900/20 relative overflow-hidden border border-slate-700/50">
          <div className="absolute -right-20 -top-20 w-96 h-96 bg-orange-500/20 blur-[80px] rounded-full pointer-events-none"></div>
          <Shield className="absolute -right-16 -bottom-16 text-white/5 w-96 h-96 transform rotate-12 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-10">
            <div className="space-y-3">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 border border-white/10 text-orange-400 text-xs font-bold uppercase tracking-widest backdrop-blur-md mb-2">
                <Sparkles size={14} className="mr-2" /> Citizen Hero
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Your Impact</h1>
              <p className="text-slate-400 text-lg max-w-md">You are actively making the streets safer for the voiceless. Every report makes a difference.</p>
            </div>
            
            <div className="flex flex-wrap sm:flex-nowrap gap-4 w-full lg:w-auto">
              <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 text-center flex-1 lg:min-w-[160px] shadow-xl">
                <div className="bg-orange-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Star className="text-orange-400 fill-orange-400" size={24} />
                </div>
                <div className="text-4xl font-black mb-1">{stats.karmaPoints}</div>
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400">Karma</div>
              </div>

              <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 text-center flex-1 lg:min-w-[160px] shadow-xl">
                <div className="bg-rose-500/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Heart className="text-rose-400 fill-rose-400" size={24} />
                </div>
                <div className="text-4xl font-black mb-1">{stats.rescuedCows}</div>
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400">Rescued</div>
              </div>
            </div>
          </div>
        </div>

        {/* 🗺️ REPORT HISTORY HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
            <Clock className="text-slate-400" />
            Report History
          </h2>
          {reports.length > 0 && (
            <Link href="/report">
               <Button className="rounded-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 text-white shadow-lg shadow-orange-500/25 border-0 font-bold px-6 transition-transform hover:-translate-y-1">
                 + Report Another Cow
               </Button>
            </Link>
          )}
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-24 bg-white/60 backdrop-blur-xl rounded-[3rem] border-2 border-dashed border-slate-200 shadow-xl shadow-slate-200/40 relative overflow-hidden">
            <div className="bg-slate-100 p-6 rounded-full w-fit mx-auto mb-6">
              <Camera size={48} className="text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-700 mb-2">You haven't reported any cows yet.</p>
            <p className="text-slate-500 mb-8 max-w-sm mx-auto">Be the hero they need. If you see an injured animal, snap a photo and drop a pin.</p>
            <Link href="/report">
              <Button size="lg" className="bg-orange-600 hover:bg-orange-700 rounded-full h-14 px-10 text-lg font-bold shadow-xl shadow-orange-500/20 transition-transform hover:-translate-y-1">Report Your First Rescue</Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {reports.map((report) => (
              <Card key={report._id} className="rounded-[2.5rem] overflow-hidden border-0 shadow-2xl shadow-slate-200/40 hover:-translate-y-2 transition-transform duration-500 bg-white flex flex-col group">
                
                <div className="relative h-64 w-full flex bg-slate-100 shrink-0">
                  {report.status === 'resolved' && report.resolvedImageUrl ? (
                    <>
                      <div className="w-1/2 relative border-r-2 border-white">
                        <img src={report.imageUrl} alt="Before" className="w-full h-full object-cover rounded-tl-[2.5rem] grayscale opacity-80" />
                        <span className="absolute bottom-3 left-3 bg-slate-900/60 text-white text-[10px] uppercase tracking-widest font-black px-3 py-1 rounded-full backdrop-blur-md border border-white/10">Before</span>
                      </div>
                      <div className="w-1/2 relative">
                        <img src={report.resolvedImageUrl} alt="After" className="w-full h-full object-cover rounded-tr-[2.5rem]" />
                        <span className="absolute bottom-3 right-3 bg-emerald-500/90 text-white text-[10px] uppercase tracking-widest font-black px-3 py-1 rounded-full shadow-lg shadow-emerald-500/30 border border-white/20 backdrop-blur-md">Safe</span>
                      </div>
                    </>
                  ) : (
                    <img src={report.imageUrl} alt="Reported Cow" className="w-full h-full object-cover rounded-t-[2.5rem] group-hover:scale-105 transition-transform duration-700" />
                  )}
                  
                  <div className={`absolute top-4 right-4 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest ${getStatusBadge(report.status)} border border-white/20 transition-colors duration-500`}>
                    {report.status}
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col p-8 pt-6 relative bg-white">
                  <div className="text-xs font-bold text-slate-400 mb-3 bg-slate-50 w-fit px-3 py-1 rounded-md">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </div>
                  
                  <CardTitle className="text-lg font-bold text-slate-800 mb-6 leading-relaxed line-clamp-3">
                    {report.description}
                  </CardTitle>
                  
                  <div className="mt-auto pt-6 border-t border-slate-100 flex items-center gap-3">
                    {report.status === 'resolved' ? (
                      <div className="flex items-center gap-3 bg-emerald-50 text-emerald-700 p-3 rounded-2xl w-full border border-emerald-100">
                        <div className="bg-emerald-200 p-2 rounded-full"><CheckCircle2 size={20} className="text-emerald-700" /></div>
                        <p className="text-sm font-bold">🎉 Rescued! (+50 Karma)</p>
                      </div>
                    ) : report.status === 'assigned' ? (
                      <div className="flex items-center gap-3 bg-amber-50 text-amber-700 p-3 rounded-2xl w-full border border-amber-100">
                        <div className="bg-amber-200 p-2 rounded-full"><MapPin size={20} className="text-amber-700" /></div>
                        <p className="text-sm font-bold">🚑 NGO dispatched</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 bg-slate-50 text-slate-500 p-3 rounded-2xl w-full border border-slate-100">
                        <div className="bg-slate-200 p-2 rounded-full"><Clock size={20} className="text-slate-500" /></div>
                        <p className="text-sm font-bold">Awaiting NGO response...</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}