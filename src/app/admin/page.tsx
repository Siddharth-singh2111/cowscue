"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs"; // 🟢 Import Clerk
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, Mail, Building2, Phone, Fingerprint, Copy } from "lucide-react";

interface Application {
  _id: string;
  userId: string;
  email: string;
  ngoName: string;
  registrationNumber: string;
  contactPerson: string;
  phone: string;
  status: string;
  createdAt: string;
}

export default function SuperAdminPage() {
  const { user, isLoaded } = useUser(); // 🟢 Get current user
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  // 🔒 FRONTEND BOUNCER: Kick out anyone who isn't a superadmin
  useEffect(() => {
    if (isLoaded) {
      if (!user || user.publicMetadata?.role !== "superadmin") {
        router.push("/"); // Redirect to homepage
      }
    }
  }, [isLoaded, user, router]);

  useEffect(() => {
    const fetchApps = async () => {
      // Don't fetch if they aren't authorized (prevents 403 errors in console)
      if (user?.publicMetadata?.role !== "superadmin") return; 

      try {
        const res = await fetch("/api/admin/applications");
        const data = await res.json();
        setApplications(data.applications || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    
    if (isLoaded && user?.publicMetadata?.role === "superadmin") {
      fetchApps();
    }
  }, [isLoaded, user]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert(`Copied ${text} to clipboard!`);
  };

 
  if (!isLoaded || user?.publicMetadata?.role !== "superadmin") {
    return null; 
  }

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
                        <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-bold uppercase px-3 py-1">
                          {app.status}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Fingerprint size={12}/> Reg No.</p>
                          <p className="font-mono text-sm text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-100 w-fit">{app.registrationNumber}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1"><Phone size={12}/> Contact</p>
                          <p className="text-sm font-medium text-slate-700">{app.contactPerson} ({app.phone})</p>
                        </div>
                      </div>
                    </div>

                    {/* Right Side: Clerk Approval Action */}
                    <div className="p-6 md:p-8 bg-slate-50 md:w-80 flex flex-col justify-center">
                      <p className="text-xs font-extrabold text-slate-500 uppercase tracking-widest mb-4">Approval Steps</p>
                      
                      <div className="space-y-4">
                        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-1"><Mail size={12}/> Clerk Email to search:</p>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-slate-800 truncate">{app.email}</span>
                            <button onClick={() => copyToClipboard(app.email)} className="p-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"><Copy size={14}/></button>
                          </div>
                        </div>

                        <div className="text-sm font-medium text-slate-600 space-y-2">
                          <p>1. Go to <a href="https://dashboard.clerk.com" target="_blank" rel="noreferrer" className="text-blue-500 font-bold underline">dashboard.clerk.com</a></p>
                          <p>2. Search for the email above.</p>
                          <p>3. Scroll to <strong>Public Metadata</strong> and paste:</p>
                          <code className="block bg-slate-900 text-green-400 p-2 rounded-lg text-xs mt-1 font-mono">
                            {`{"role": "ngo"}`}
                          </code>
                        </div>
                      </div>
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