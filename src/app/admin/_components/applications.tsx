"use client";

import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { toast } from "sonner";
import { Ban, Building2, Check, Mail, MapPin, Phone, RotateCcw, User, X } from "lucide-react";
import type { NgoProfile } from "@/types";
import { api, errorMessage } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { DecisionDialog } from "./decision-dialog";

export type AppStatus = NgoProfile["status"];
type Application = NgoProfile & { rejectionReason?: string };
type Decision = "approve" | "reject" | "suspend";

const STATUS_BADGE: Record<AppStatus, { variant: "moderate" | "success" | "critical" | "secondary"; label: string }> = {
  pending: { variant: "moderate", label: "Pending" },
  approved: { variant: "success", label: "Approved" },
  rejected: { variant: "secondary", label: "Rejected" },
  suspended: { variant: "critical", label: "Suspended" },
};

const EMPTY_COPY: Record<AppStatus, string> = {
  pending: "No applications waiting for review. New ones appear here as soon as they're submitted.",
  approved: "No approved partners yet.",
  rejected: "No rejected applications.",
  suspended: "No suspended partners.",
};

export function ApplicationsList({ status }: { status: AppStatus }) {
  const key = `/api/admin/applications?status=${status}`;
  const { data, isLoading, error, mutate } = useSWR<{ applications: Application[] }>(key);
  const { mutate: globalMutate } = useSWRConfig();
  const [dialog, setDialog] = useState<{ app: Application; decision: "reject" | "suspend" } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const decide = async (app: Application, decision: Decision, reason?: string) => {
    setBusyId(app.id);
    // Optimistic: drop the row from this tab immediately; roll back on failure.
    const previous = data;
    void mutate({ applications: (data?.applications ?? []).filter((a) => a.id !== app.id) }, { revalidate: false });
    try {
      await api(`/api/admin/applications/${app.id}/${decision}`, { method: "POST", json: reason ? { reason } : {} });
      toast.success(
        decision === "approve" ? `${app.ngoName} is now a verified partner.` : decision === "reject" ? `${app.ngoName} was rejected.` : `${app.ngoName} was suspended.`
      );
      void globalMutate((k) => typeof k === "string" && (k.startsWith("/api/admin/applications") || k === "/api/admin/overview"));
    } catch (err) {
      void mutate(previous, { revalidate: false });
      toast.error(errorMessage(err));
      throw err;
    } finally {
      setBusyId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-36 w-full" />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <EmptyState
        icon={Building2}
        title="Couldn't load applications"
        description={errorMessage(error)}
        action={
          <Button variant="outline" onClick={() => void mutate()}>
            Retry
          </Button>
        }
      />
    );
  }
  const apps = data?.applications ?? [];
  if (!apps.length) return <EmptyState icon={Building2} title="Nothing here" description={EMPTY_COPY[status]} />;

  return (
    <>
      <ul className="space-y-3">
        {apps.map((app) => (
          <li key={app.id}>
            <Card className="p-5 sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold tracking-tight">{app.ngoName}</h3>
                    <Badge variant={STATUS_BADGE[app.status].variant}>{STATUS_BADGE[app.status].label}</Badge>
                    <span className="text-xs text-muted-foreground">submitted {timeAgo(app.createdAt)}</span>
                  </div>
                  <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 xl:grid-cols-3">
                    <Detail icon={User} label="Contact" value={app.contactPerson} />
                    <Detail icon={Phone} label="Phone" value={<a href={`tel:${app.phone}`} className="hover:underline">{app.phone}</a>} />
                    <Detail icon={Mail} label="Email" value={<a href={`mailto:${app.email}`} className="break-all hover:underline">{app.email}</a>} />
                    <Detail icon={Building2} label="Reg. no." value={<span className="font-mono">{app.registrationNumber}</span>} />
                    <Detail icon={MapPin} label="Address" value={app.address} className="sm:col-span-2" />
                    <Detail
                      icon={MapPin}
                      label="Coverage"
                      value={
                        app.operatingLatitude != null
                          ? `${app.operatingRadius} km around ${app.operatingLatitude.toFixed(3)}, ${app.operatingLongitude?.toFixed(3)}`
                          : `${app.operatingRadius} km · centre not set`
                      }
                    />
                  </dl>
                  {app.rejectionReason && (app.status === "rejected" || app.status === "suspended") && (
                    <p className="rounded-xl bg-subtle px-3 py-2 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Reason:</span> {app.rejectionReason}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col lg:items-stretch">
                  {app.status === "pending" && (
                    <>
                      <Button variant="success" loading={busyId === app.id} onClick={() => decide(app, "approve").catch(() => {})}>
                        {busyId !== app.id && <Check />} Approve
                      </Button>
                      <Button variant="outline" disabled={busyId === app.id} onClick={() => setDialog({ app, decision: "reject" })}>
                        <X /> Reject
                      </Button>
                    </>
                  )}
                  {app.status === "approved" && (
                    <Button variant="outline" className="text-destructive" disabled={busyId === app.id} onClick={() => setDialog({ app, decision: "suspend" })}>
                      <Ban /> Suspend
                    </Button>
                  )}
                  {(app.status === "rejected" || app.status === "suspended") && (
                    <Button variant="outline" loading={busyId === app.id} onClick={() => decide(app, "approve").catch(() => {})}>
                      {busyId !== app.id && <RotateCcw />} {app.status === "suspended" ? "Reinstate" : "Approve"}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </li>
        ))}
      </ul>

      <DecisionDialog
        open={Boolean(dialog)}
        onOpenChange={(o) => !o && setDialog(null)}
        title={dialog?.decision === "suspend" ? `Suspend ${dialog?.app.ngoName}?` : `Reject ${dialog?.app.ngoName ?? ""}?`}
        description={
          dialog?.decision === "suspend"
            ? "They will immediately lose command-center access and stop receiving rescue alerts. Open cases stay assigned."
            : "The applicant will see this reason and can update their details and re-apply."
        }
        confirmLabel={dialog?.decision === "suspend" ? "Suspend partner" : "Reject application"}
        onConfirm={async (reason) => {
          if (dialog) await decide(dialog.app, dialog.decision, reason);
        }}
      />
    </>
  );
}

function Detail({ icon: Icon, label, value, className }: { icon: typeof User; label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3" aria-hidden /> {label}
      </dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
  );
}
