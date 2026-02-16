"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface Report {
  _id: string;
  imageUrl: string;
  description: string;
  status: string;
  createdAt: string;
}

export default function MyReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyReports = async () => {
      try {
        const res = await fetch("/api/reports/mine");
        const data = await res.json();
        setReports(data.reports || []);
      } catch (error) {
        console.error("Failed to load reports", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMyReports();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-red-100 text-red-700 border-red-200";
      case "assigned": return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "resolved": return "bg-green-100 text-green-700 border-green-200";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  if (loading) return <div className="p-8 text-center">Loading your history...</div>;

  return (
    <div className="min-h-screen p-8 bg-slate-50">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-slate-800">
          My Report History
        </h1>
       
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-xl text-gray-500 mb-4">You haven't reported any cows yet.</p>
          <Link href="/report">
            <Button size="lg" className="bg-green-600">Report Your First Cow</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <Card key={report._id} className="hover:shadow-md transition-shadow">
              <div className="relative h-48 w-full">
                <img
                  src={report.imageUrl}
                  alt="Reported Cow"
                  className="w-full h-full object-cover rounded-t-xl"
                />
                <div className={`absolute top-2 right-2 px-3 py-1 rounded-full text-xs font-bold uppercase border ${getStatusColor(report.status)} shadow-sm`}>
                  {report.status}
                </div>
              </div>
              
              <CardHeader>
                <div className="text-xs text-gray-400 mb-1">
                  Reported on {new Date(report.createdAt).toLocaleDateString()}
                </div>
                <CardTitle className="text-base truncate">
                  {report.description}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report.status === 'resolved' ? (
                  <p className="text-sm text-green-600 font-medium">
                    🎉 This cow has been rescued!
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">
                    Help is on the way. We will update you soon.
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