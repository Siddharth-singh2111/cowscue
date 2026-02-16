"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

// Dynamically import the Map to avoid server-side errors
const RescueMap = dynamic(() => import("@/components/Map"), { 
  ssr: false,
  loading: () => <div className="h-[400px] w-full bg-slate-100 animate-pulse rounded-xl">Loading Map...</div>
});

interface Report {
  _id: string;
  imageUrl: string;
  description: string;
  status: string;
  createdAt: string;
  location: {
    coordinates: number[];
  };
}

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // 🔴 REPLACE THIS WITH YOUR EMAIL
  const ADMIN_EMAIL = "secretwars495@gmail.com"; 

  useEffect(() => {
    if (isLoaded) {
      const email = user?.primaryEmailAddress?.emailAddress;
      
      // 🔒 SECURITY CHECK: If not admin, kick them out
      if (!user || email !== ADMIN_EMAIL) {
        router.push("/"); // Redirect to Home
      } else {
        fetchReports(); // Only fetch data if allowed
      }
    }
  }, [isLoaded, user, router]);

  const fetchReports = async () => {
    try {
      const res = await fetch("/api/reports");
      const data = await res.json();
      setReports(data.reports || []);
    } catch (error) {
      console.error("Failed to load reports", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (reportId: string, newStatus: string) => {
    setUpdating(reportId);
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setReports((prev) =>
          prev.map((r) =>
            r._id === reportId ? { ...r, status: newStatus } : r
          )
        );
      }
    } catch (error) {
      console.error("Failed to update status", error);
      alert("Failed to update status");
    } finally {
      setUpdating(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-red-100 text-red-700 border-red-200";
      case "assigned": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "resolved": return "bg-green-100 text-green-700 border-green-200";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  // If loading or checking auth, show a simple loading state
  if (!isLoaded || loading) return <div className="p-10 text-center">Loading Dashboard...</div>;

  // If not admin (and somehow wasn't redirected yet), hide content
  if (user?.primaryEmailAddress?.emailAddress !== ADMIN_EMAIL) return null;

  return (
    <div className="min-h-screen p-8 bg-slate-50">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-green-800">
          🚑 NGO Rescue Dashboard
        </h1>
        <Button onClick={fetchReports} variant="outline">Refresh Data</Button>
      </div>

      <div className="mb-8">
        <RescueMap reports={reports} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <Card key={report._id} className="hover:shadow-lg transition-shadow border-slate-200">
            <div className="relative h-48 w-full">
              <img
                src={report.imageUrl}
                alt="Injured Cow"
                className="w-full h-full object-cover rounded-t-xl"
              />
              <div className={`absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-bold uppercase border ${getStatusColor(report.status)} shadow-sm`}>
                {report.status}
              </div>
            </div>
            
            <CardHeader>
              <div className="text-xs text-gray-400 mb-1">
                  {new Date(report.createdAt).toLocaleDateString()} at {new Date(report.createdAt).toLocaleTimeString()}
              </div>
              <CardTitle className="text-lg truncate">
                {report.description}
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {report.status === 'pending' && (
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => handleStatusChange(report._id, "assigned")}
                    disabled={updating === report._id}
                  >
                    {updating === report._id ? "..." : "Accept Rescue"}
                  </Button>
                )}

                {report.status === 'assigned' && (
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleStatusChange(report._id, "resolved")}
                    disabled={updating === report._id}
                  >
                    {updating === report._id ? "..." : "Mark Resolved"}
                  </Button>
                )}
                
                {report.status === 'resolved' && (
                  <Button variant="outline" disabled className="w-full">
                    ✅ Completed
                  </Button>
                )}

                <Button variant="secondary" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=$${report.location.coordinates[1]},${report.location.coordinates[0]}`)}>
                  📍 Map
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}