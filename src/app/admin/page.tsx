"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldAlert, Mail, Building2, Phone, Fingerprint,
  CheckCircle2, XCircle, Loader2, Clock, MapPin, User
} from "lucide-react";

interface Application {
  _id: string;
  userId: string;
  email: string;
  ngoName: string;
  registrationNumber: string;
  contactPerson: string;
  phone: string;
  address: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export default function SuperAdminPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Check if user is superadmin via the role API
  useEffect(() => {
    if (!isLoaded || !user) return;

    const checkRole = async () => {
      try {
        const res = await fetch("/api/auth/role");
        const data = await res.json();
        if (data.role === "superadmin") {
          setIsSuperadmin(true);
        } else {
          router.push("/");
        }
      } catch {
        router.push("/");
      }
    };

    checkRole();
  }, [isLoaded, user, router]);

  // Fetch applications once confirmed as superadmin
  useEffect(() => {
    if (!isSuperadmin) return;

    const fetchApps = async () => {
      try {
        const res = await fetch("/api/admin/applications");
        const data = await res.json();
        setApplications(data.applications || []);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load applications.");
      } finally {
        setLoading(false);
      }
    };

    fetchApps();
  }, [isSuperadmin]);

  const handleApprove = async (appId: string, ngoName: string) => {
    setProcessingId(appId);
    try {
      const res = await fetch(`/api/admin/applications/${appId}/approve`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(`${ngoName} has been approved! They can now access the NGO Dashboard.`);
        setApplications((prev) =>
          prev.map((app) => (app._id === appId ? { ...app, status: "approved" } : app))
        );
      } else {
        toast.error(data.error || "Failed to approve.");
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (appId: string, ngoName: string) => {
    setProcessingId(appId);
    try {
      const res = await fetch(`/api/admin/applications/${appId}/reject`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(`${ngoName} has been rejected.`);
        setApplications((prev) =>
          prev.map((app) => (app._id === appId ? { ...app, status: "rejected" } : app))
        );
      } else {
        toast.error(data.error || "Failed to reject.");
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-bold uppercase px-3 py-1">
            <CheckCircle2 size={12} className="mr-1" /> Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200 font-bold uppercase px-3 py-1">
            <XCircle size={12} className="mr-1" /> Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-bold uppercase px-3 py-1">
            <Clock size={12} className="mr-1" /> Pending
          </Badge>
        );
    }
  };

  if (!isLoaded || !isSuperadmin) return null;

  return (
    <div className="min-h-screen pt-28 md:pt-36 pb-24 px-4 sm:px-6 bg-slate-50">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 md:p-10 text-white shadow-xl flex items-center gap-6 relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-500/20 blur-3xl rounded-full"></div>
          <div className="bg-blue-500/20 p-4 rounded-2xl border border-blue-400/30">
            <ShieldAlert size={36} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Super Admin Hub</h1>
            <p className="text-slate-400 font-medium mt-1">Review and approve NGO partnership requests.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm text-center">
            <p className="text-3xl font-extrabold text-amber-600">{applications.filter((a) => a.status === "pending").length}</p>
            <p className="text-xs font-bold text-slate-400 uppercase mt-1">Pending</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm text-center">
            <p className="text-3xl font-extrabold text-emerald-600">{applications.filter((a) => a.status === "approved").length}</p>
            <p className="text-xs font-bold text-slate-400 uppercase mt-1">Approved</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm text-center">
            <p className="text-3xl font-extrabold text-red-500">{applications.filter((a) => a.status === "rejected").length}</p>
            <p className="text-xs font-bold text-slate-400 uppercase mt-1">Rejected</p>
          </div>
        </div>

        {/* Application List */}
        {loading ? (
          <div className="text-center p-12 text-slate-500 animate-pulse font-bold">Loading applications...</div>
        ) : applications.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-[2rem] border border-slate-200 shadow-sm text-slate-500 font-medium">
            No NGO applications yet.
          </div>
        ) : (
          <div className="grid gap-6">
            {applications.map((app) => (
              <Card key={app._id} className="rounded-[2rem] shadow-lg shadow-slate-200/40 border-0 overflow-hidden bg-white">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">

                    {/* Left Side: NGO Details */}
                    <div className="p-6 md:p-8 flex-1 border-b md:border-b-0 md:border-r border-slate-100">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                          <Building2 className="text-blue-500" /> {app.ngoName}
                        </h3>
                        {getStatusBadge(app.status)}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Fingerprint size={12} /> Reg No.
                          </p>
                          <p className="font-mono text-sm text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-100 w-fit">
                            {app.registrationNumber}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <User size={12} /> Contact
                          </p>
                          <p className="text-sm font-medium text-slate-700">{app.contactPerson}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Phone size={12} /> Phone
                          </p>
                          <p className="text-sm font-medium text-slate-700">{app.phone}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Mail size={12} /> Login Email
                          </p>
                          <p className="text-sm font-medium text-blue-600">{app.email}</p>
                        </div>
                        {app.address && (
                          <div className="space-y-1 col-span-2">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                              <MapPin size={12} /> Address
                            </p>
                            <p className="text-sm text-slate-600">{app.address}</p>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-slate-400 mt-4">
                        Applied: {new Date(app.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
                        })}
                      </p>
                    </div>

                    {/* Right Side: Action Buttons */}
                    <div className="p-6 md:p-8 bg-slate-50 md:w-72 flex flex-col justify-center items-center gap-4">
                      {app.status === "pending" ? (
                        <>
                          <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-2">Actions</p>
                          <Button
                            onClick={() => handleApprove(app._id, app.ngoName)}
                            disabled={processingId === app._id}
                            className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-200/50"
                          >
                            {processingId === app._id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                            )}
                            Approve as NGO
                          </Button>
                          <Button
                            onClick={() => handleReject(app._id, app.ngoName)}
                            disabled={processingId === app._id}
                            variant="outline"
                            className="w-full h-12 rounded-xl border-red-200 text-red-600 hover:bg-red-50 font-bold"
                          >
                            <XCircle className="mr-2 h-4 w-4" /> Reject
                          </Button>
                          <p className="text-[10px] text-slate-400 text-center mt-2 leading-relaxed">
                            Approving will grant this user access to the NGO Command Center dashboard.
                          </p>
                        </>
                      ) : (
                        <div className="text-center">
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 ${
                            app.status === "approved" ? "bg-emerald-100" : "bg-red-100"
                          }`}>
                            {app.status === "approved" ? (
                              <CheckCircle2 size={32} className="text-emerald-600" />
                            ) : (
                              <XCircle size={32} className="text-red-500" />
                            )}
                          </div>
                          <p className="text-sm font-bold text-slate-600">
                            {app.status === "approved"
                              ? "This NGO has been approved and can access the dashboard."
                              : "This application was rejected."}
                          </p>
                        </div>
                      )}
                    </div>

                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}