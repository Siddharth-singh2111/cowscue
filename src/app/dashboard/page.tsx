"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { useAuth } from "@clerk/nextjs";
import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  Flame,
  Inbox,
  LayoutList,
  Map as MapIcon,
  Navigation,
  Radar,
  Route as RouteIcon,
  Settings2,
  Siren,
  Timer,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Channels, Events, type NgoProfile, type NgoStats, type OpsReport } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/empty-state";
import { useMe } from "@/hooks/useMe";
import { api, errorMessage } from "@/lib/api";
import { formatMinutes } from "@/lib/format";
import { useChannel, useRealtimeStatus } from "@/lib/realtime";
import { cn } from "@/lib/utils";
import { Analytics } from "./_components/Analytics";
import { CaseCard } from "./_components/CaseCard";
import { CaseSheet } from "./_components/CaseSheet";
import { SettingsDialog } from "./_components/dialogs";
import { Gate } from "./_components/Gate";
import { haversineKm, isActive, isDone, sortQueue } from "./_components/lib";

const OpsMap = dynamic(() => import("@/components/maps/OpsMap"), {
  ssr: false,
  loading: () => <Skeleton className="size-full rounded-none" />,
});

type LatLng = { lat: number; lng: number };
type QueueTab = "queue" | "active" | "done";

export default function DashboardPage() {
  const { me, loading } = useMe();
  if (loading || !me) return <DashboardSkeleton />;
  if (me.role !== "ngo" && me.role !== "superadmin") return <Gate signedIn={me.signedIn} />;
  return <CommandCenter isAdmin={me.role === "superadmin"} ngoName={me.ngo?.ngoName} initialAccepting={me.ngo?.isAccepting ?? true} />;
}

