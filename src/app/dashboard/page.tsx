"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { MapPin, AlertTriangle, CheckCircle2, Route as RouteIcon, Loader2, Star } from "lucide-react";
import { pusherClient } from "@/lib/pusher";
import { ADMIN_EMAILS, SEVERITY_STYLES } from "@/lib/utils";
import type { Report, ReportSeverity } from "@/types";

const RescueMap = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => <div className="h-[450px] w-full bg-slate-100 animate-pulse rounded-xl flex items-center justify-center text-slate-400">Loading Map...</div>,
});

type SeverityFilter = "all" | ReportSeverity;

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [radius, setRadius] = useState([15]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [optimizedRoute, setOptimizedRoute] = useState<unknown>(null);
  const [isRouting, setIsRouting] = useState(false);
  const [notesInput, setNotesInput] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isLoaded) return;
    const email = user?.primaryEmailAddress?.emailAddress;
    if (!user || !email || !ADMIN_EMAILS.includes(email)) { router.push("/"); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        fetchNearbyReports(loc.lat, loc.lng, radius[0]);
      },
      () => fetchAllReports()
    );
  }, [isLoaded, user]);

  useEffect(() => {
    const channel = pusherClient.subscribe("cowscue-alerts");
    channel.bind("new-report", (r: Report) => setReports((prev) => [r, ...prev]));
    channel.bind("status-update", (updated: Report) =>
      setReports((prev) => prev.map((r) => (r._id === updated._id ? updated : r)))
    );
    return () => pusherClient.unsubscribe("cowscue-alerts");
  }, []);

  const fetchAllReports = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports");
      const data = await res.json();
      setReports(data.reports || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const fetchNearbyReports = async (lat: number, lng: number, rad: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/nearby?lat=${lat}&lng=${lng}&radius=${rad}`);
      const data = await res.json();
      setReports(data.reports || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleStatusChange = async (reportId: string, newStatus: string, notes?: string) => {
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, ngoNotes: notes }),
      });
      if (res.status === 409) { alert("⚡ Too late! Another NGO accepted this case."); return; }
      if (res.ok) {
        const data = await res.json();
        setReports((prev) => prev.map((r) => (r._id === reportId ? data.report : r)));
        setNotesInput((prev) => { const c = { ...prev }; delete c[reportId]; return c; });
      }
    } catch (error) { console.error("Update failed", error); }
  };

  const calculateOptimizedRoute = async () => {
    if (!userLocation) return alert("Waiting for GPS...");
    setIsRouting(true);
    try {
      const selected = reports.filter((r) => selectedReports.has(r._id));
      const coords = [
        [userLocation.lng, userLocation.lat],
        ...selected.map((c) => [c.location.coordinates[0], c.location.coordinates[1]]),
      ].map((c) => c.join(",")).join(";");

      const res = await fetch(
        `https://router.project-osrm.org/trip/v1/driving/${coords}?source=first&destination=any&roundtrip=false&geometries=geojson`
      );
      const data = await res.json();
      if (data.code === "Ok") {
        setOptimizedRoute(data.trips[0].geometry);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else alert("Routing failed. Some locations may not be road-accessible.");
    } catch (e) { alert("Failed to calculate route."); }
    finally { setIsRouting(false); }
  };

  const toggleSelection = (id: string) => {
    setSelectedReports((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };

  if (!isLoaded) return null;

  const activeReports = reports.filter((r) => r.status === "pending" || r.status === "assigned");
  const filteredActive = severityFilter === "all" ? activeReports : activeReports.filter((r) => r.severity === severityFilter);
  const pendingCount = reports.filter((r) => r.status === "pending").length;
  const assignedCount = reports.filter((r) => r.status === "assigned").length;
  const resolvedCount = reports.filter((r) => r.status === "resolved").length;
  const criticalCount = reports.filter((r) => r.severity === "critical" && r.status !== "resolved").length;
  const recentResolved = reports.filter((r) => r.status === "resolved")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="min-h-screen p-4 md:p-8 bg-slate-100">

      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">🚑 Suraksha Command Center</h1>
          <p className="text-slate-500 mt-1">
            {userLocation ? `Monitoring ${radius[0]}km radius` : "Global Overview"} • {reports.length} Records
            {criticalCount > 0 && <span className="ml-2 text-red-600 font-bold animate-pulse">⚠️ {criticalCount} critical</span>}
          </p>
        </div>
        <div className="w-full lg:w-auto min-w-[280px]">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-semibold text-slate-700">Radius: {radius[0]}km</span>
            <MapPin className="h-4 w-4 text-orange-500" />
          </div>
          <Slider
            defaultValue={[15]} max={50} step={1}
            onValueChange={(val) => setRadius(val)}
            onValueCommit={(val) => userLocation && fetchNearbyReports(userLocation.lat, userLocation.lng, val[0])}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Critical", value: criticalCount, bg: "bg-red-50", text: "text-red-700", sub: "text-red-500" },
          { label: "Pending", value: pendingCount, bg: "bg-amber-50", text: "text-amber-700", sub: "text-amber-500" },
          { label: "In Progress", value: assignedCount, bg: "bg-yellow-50", text: "text-yellow-700", sub: "text-yellow-600" },
          { label: "Rescued", value: resolvedCount, bg: "bg-green-50", text: "text-green-700", sub: "text-green-500" },
        ].map(({ label, value, bg, text, sub }) => (
          <Card key={label} className={`${bg} border-0`}>
            <CardContent className="p-5">
              <p className={`text-xs font-bold uppercase ${sub}`}>{label}</p>
              <h2 className={`text-4xl font-extrabold mt-1 ${text}`}>{value}</h2>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Map */}
      <div className="mb-8 rounded-2xl overflow-hidden shadow-sm border border-slate-200 relative">
        <RescueMap reports={reports} optimizedRoute={optimizedRoute as never} />
        {optimizedRoute && (
          <div className="absolute top-4 left-4 z-[1000] bg-white p-3 rounded-xl shadow-xl border border-purple-200">
            <p className="font-bold text-purple-700 text-sm flex items-center gap-2"><RouteIcon size={16} /> Optimal Route Active</p>
            <Button size="sm" variant="ghost" onClick={() => setOptimizedRoute(null)} className="h-6 mt-1 text-xs w-full text-slate-500">Clear Route</Button>
          </div>
        )}
        <div className="absolute bottom-4 right-4 z-[1000] bg-white p-3 rounded-xl shadow border text-xs space-y-1">
          <p className="font-bold text-slate-600 mb-1">Legend</p>
          {[["bg-red-500","Critical"],["bg-orange-500","Moderate"],["bg-blue-500","Routine"],["bg-green-500","Resolved"]].map(([c, l]) => (
            <div key={l} className="flex items-center gap-2"><div className={`w-3 h-3 rounded-full ${c}`}/><span className="text-slate-600">{l}</span></div>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Active Cases */}
        <div>
          <div className="flex flex-wrap justify-between items-center mb-4 gap-3">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <AlertTriangle className="text-red-500" /> Action Required
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 bg-white rounded-xl p-1 border border-slate-200 shadow-sm">
                {(["all", "critical", "moderate", "routine"] as const).map((f) => (
                  <button key={f} onClick={() => setSeverityFilter(f)}
                    className={`text-xs px-2 py-1 rounded-lg font-semibold capitalize transition-all ${severityFilter === f ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-100"}`}>
                    {f}
                  </button>
                ))}
              </div>
              {selectedReports.size >= 2 && (
                <Button onClick={calculateOptimizedRoute} disabled={isRouting} className="bg-purple-600 hover:bg-purple-700 text-white" size="sm">
                  {isRouting ? <Loader2 className="animate-spin mr-1" size={14}/> : <RouteIcon className="mr-1" size={14}/>}
                  Batch Route
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-4 max-h-[900px] overflow-y-auto pr-1">
            {loading ? (
              <div className="p-8 text-center bg-white rounded-xl text-slate-400 animate-pulse">Loading...</div>
            ) : filteredActive.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-dashed text-slate-500">
                {severityFilter === "all" ? "All clear! 🎉" : `No ${severityFilter} cases.`}
              </div>
            ) : (
              filteredActive.map((report) => (
                <Card key={report._id} className={`overflow-hidden p-0 gap-0 transition-all ${
                  selectedReports.has(report._id) ? "ring-2 ring-purple-500 shadow-md" :
                  report.severity === "critical" ? "border-l-4 border-l-red-500" : "border-slate-200"
                }`}>
                  <div className="flex flex-col sm:flex-row">
                    <div className="relative w-full sm:w-36 h-36 shrink-0">
                      <img src={report.imageUrl} alt="Cow" className="w-full h-full object-cover" />
                      <div className={`absolute top-1 left-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${SEVERITY_STYLES[report.severity ?? "routine"]}`}>
                        {report.severity ?? "routine"}
                      </div>
                    </div>
                    <div className="p-3 flex flex-col justify-between flex-1 min-w-0">
                      <div>
                        <div className="flex justify-between items-start mb-1">
                          <Badge className={`text-[10px] ${report.status === "pending" ? "bg-red-500" : "bg-yellow-500"}`}>
                            {report.status.toUpperCase()}
                          </Badge>
                          <span className="text-[10px] text-slate-400">{new Date(report.createdAt).toLocaleDateString("en-IN")}</span>
                        </div>
                        <p className="text-slate-700 text-xs line-clamp-2 mb-2">{report.description}</p>
                      </div>

                      {/* Reporter info */}
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 mb-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-slate-800 truncate">👤 {report.reporterName || "Citizen"}</span>
                          {report.reporterHistory > 0 ? (
                            <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                              <Star size={10} className="fill-green-600 text-green-600"/>Trusted ({report.reporterHistory})
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 bg-slate-200 px-1.5 py-0.5 rounded-full shrink-0">New</span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs text-slate-600 font-mono truncate">{report.reporterPhone || "No number"}</span>
                          {report.reporterPhone && (
                            <div className="flex gap-1 shrink-0">
                              <a href={`tel:${report.reporterPhone}`}>
                                <Button size="sm" variant="outline" className="h-6 px-1.5 text-[10px] border-blue-200 text-blue-700">📞</Button>
                              </a>
                              <a href={`https://wa.me/${report.reporterPhone.replace(/\D/g,"")}?text=Hi from Cowscue NGO. Can you share your live location?`} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" variant="outline" className="h-6 px-1.5 text-[10px] border-green-200 text-green-700">💬</Button>
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* NGO Notes */}
                      <input type="text" placeholder="Add notes (optional)..."
                        value={notesInput[report._id] || ""}
                        onChange={(e) => setNotesInput((prev) => ({ ...prev, [report._id]: e.target.value }))}
                        className="w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 mb-2 focus:outline-none focus:border-orange-400"
                      />

                      {/* Actions */}
                      <div className="flex flex-wrap gap-1.5">
                        <Button size="sm"
                          variant={selectedReports.has(report._id) ? "default" : "outline"}
                          className={`text-xs h-7 ${selectedReports.has(report._id) ? "bg-purple-600 hover:bg-purple-700" : ""}`}
                          onClick={() => toggleSelection(report._id)}>
                          {selectedReports.has(report._id) ? "✓ In Route" : "+ Route"}
                        </Button>
                        {report.status === "pending" ? (
                          <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-xs h-7"
                            onClick={() => handleStatusChange(report._id, "assigned", notesInput[report._id])}>
                            Accept Case
                          </Button>
                        ) : (
                          <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-xs h-7"
                            onClick={() => handleStatusChange(report._id, "resolved", notesInput[report._id])}>
                            Mark Safe ✓
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Recent History */}
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <CheckCircle2 className="text-green-500" /> Recent Rescues
          </h2>
          <div className="space-y-3">
            {recentResolved.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl border border-dashed text-slate-500">No rescued cattle yet.</div>
            ) : (
              recentResolved.map((report) => (
                <div key={report._id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <img src={report.imageUrl} alt="Cow" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{report.description}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(report.createdAt).toLocaleDateString("en-IN")} • {report.reporterName}</p>
                    {report.ngoNotes && <p className="text-xs text-slate-500 mt-1 truncate">📝 {report.ngoNotes}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-[10px]">SAVED</Badge>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white ${SEVERITY_STYLES[report.severity ?? "routine"]}`}>
                      {report.severity ?? "routine"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}