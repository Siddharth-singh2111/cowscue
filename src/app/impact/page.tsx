"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { pusherClient } from "@/lib/pusher";
import { Heart, Shield, Zap, Users, TrendingUp, AlertTriangle } from "lucide-react";
import type { PlatformStats, Report } from "@/types";

interface ImpactData {
  stats: PlatformStats;
  recentRescues: Partial<Report>[];
}

export default function ImpactPage() {
  const [data, setData] = useState<ImpactData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const channel = pusherClient.subscribe("cowscue-alerts");
    channel.bind("status-update", (updated: Report) => {
      if (updated.status !== "resolved") return;
      setData((prev) => {
        if (!prev) return prev;
        return {
          stats: {
            ...prev.stats,
            resolvedReports: prev.stats.resolvedReports + 1,
            pendingReports: Math.max(0, prev.stats.pendingReports - 1),
            successRate: Math.round(((prev.stats.resolvedReports + 1) / prev.stats.totalReports) * 100),
          },
          recentRescues: [updated, ...prev.recentRescues.slice(0, 9)],
        };
      });
    });
    return () => pusherClient.unsubscribe("cowscue-alerts");
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-3">
        <div className="animate-spin h-10 w-10 border-4 border-orange-500 border-t-transparent rounded-full mx-auto" />
        <p className="text-slate-500 font-medium">Loading impact data...</p>
      </div>
    </div>
  );

  const { stats, recentRescues } = data!;

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900 text-white py-20 px-4 relative overflow-hidden">
        <div className="relative max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-block px-4 py-1.5 rounded-full bg-orange-500/20 text-orange-300 text-sm font-bold border border-orange-500/30">
            🌍 Live Platform Impact
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">
            Every Number is a <span className="text-orange-400">Life Saved</span>
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto">
            Cowscue connects citizens with animal rescue NGOs across India. Here's the difference you've made together.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/report">
              <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-6 text-lg shadow-xl">🚨 Report an Emergency</Button>
            </Link>
            <Link href="/">
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 px-8 py-6 text-lg">Learn How It Works</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats cards */}
      <section className="max-w-6xl mx-auto px-4 -mt-12 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { icon: <Heart className="text-red-400 fill-red-400" size={32}/>, value: stats.resolvedReports, label: "Animals Rescued", border: "border-red-100" },
            { icon: <Users className="text-blue-500" size={32}/>, value: stats.totalCitizenReporters, label: "Active Citizens", border: "border-blue-100" },
            { icon: <TrendingUp className="text-green-500" size={32}/>, value: `${stats.successRate}%`, label: "Success Rate", border: "border-green-100" },
            { icon: <Zap className="text-yellow-500" size={32}/>, value: stats.totalReports, label: "Total Reports", border: "border-yellow-100" },
            { icon: <AlertTriangle className="text-orange-500" size={32}/>, value: stats.criticalCases, label: "Critical Cases Handled", border: "border-orange-100" },
            { icon: <Shield className="text-purple-500" size={32}/>, value: stats.pendingReports + stats.assignedReports, label: "Active Rescues Now", border: "border-purple-100" },
          ].map(({ icon, value, label, border }) => (
            <div key={label} className={`bg-white rounded-2xl p-6 shadow-lg border-2 ${border} text-center hover:shadow-xl transition-shadow`}>
              <div className="flex justify-center mb-3">{icon}</div>
              <div className="text-3xl md:text-4xl font-extrabold text-slate-800 mb-1">{value}</div>
              <div className="text-sm text-slate-500 font-medium">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent rescues feed */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-800 mb-2">🏅 Recent Rescues</h2>
          <p className="text-slate-500">Real animals, real people, real impact. Updated live.</p>
        </div>
        {recentRescues.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed text-slate-400">No rescues yet — be the first to report!</div>
        ) : (
          <div className="space-y-4">
            {recentRescues.map((rescue, i) => (
              <div key={rescue._id ?? i} className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                {rescue.imageUrl && <img src={rescue.imageUrl} alt="Rescued" className="w-16 h-16 rounded-xl object-cover shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 line-clamp-1">{rescue.description || "Animal rescued"}</p>
                  <p className="text-sm text-slate-400 mt-0.5">
                    By {rescue.reporterName || "Anonymous"} • {rescue.createdAt ? new Date(rescue.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}
                  </p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">✅ Rescued</span>
                  {rescue.severity && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${
                      rescue.severity === "critical" ? "bg-red-500" :
                      rescue.severity === "moderate" ? "bg-orange-500" : "bg-blue-500"
                    }`}>{rescue.severity}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="bg-orange-600 py-16 px-4 text-center text-white">
        <h2 className="text-3xl font-extrabold mb-3">See a cow in distress?</h2>
        <p className="text-orange-100 mb-8 text-lg max-w-xl mx-auto">One photo. One tap. A life saved. Under 60 seconds.</p>
        <Link href="/report">
          <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 px-10 py-6 text-lg font-bold shadow-xl">
            Report Now — It's Free 🐄
          </Button>
        </Link>
      </section>
    </div>
  );
}