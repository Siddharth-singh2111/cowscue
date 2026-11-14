"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Activity, AlertTriangle, ArrowUpRight, Building2, CheckCircle2, Clock, Lock, ShieldCheck, Siren } from "lucide-react";
import { useMe } from "@/hooks/useMe";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";
import { ApplicationsList, type AppStatus } from "./_components/applications";

interface Overview {
  reports: Record<string, number>;
  ngos: Record<string, number>;
  escalatedPending: number;
}

const TABS: { value: AppStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "suspended", label: "Suspended" },
];

function Stat({
  label,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  label: string;
  value?: number;
  icon: typeof Activity;
  tone?: "alert" | "good";
  hint?: string;
}) {
  return (
    <Card className={cn("p-5", tone === "alert" && "border-critical/40 bg-critical-soft/50", tone === "good" && "border-success/30 bg-success/5")}>
      <div className="flex items-center justify-between text-muted-foreground">
        <p className="text-sm font-medium">{label}</p>
        <Icon className={cn("size-4", tone === "alert" && "text-critical", tone === "good" && "text-success")} aria-hidden />
      </div>
      {value == null ? (
        <Skeleton className="mt-3 h-8 w-16" />
      ) : (
        <p className={cn("mt-2 text-3xl font-semibold tracking-tight tabular-nums", tone === "alert" && "text-critical")}>{value}</p>
      )}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

export default function AdminPage() {
  const { me, loading } = useMe();
  const isAdmin = me?.role === "superadmin";
  const { data } = useSWR<{ overview: Overview }>(isAdmin ? "/api/admin/overview" : null, { refreshInterval: 30_000 });
  const [tab, setTab] = useState<AppStatus>("pending");
  const o = data?.overview;
  const r = o?.reports;

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-4 pt-14 sm:px-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24">
        <EmptyState
          icon={Lock}
          title="This area is for Cowscue administrators"
          description={me?.signedIn ? "Your account doesn't have admin access. If you run an NGO, head to the partner page instead." : "Sign in with an administrator account to continue."}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild variant="outline">
                <Link href="/">Back home</Link>
              </Button>
              <Button asChild>
                <Link href="/apply">For NGOs</Link>
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  const active = r ? (r.pending ?? 0) + (r.assigned ?? 0) + (r.en_route ?? 0) : undefined;

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 pb-32 pt-10 sm:px-6 md:pb-20 md:pt-14">
      <PageHeader
        eyebrow="Superadmin"
        title="Platform console"
        description="Verify partner organisations and keep an eye on the health of the rescue network."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/impact">
                Live impact <ArrowUpRight />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href="/api/ready" target="_blank" rel="noreferrer">
                System status <ArrowUpRight />
              </a>
            </Button>
            <Button asChild size="sm">
              <Link href="/dashboard">Command center</Link>
            </Button>
          </>
        }
      />

      <section aria-label="Overview" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Escalated, unaccepted"
          value={o?.escalatedPending}
          icon={Siren}
          tone={o && o.escalatedPending > 0 ? "alert" : undefined}
          hint={o && o.escalatedPending > 0 ? "Cases past their SLA — check coverage gaps" : "No SLA breaches right now"}
        />
        <Stat label="Active rescues" value={active} icon={Activity} hint={r ? `${r.pending ?? 0} awaiting a team` : undefined} />
        <Stat label="Animals rescued" value={r ? r.resolved ?? 0 : undefined} icon={CheckCircle2} tone="good" hint={r ? `${r.closed ?? 0} closed without rescue` : undefined} />
        <Stat
          label="Pending applications"
          value={o ? o.ngos.pending ?? 0 : undefined}
          icon={Clock}
          hint={o ? `${o.ngos.approved ?? 0} verified partners · ${o.ngos.suspended ?? 0} suspended` : undefined}
        />
      </section>

      <section className="space-y-5" aria-labelledby="applications-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="applications-heading" className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Building2 className="size-5 text-muted-foreground" aria-hidden /> Partner applications
            </h2>
            <p className="text-sm text-muted-foreground">Check registration details before approving — approved partners see reporters&apos; phone numbers.</p>
          </div>
          {o && (o.ngos.pending ?? 0) > 0 && (
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <AlertTriangle className="size-4 text-moderate" aria-hidden /> {o.ngos.pending} awaiting review
            </p>
          )}
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as AppStatus)}>
          <TabsList className="w-full sm:w-auto">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value}>
                {t.value === "approved" && <ShieldCheck />}
                {t.label}
                {o?.ngos[t.value] ? <span className="ml-0.5 font-mono text-[11px] tabular-nums text-muted-foreground">{o.ngos[t.value]}</span> : null}
              </TabsTrigger>
            ))}
          </TabsList>
          {TABS.map((t) => (
            <TabsContent key={t.value} value={t.value} className="mt-5">
              <ApplicationsList status={t.value} />
            </TabsContent>
          ))}
        </Tabs>
      </section>
    </div>
  );
}
