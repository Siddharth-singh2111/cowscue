"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { pusherClient } from "@/lib/pusher";
import { Heart, Shield, Star } from "lucide-react"; // Icons for stats

interface Report {
  _id: string;
  imageUrl: string;
  description: string;
  status: string;
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

  // Fetch initial reports & stats
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

  // Listen for Real-Time Status Updates (so Karma updates live!)
  useEffect(() => {
    const channel = pusherClient.subscribe("cowscue-alerts");

    channel.bind("status-update", (updatedReport: Report) => {
      setReports((prevReports) => {
        const newReports = prevReports.map((report) =>
          report._id === updatedReport._id 
            ? { ...report, status: updatedReport.status } 
            : report
        );
        
        // Recalculate stats dynamically if a cow is resolved
        const newResolvedCount = newReports.filter(r => r.status === 'resolved').length;
        setStats({
          totalReported: newReports.length,
          rescuedCows: newResolvedCount,
          karmaPoints: newResolvedCount * 50
        });

        return newReports;
      });
    });

    return () => {
      pusherClient.unsubscribe("cowscue-alerts");
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-red-100 text-red-700 border-red-200";
      case "assigned": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "resolved": return "bg-green-100 text-green-700 border-green-200";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading your history...</div>;

  return (
    <div className="min-h-screen p-4 md:p-8 bg-slate-50 space-y-8">
      
      {/* 🏆 IMPACT BANNER */}
      <div className="bg-gradient-to-br from-yellow-200 to-pink-700 rounded p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl text-black font-extrabold mb-2">Your Impact</h1>
            <p className="text-black">Every report makes a difference.</p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-white/20 backdrop-blur-md rounded-xl p-4 text-center min-w-[100px]">
              <Star className="mx-auto mb-1 text-yellow-300 fill-yellow-300" size={24} />
              <div className="text-2xl font-bold">{stats.karmaPoints}</div>
              <div className="text-xs uppercase tracking-wider opacity-80">Karma</div>
            </div>
            <div className="bg-white/20 backdrop-blur-md rounded-xl p-4 text-center min-w-[100px]">
              <Heart className="mx-auto mb-1 text-red-300 fill-red-300" size={24} />
              <div className="text-2xl font-bold">{stats.rescuedCows}</div>
              <div className="text-xs uppercase tracking-wider opacity-80">Saved</div>
            </div>
          </div>
        </div>
        {/* Decorative background element */}
        <Shield className="absolute -right-10 -bottom-10 text-white/10 w-64 h-64 transform rotate-12" />
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Report History</h2>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-200 border-dashed">
          <p className="text-xl text-slate-500 mb-4">You haven't reported any cows yet.</p>
          <Link href="/report">
            <Button size="lg" className="bg-orange-600 hover:bg-orange-700">Report Your First Cow</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <Card key={report._id} className="hover:shadow-md transition-shadow border-slate-200">
              <div className="relative h-48 w-full">
                <img
                  src={report.imageUrl}
                  alt="Reported Cow"
                  className="w-full h-full object-cover rounded-t-xl"
                />
                <div className={`absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-bold uppercase border ${getStatusColor(report.status)} shadow-sm transition-colors duration-500`}>
                  {report.status}
                </div>
              </div>
              
              <CardHeader className="pb-2">
                <div className="text-xs text-slate-400 mb-1">
                  {new Date(report.createdAt).toLocaleDateString()}
                </div>
                <CardTitle className="text-base truncate text-slate-800">
                  {report.description}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report.status === 'resolved' ? (
                  <p className="text-sm text-green-600 font-bold flex items-center gap-2">
                    🎉 Rescued! (+50 Karma)
                  </p>
                ) : report.status === 'assigned' ? (
                  <p className="text-sm text-yellow-600 font-medium">
                    🚑 NGO dispatched
                  </p>
                ) : (
                  <p className="text-sm text-slate-500">
                    Awaiting NGO response...
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}