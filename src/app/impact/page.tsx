"use client";

import { useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import useSWR from "swr";
import {
  Activity,
  ArrowUpRight,
  Building2,
  HandCoins,
  HeartPulse,
  MapPin,
  Radio,
  ShieldCheck,
  Timer,
  TimerReset,
  Users,
} from "lucide-react";
import { Channels, Events, type PublicNgo, type PublicStats } from "@/types";
import { useChannel, useRealtimeStatus } from "@/lib/realtime";
import { formatINR, formatMinutes, timeAgo } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { SeverityDot, StatusBadge } from "@/components/report/badges";
import { cn } from "@/lib/utils";
import { TrendChart } from "./_components/trend-chart";
import { SeverityBars } from "./_components/severity-bars";

const HotspotMap = dynamic(() => import("@/components/maps/HotspotMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-[420px] w-full rounded-2xl" />,
});

const nf = new Intl.NumberFormat("en-IN");

function LiveIndicator() {
  const state = useRealtimeStatus();
  const live = state === "connected";
  const label = live ? "Live" : state === "unavailable" ? "Auto-refresh" : state === "connecting" || state === "initialized" ? "Connecting…" : "Reconnecting…";
  return (
    <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-xs font-medium shadow-xs" role="status">
      <span className="relative flex size-2">
        {live && <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-70" />}
        <span className={cn("relative inline-flex size-2 rounded-full", live ? "bg-success" : "bg-muted-foreground/60")} />
      </span>
      {label}
    </span>
  );
}

export default function ImpactPage() {
  const { data, error, isLoading, mutate } = useSWR<{ stats: PublicStats }>("/api/stats", { refreshInterval: 60_000 });
  const { data: ngoData } = useSWR<{ ngos: PublicNgo[] }>("/api/ngos");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stats change in bursts (a rescue touches several counters); coalesce realtime pings.
  useChannel(Channels.publicFeed, {
    [Events.statsChanged]: () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void mutate(), 2000);
    },
  });

  const stats = data?.stats;
  const ngos = ngoData?.ngos ?? [];
  const t = stats?.totals;

  const kpis = [
    { label: "Reports received", value: t ? nf.format(t.reported) : null, icon: Activity },
    { label: "Animals rescued", value: t ? nf.format(t.rescued) : null, icon: ShieldCheck, accent: true },
    { label: "Active right now", value: t ? nf.format(t.active) : null, icon: HeartPulse },
    { label: "Partner NGOs", value: t ? nf.format(t.ngos) : null, icon: Building2 },
    { label: "Citizen reporters", value: t ? nf.format(t.citizens) : null, icon: Users },
    { label: "Raised for recovery", value: t ? formatINR(t.raised) : null, icon: HandCoins },
    { label: "Median response", value: stats ? formatMinutes(stats.medianResponseMinutes) : null, icon: Timer, hint: "Report → team accepts" },
    { label: "Median rescue time", value: stats ? formatMinutes(stats.medianResolutionMinutes) : null, icon: TimerReset, hint: "Report → animal safe" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 pb-32 pt-10 sm:px-6 md:pb-20 md:pt-14">
      <PageHeader
        eyebrow="Transparency"
        title={
          <>
            Live impact, <span className="font-display font-normal italic">in the open.</span>
          </>
        }
        description="Every number on this page comes straight from the dispatch system and updates in real time. Personal details are never shown — locations are rounded to about 1 km."
        actions={
          <>
            <LiveIndicator />
            {stats && <span className="text-xs text-muted-foreground">Updated {timeAgo(stats.generatedAt)}</span>}
          </>
        }
      />

      {error && !stats && (
        <EmptyState
          icon={Radio}
          title="Live numbers are temporarily unavailable"
          description="We couldn't reach the stats service. Rescues are unaffected — please try again in a moment."
          action={
            <Button variant="outline" onClick={() => void mutate()}>
              Retry
            </Button>
          }
        />
      )}

      {/* KPIs */}
      <section aria-label="Key numbers" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className={cn("p-5", k.accent && "border-success/30 bg-success/5")}>
            <div className="flex items-center justify-between text-muted-foreground">
              <p className="text-xs font-medium sm:text-sm">{k.label}</p>
              <k.icon className={cn("size-4", k.accent && "text-success")} aria-hidden />
            </div>
            {k.value == null || isLoading ? (
              <Skeleton className="mt-3 h-8 w-20" />
            ) : (
              <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{k.value}</p>
            )}
            {k.hint && <p className="mt-1 text-[11px] text-muted-foreground">{k.hint}</p>}
          </Card>
        ))}
      </section>

      {/* Charts */}
      <section className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Reports and rescues, last 14 days</CardTitle>
            <CardDescription>New reports per day against animals brought to safety.</CardDescription>
          </CardHeader>
          <CardContent>{stats ? <TrendChart daily={stats.daily} /> : <Skeleton className="h-72 w-full" />}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Severity mix</CardTitle>
            <CardDescription>How AI triage graded every non-closed case.</CardDescription>
          </CardHeader>
          <CardContent>
            {stats ? (
              <SeverityBars mix={stats.severityMix} />
            ) : (
              <div className="space-y-5">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Map + recent activity */}
      <section className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Where help is needed</CardTitle>
            <CardDescription>
              Heat shows report density over the last 90 days; green circles are partner coverage areas. Coordinates are rounded to ~1 km so no
              reporter can be located.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats ? (
              <HotspotMap hotspots={stats.hotspots} ngos={ngos} className="h-[420px]" />
            ) : (
              <Skeleton className="h-[420px] w-full rounded-2xl" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>The latest cases across the network.</CardDescription>
          </CardHeader>
          <CardContent>
            {!stats ? (
              <div className="space-y-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : stats.recent.length === 0 ? (
              <EmptyState icon={Activity} title="No cases yet" description="New reports will appear here the moment they come in." />
            ) : (
              <ul className="-mx-2 divide-y">
                {stats.recent.map((r) => (
                  <li key={r.id}>
                    <Link href={`/track/${r.id}`} className="group flex items-start gap-3 rounded-xl px-2 py-3 transition hover:bg-accent">
                      <SeverityDot severity={r.severity} className="mt-1.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{r.injuryType}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3" aria-hidden /> {r.area} · {timeAgo(r.at)}
                        </p>
                      </div>
                      <StatusBadge status={r.status} className="shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Partner directory */}
      <section id="partners" className="scroll-mt-24 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Partner NGOs</h2>
            <p className="text-sm text-muted-foreground">Verified gaushalas and rescue organisations on the network.</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/apply">
              Join as a partner <ArrowUpRight />
            </Link>
          </Button>
        </div>
        {!ngoData ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : ngos.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No partners listed yet"
            description="Run a gaushala or rescue NGO? Be the first verified partner in your city."
            action={
              <Button asChild>
                <Link href="/apply">Apply to partner</Link>
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ngos.map((n) => (
              <li key={n.id}>
                <Card className="h-full p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft font-semibold text-primary">
                        {n.ngoName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{n.ngoName}</p>
                        <p className="truncate text-xs text-muted-foreground">{n.address}</p>
                      </div>
                    </div>
                    <Badge variant={n.isAccepting ? "success" : "secondary"} className="shrink-0">
                      {n.isAccepting ? "Accepting" : "On break"}
                    </Badge>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-xl bg-subtle px-3 py-2">
                      <dt className="text-[11px] text-muted-foreground">Rescues</dt>
                      <dd className="font-semibold tabular-nums">{nf.format(n.rescues)}</dd>
                    </div>
                    <div className="rounded-xl bg-subtle px-3 py-2">
                      <dt className="text-[11px] text-muted-foreground">Coverage</dt>
                      <dd className="font-semibold tabular-nums">{n.operatingRadius} km</dd>
                    </div>
                  </dl>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