function CommandCenter({ isAdmin, ngoName, initialAccepting }: { isAdmin: boolean; ngoName?: string; initialAccepting: boolean }) {
  const { userId } = useAuth();
  const { refresh: refreshMe } = useMe();

  // ── Area of operations ───────────────────────────────────────────────────
  const profileSWR = useSWR<{ ngo: NgoProfile }>(isAdmin ? null : "/api/ngo/profile", { shouldRetryOnError: false });
  const profile = profileSWR.data?.ngo;
  const base = useMemo<LatLng | null>(
    () =>
      profile?.operatingLatitude != null && profile.operatingLongitude != null
        ? { lat: profile.operatingLatitude, lng: profile.operatingLongitude }
        : null,
    [profile?.operatingLatitude, profile?.operatingLongitude]
  );
  const [center, setCenter] = useState<LatLng | null>(null);
  const [areaReady, setAreaReady] = useState(false);
  const [radius, setRadius] = useState(15);
  const [queryRadius, setQueryRadius] = useState(15);
  const profileSettled = isAdmin || profileSWR.data !== undefined || profileSWR.error !== undefined;

  useEffect(() => {
    if (areaReady || !profileSettled) return;
    if (profile?.operatingRadius) {
      setRadius(profile.operatingRadius);
      setQueryRadius(profile.operatingRadius);
    }
    if (base) {
      setCenter(base);
      setAreaReady(true);
      return;
    }
    if (!("geolocation" in navigator)) {
      setAreaReady(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setAreaReady(true);
      },
      () => setAreaReady(true),
      { timeout: 8000, maximumAge: 60_000 }
    );
  }, [areaReady, profileSettled, profile, base]);

  // ── Feed ─────────────────────────────────────────────────────────────────
  const feedKey = useMemo(() => {
    if (!areaReady) return null;
    const p = new URLSearchParams({ radius: String(queryRadius) });
    if (center) {
      p.set("lat", center.lat.toFixed(6));
      p.set("lng", center.lng.toFixed(6));
    }
    return `/api/reports?${p}`;
  }, [areaReady, center, queryRadius]);

  const feed = useSWR<{ reports: OpsReport[] }>(feedKey, { refreshInterval: 60_000, keepPreviousData: true });
  const stats = useSWR<{ stats: NgoStats }>("/api/ngo/stats", { refreshInterval: 60_000 });

  const reports = useMemo(
    () => (feed.data?.reports ?? []).map((r) => ({ ...r, isMine: Boolean(userId && r.ngoUserId === userId) })),
    [feed.data, userId]
  );

  const withDistance = useCallback(
    (r: OpsReport): OpsReport => ({
      ...r,
      distanceKm: center ? Math.round(haversineKm(center, r.location) * 10) / 10 : r.distanceKm,
    }),
    [center]
  );

  const upsert = useCallback(
    (incoming: OpsReport, opts: { onlyIfInArea?: boolean } = {}) => {
      void feed.mutate(
        (prev) => {
          const list = prev?.reports ?? [];
          const idx = list.findIndex((r) => r.id === incoming.id);
          if (idx >= 0) {
            const next = [...list];
            next[idx] = { ...withDistance(incoming), distanceKm: list[idx]!.distanceKm ?? withDistance(incoming).distanceKm };
            return { reports: next };
          }
          if (opts.onlyIfInArea && center && haversineKm(center, incoming.location) > queryRadius) return prev;
          return { reports: [withDistance(incoming), ...list] };
        },
        { revalidate: false }
      );
    },
    [feed, withDistance, center, queryRadius]
  );

  // ── Realtime ─────────────────────────────────────────────────────────────
  const realtime = useRealtimeStatus();
  const [flashId, setFlashId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const openCase = useCallback((id: string) => {
    setSelectedId(id);
    setSheetOpen(true);
  }, []);

  useChannel(Channels.ngoFeed, {
    [Events.reportCreated]: (r: OpsReport) => {
      const inArea = !center || haversineKm(center, r.location) <= queryRadius;
      upsert(r, { onlyIfInArea: true });
      if (!inArea) return;
      if (r.severity === "CRITICAL" && !r.duplicateOf) {
        setFlashId(r.id);
        setTimeout(() => setFlashId((f) => (f === r.id ? null : f)), 6000);
        toast.error("Critical rescue reported nearby", {
          description: r.injuryType,
          action: { label: "View", onClick: () => openCase(r.id) },
          duration: 12_000,
        });
      } else {
        toast("New report in your area", { description: r.injuryType, action: { label: "View", onClick: () => openCase(r.id) } });
      }
    },
    [Events.reportUpdated]: (r: OpsReport) => upsert(r, { onlyIfInArea: true }),
    [Events.driverMoved]: (d: { id: string; lat: number; lng: number; updatedAt: string }) => {
      void feed.mutate(
        (prev) =>
          prev && {
            reports: prev.reports.map((r) => (r.id === d.id ? { ...r, driver: { lat: d.lat, lng: d.lng, updatedAt: d.updatedAt } } : r)),
          },
        { revalidate: false }
      );
    },
  });

  // ── Derived lists ────────────────────────────────────────────────────────
  const pending = useMemo(() => reports.filter((r) => r.status === "pending").sort(sortQueue), [reports]);
  const active = useMemo(
    () =>
      reports
        .filter(isActive)
        .sort((a, b) => Number(b.isMine) - Number(a.isMine) || new Date(b.assignedAt ?? b.createdAt).getTime() - new Date(a.assignedAt ?? a.createdAt).getTime()),
    [reports]
  );
  const done = useMemo(
    () => reports.filter(isDone).sort((a, b) => new Date(b.resolvedAt ?? b.createdAt).getTime() - new Date(a.resolvedAt ?? a.createdAt).getTime()),
    [reports]
  );
  const selectedReport = reports.find((r) => r.id === selectedId) ?? null;

  // ── UI state ─────────────────────────────────────────────────────────────
  const [view, setView] = useState<"ops" | "analytics">("ops");
  const [tab, setTab] = useState<QueueTab>("queue");
  const [mobilePanel, setMobilePanel] = useState<"list" | "map">("list");
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ── Accepting toggle (optimistic) ────────────────────────────────────────
  const [accepting, setAccepting] = useState(initialAccepting);
  const [togglingAccept, setTogglingAccept] = useState(false);
  const toggleAccepting = async (next: boolean) => {
    setAccepting(next);
    setTogglingAccept(true);
    try {
      await api("/api/ngo/status", { method: "PATCH", json: { isAccepting: next } });
      toast.success(next ? "You're accepting new rescues." : "On break — dispatch will skip your team.");
      void refreshMe();
    } catch (err) {
      setAccepting(!next);
      toast.error(errorMessage(err));
    } finally {
      setTogglingAccept(false);
    }
  };

  // ── Route planning ───────────────────────────────────────────────────────
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [route, setRoute] = useState<{ geometry: GeoJSON.Geometry; km: number; min: number; order: string[] } | null>(null);
  const [routing, setRouting] = useState(false);
  const toggleSelection = useCallback((id: string) => {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setRoute(null);
  }, []);
  const selectedStops = reports.filter((r) => selection.has(r.id));
  const origin = base ?? center;

  const orderedStops = route ? route.order.map((id) => selectedStops.find((s) => s.id === id)).filter((s): s is OpsReport => !!s) : selectedStops;

  const optimiseRoute = async () => {
    if (!origin) return toast.warning("Set your operating centre in Settings (or allow location) to plan routes.");
    setRouting(true);
    try {
      const coords = [origin, ...selectedStops.map((s) => s.location)].map((p) => `${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(";");
      const res = await fetch(`https://router.project-osrm.org/trip/v1/driving/${coords}?source=first&roundtrip=false&geometries=geojson&overview=full`);
      const data = (await res.json()) as {
        code: string;
        trips?: { geometry: GeoJSON.Geometry; distance: number; duration: number }[];
        waypoints?: { waypoint_index: number }[];
      };
      if (data.code !== "Ok" || !data.trips?.[0]) throw new Error("Some stops aren't reachable by road.");
      const order = selectedStops
        .map((s, i) => ({ id: s.id, idx: data.waypoints?.[i + 1]?.waypoint_index ?? i }))
        .sort((a, b) => a.idx - b.idx)
        .map((s) => s.id);
      const trip = data.trips[0];
      setRoute({ geometry: trip.geometry, km: Math.round(trip.distance / 100) / 10, min: Math.round(trip.duration / 60), order });
      setMobilePanel("map");
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't optimise the route."));
    } finally {
      setRouting(false);
    }
  };

  const gmapsUrl = () => {
    const stops = orderedStops.map((s) => `${s.location.lat},${s.location.lng}`);
    return `https://www.google.com/maps/dir/${origin ? `${origin.lat},${origin.lng}/` : ""}${stops.join("/")}`;
  };
  const driverMessage = () =>
    `🚑 Cowscue rescue run — ${orderedStops.length} stop${orderedStops.length === 1 ? "" : "s"}\n\n` +
    orderedStops.map((s, i) => `${i + 1}. ${s.severity} · ${s.injuryType}`).join("\n") +
    `\n\nTurn-by-turn route:\n${gmapsUrl()}`;

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const s = stats.data?.stats;
  const critical = pending.filter((r) => r.severity === "CRITICAL").length;
  const kpis = [
    { label: "Awaiting a team", value: pending.length, sub: critical ? `${critical} critical` : "in your area", icon: Inbox, tone: critical ? "text-critical" : "" },
    { label: "Your active rescues", value: active.filter((r) => r.isMine).length, sub: `${active.length} active in area`, icon: Activity, tone: "" },
    { label: "Rescued · 30 days", value: s ? s.last30.reduce((n, d) => n + d.resolved, 0) : "—", sub: s ? `${s.resolved} all-time` : "", icon: CheckCircle2, tone: "" },
    { label: "Median response", value: formatMinutes(s?.medianResponseMinutes), sub: "report → accepted", icon: Timer, tone: "" },
  ];

  const tabLists: Record<QueueTab, OpsReport[]> = { queue: pending, active, done };
  const list = tabLists[tab];
  const feedLoading = !feed.data && (feed.isLoading || !areaReady);

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col gap-4 px-3 py-4 sm:px-6 lg:h-[calc(100dvh-4rem)] safe-bottom">
      {/* Header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-inverse text-inverse-foreground">
            <Radar className="size-5" />
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
              {isAdmin ? "Platform command center" : ngoName ?? "Command center"}
              <LiveDot state={realtime} />
            </h1>
            <p className="text-xs text-muted-foreground">
              {center ? `Monitoring ${queryRadius} km around ${base ? "your base" : "your location"}` : "Monitoring all regions"} · {reports.length} cases
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as "ops" | "analytics")}>
            <TabsList>
              <TabsTrigger value="ops">
                <MapIcon /> Operations
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <BarChart3 /> Analytics
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {!isAdmin && (
            <label
              className={cn(
                "flex h-10 items-center gap-2.5 rounded-full border bg-card pl-4 pr-1.5 text-sm font-medium",
                !accepting && "border-moderate/40 bg-moderate-soft"
              )}
            >
              {accepting ? "Accepting rescues" : "On break"}
              <Switch checked={accepting} onCheckedChange={toggleAccepting} disabled={togglingAccept} aria-label="Accepting rescues" />
            </label>
          )}
          <Button variant="outline" size="icon" onClick={() => setSettingsOpen(true)} aria-label="Workspace settings">
            <Settings2 />
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid shrink-0 grid-cols-2 gap-2.5 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="flex items-center gap-3 p-3.5">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
              <k.icon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">{k.label}</p>
              <p className="flex items-baseline gap-2">
                <span className="text-xl font-semibold tabular-nums tracking-tight">{k.value}</span>
                <span className={cn("truncate text-[11px] text-muted-foreground", k.tone)}>{k.sub}</span>
              </p>
            </div>
          </Card>
        ))}
      </div>

      {view === "analytics" ? (
        <div className="flex-1 overflow-y-auto pb-6 scrollbar-thin">
          <Analytics stats={s} reports={reports} loading={stats.isLoading} />
        </div>
      ) : (
        <>
          {/* Mobile list/map switch */}
          <div className="lg:hidden">
            <Tabs value={mobilePanel} onValueChange={(v) => setMobilePanel(v as "list" | "map")}>
              <TabsList className="w-full">
                <TabsTrigger value="list">
                  <LayoutList /> Cases
                </TabsTrigger>
                <TabsTrigger value="map">
                  <MapIcon /> Map
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[minmax(380px,440px)_1fr]">
            {/* Queue */}
            <Card className={cn("flex min-h-[60dvh] flex-col overflow-hidden lg:min-h-0", mobilePanel === "map" && "hidden lg:flex")}>
              <div className="space-y-3 border-b p-3">
                <Tabs value={tab} onValueChange={(v) => setTab(v as QueueTab)}>
                  <TabsList className="w-full">
                    <TabsTrigger value="queue">
                      Queue <Count n={pending.length} hot={critical > 0} />
                    </TabsTrigger>
                    <TabsTrigger value="active">
                      Active <Count n={active.length} />
                    </TabsTrigger>
                    <TabsTrigger value="done">
                      Done <Count n={done.length} />
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="flex items-center gap-3 px-1">
                  <span className="shrink-0 text-xs text-muted-foreground">Radius</span>
                  <Slider
                    value={[radius]}
                    min={1}
                    max={100}
                    step={1}
                    disabled={!center}
                    onValueChange={(v) => setRadius(v[0] ?? 15)}
                    onValueCommit={(v) => setQueryRadius(v[0] ?? 15)}
                    aria-label="Search radius in kilometres"
                  />
                  <span className="w-12 shrink-0 text-right font-mono text-xs">{radius} km</span>
                </div>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto p-3 pb-24 scrollbar-thin">
                {feedLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-[104px]" />)
                ) : feed.error ? (
                  <EmptyState icon={X} title="Couldn't load cases" description={errorMessage(feed.error)} action={<Button variant="outline" size="sm" onClick={() => feed.mutate()}>Retry</Button>} />
                ) : list.length === 0 ? (
                  <EmptyState
                    icon={tab === "queue" ? CheckCircle2 : tab === "active" ? Siren : Inbox}
                    title={tab === "queue" ? "All clear" : tab === "active" ? "No active rescues" : "Nothing here yet"}
                    description={
                      tab === "queue"
                        ? "No animals are waiting for a team in this area. New reports appear here instantly."
                        : tab === "active"
                          ? "Accepted cases appear here while a team is on the way."
                          : "Rescued and closed cases from the last 30 days."
                    }
                  />
                ) : (
                  <AnimatePresence initial={false}>
                    {list.map((r) => (
                      <motion.div key={r.id} layout="position" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                        <CaseCard
                          report={r}
                          selected={r.id === selectedId}
                          checked={selection.has(r.id)}
                          flash={r.id === flashId}
                          onOpen={openCase}
                          onToggle={toggleSelection}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </Card>

            {/* Map */}
            <Card className={cn("relative min-h-[60dvh] overflow-hidden p-0 lg:min-h-0", mobilePanel === "list" && "hidden lg:block")}>
              <OpsMap
                reports={reports}
                selectedId={selectedId ?? undefined}
                onSelect={openCase}
                center={center}
                radiusKm={center ? radius : undefined}
                base={base}
                route={route?.geometry}
                showHeatmap={showHeatmap}
                className="absolute inset-0"
              />
              <div className="pointer-events-none absolute inset-x-3 top-3 z-[500] flex items-start justify-between gap-2">
                <Button
                  size="sm"
                  variant={showHeatmap ? "default" : "outline"}
                  className="pointer-events-auto shadow-[var(--shadow-soft)]"
                  onClick={() => setShowHeatmap((h) => !h)}
                  aria-pressed={showHeatmap}
                >
                  <Flame /> Heatmap
                </Button>
                {route && (
                  <div className="pointer-events-auto flex items-center gap-2 rounded-full border bg-card/95 py-1 pl-3 pr-1 text-xs shadow-[var(--shadow-soft)] backdrop-blur">
                    <RouteIcon className="size-3.5 text-[#7c3aed]" />
                    <span className="font-medium">{route.km} km</span>
                    <span className="text-muted-foreground">~{formatMinutes(route.min)}</span>
                    <Button size="icon-sm" variant="ghost" className="size-6" onClick={() => setRoute(null)} aria-label="Clear route">
                      <X className="size-3.5" />
                    </Button>
                  </div>
                )}
              </div>
              <div className="pointer-events-none absolute bottom-3 left-3 z-[500] hidden gap-3 rounded-full border bg-card/90 px-3 py-1.5 text-[11px] text-muted-foreground shadow-[var(--shadow-soft)] backdrop-blur sm:flex">
                <Legend color="var(--critical)" label="Critical" />
                <Legend color="var(--moderate)" label="Moderate" />
                <Legend color="var(--routine)" label="Routine" />
                <span>🚑 Ambulance</span>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Route selection bar */}
      <AnimatePresence>
        {selection.size > 0 && view === "ops" && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 34 }}
            className="fixed inset-x-3 bottom-4 z-[950] mx-auto flex max-w-2xl flex-wrap items-center gap-2 rounded-2xl border bg-card/95 p-2 pl-4 shadow-[var(--shadow-lift)] backdrop-blur-xl safe-bottom"
            role="region"
            aria-label="Route planner"
          >
            <span className="mr-auto text-sm font-medium">
              {selection.size} stop{selection.size === 1 ? "" : "s"} selected
            </span>
            <Button size="sm" variant="outline" onClick={optimiseRoute} loading={routing} disabled={selection.size < 2}>
              {!routing && <RouteIcon />} Optimise
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={gmapsUrl()} target="_blank" rel="noopener noreferrer">
                <Navigation /> Google Maps
              </a>
            </Button>
            <Button size="sm" variant="success" asChild>
              <a href={`https://wa.me/?text=${encodeURIComponent(driverMessage())}`} target="_blank" rel="noopener noreferrer">
                Send to driver
              </a>
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="Clear selection"
              onClick={() => {
                setSelection(new Set());
                setRoute(null);
              }}
            >
              <X />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <CaseSheet
        report={selectedReport}
        open={sheetOpen && !!selectedReport}
        onOpenChange={setSheetOpen}
        onUpdate={(r) => {
          upsert(r);
          void stats.mutate();
        }}
      />
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        profile={profile}
        onSaved={(ngo) => {
          void profileSWR.mutate({ ngo }, { revalidate: false });
          void refreshMe();
          if (ngo.operatingLatitude != null && ngo.operatingLongitude != null) {
            setCenter({ lat: ngo.operatingLatitude, lng: ngo.operatingLongitude });
          }
          setRadius(ngo.operatingRadius);
          setQueryRadius(ngo.operatingRadius);
        }}
      />
    </div>
  );
}

function Count({ n, hot }: { n: number; hot?: boolean }) {
  return (
    <span className={cn("rounded-full px-1.5 text-[10px] tabular-nums", hot ? "bg-critical text-white" : "bg-muted-foreground/15")}>{n}</span>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function LiveDot({ state }: { state: string }) {
  const live = state === "connected";
  const label = live ? "Live" : state === "unavailable" ? "Polling" : state === "connecting" || state === "initialized" ? "Connecting" : "Offline";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
        live ? "bg-success/12 text-success" : "bg-muted text-muted-foreground"
      )}
      title={live ? "Receiving updates in real time" : "Realtime unavailable — refreshing every minute"}
    >
      <span className="relative flex size-1.5">
        {live && <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />}
        <span className="relative inline-flex size-1.5 rounded-full bg-current" />
      </span>
      {label}
    </span>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4 px-3 py-4 sm:px-6">
      <Skeleton className="h-12 w-72" />
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[68px]" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[440px_1fr]">
        <Skeleton className="h-[60dvh]" />
        <Skeleton className="hidden h-[60dvh] lg:block" />
      </div>
    </div>
  );
}
