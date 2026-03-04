"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { pusherClient } from "@/lib/pusher";
import { SEVERITY_STYLES, STATUS_STYLES } from "@/lib/utils";
import { Heart, Shield, Star, Zap } from "lucide-react";
import type { Report, UserStats } from "@/types";

export default function MyReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<UserStats>({ karmaPoints: 0, rescuedCows: 0, totalReported: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports/mine")
      .then((r) => r.json())
      .then((data) => {
        setReports(data.reports || []);
        if (data.stats) setStats(data.stats);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const channel = pusherClient.subscribe("cowscue-alerts");

    // FIX: Also listen for new reports to keep total count accurate
    channel.bind("new-report", (newReport: Report) => {
      setReports((prev) => {
        if (prev.some((r) => r._id === newReport._id)) return prev;
        const updated = [newReport, ...prev];
        setStats((s) => ({ ...s, totalReported: updated.length }));
        return updated;
      });
    });

    channel.bind("status-update", (updatedReport: Report) => {
      setReports((prev) => {
        const updated = prev.map((r) => r._id === updatedReport._id ? { ...r, ...updatedReport } : r);
        const resolved = updated.filter((r) => r.status === "resolved");
        const criticalRescues = resolved.filter((r) => r.severity === "critical").length;
        setStats({
          totalReported: updated.length,
          rescuedCows: resolved.length,
          karmaPoints: resolved.length * 50 + criticalRescues * 50,
        });
        return updated;
      });
    });

    return () => { pusherClient.unsubscribe("cowscue-alerts"); };
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto" />
        <p className="text-slate-500">Loading your rescue history...</p>
      </div>
    </div>
  );

  const karmaLevel =
    stats.karmaPoints >= 500 ? { label: "Guardian Angel 👼", color: "text-purple-600" } :
    stats.karmaPoints >= 200 ? { label: "Trusted Hero 🦸", color: "text-blue-600" } :
    stats.karmaPoints >= 50  ? { label: "Active Citizen ⭐", color: "text-yellow-600" } :
                               { label: "New Citizen 🌱", color: "text-green-600" };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-slate-50 space-y-8">

      {/* Impact Banner */}
      <div className="bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-600 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="text-sm font-bold mb-1 bg-white/20 inline-block px-2 py-0.5 rounded-full">
              {karmaLevel.label}
            </p>
            <h1 className="text-3xl font-extrabold text-white mb-1">Your Impact</h1>
            <p className="text-white/80 text-sm">Every report saves a life. Keep going!</p>
          </div>
          <div className="flex gap-3">
            {[
              { icon: <Star className="mx-auto mb-1 text-yellow-200 fill-yellow-200" size={22}/>, value: stats.karmaPoints, label: "Karma" },
              { icon: <Heart className="mx-auto mb-1 text-red-200 fill-red-200" size={22}/>, value: stats.rescuedCows, label: "Saved" },
              { icon: <Zap className="mx-auto mb-1 text-blue-200" size={22}/>, value: stats.totalReported, label: "Reports" },
            ].map(({ icon, value, label }) => (
              <div key={label} className="bg-white/20 backdrop-blur-md rounded-2xl p-4 text-center min-w-[80px]">
                {icon}
                <div className="text-2xl font-extrabold">{value}</div>
                <div className="text-xs uppercase tracking-wider opacity-80">{label}</div>
              </div>
            ))}
          </div>
        </div>
        <Shield className="absolute -right-8 -bottom-8 text-white/10 w-56 h-56" />
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Report History</h2>
        <Link href="/report">
          <Button className="bg-orange-600 hover:bg-orange-700">+ New Report</Button>
        </Link>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed text-slate-500">
          <p className="text-xl mb-4">No reports yet.</p>
          <Link href="/report"><Button size="lg" className="bg-orange-600 hover:bg-orange-700">Report Your First Cow 🐄</Button></Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <Card key={report._id} className="hover:shadow-lg transition-all border-slate-200 overflow-hidden p-0 gap-0">
              <div className="relative h-48 w-full">
                <img src={report.imageUrl} alt="Reported Cow" className="w-full h-full object-cover" />
                <div className={`absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-bold uppercase border shadow-sm ${STATUS_STYLES[report.status]}`}>
                  {report.status}
                </div>
                <div className={`absolute top-2 left-2 px-3 py-1 rounded-full text-xs font-bold uppercase shadow-sm ${SEVERITY_STYLES[report.severity ?? "routine"]}`}>
                  {report.severity ?? "routine"}
                </div>
              </div>
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="text-xs text-slate-400 mb-1">
                  {new Date(report.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </div>
                <CardTitle className="text-base line-clamp-2 text-slate-800">{report.description}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {report.status === "resolved" ? (
                  <div>
                    <p className="text-sm text-green-600 font-bold">🎉 Rescued! (+{report.severity === "critical" ? "100" : "50"} Karma)</p>
                    {report.ngoNotes && <p className="text-xs text-slate-500 mt-1 bg-green-50 p-2 rounded-lg">📝 NGO: {report.ngoNotes}</p>}
                  </div>
                ) : report.status === "assigned" ? (
                  <div>
                    <p className="text-sm text-yellow-600 font-medium">🚑 {report.assignedTo || "NGO"} dispatched</p>
                    {report.ngoNotes && <p className="text-xs text-slate-500 mt-1 bg-yellow-50 p-2 rounded-lg">📝 {report.ngoNotes}</p>}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">⏳ Awaiting NGO response...</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}