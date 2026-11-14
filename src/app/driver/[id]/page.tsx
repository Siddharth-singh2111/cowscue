"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { Suspense, use, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { AnimatePresence, motion } from "motion/react";
import {
  CheckCircle2,
  Clock,
  Crosshair,
  LinkIcon,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Radio,
  ShieldCheck,
  Sparkles,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import { Channels, Events, type OpsReport, type PublicReport } from "@/types";
import { LogoMark } from "@/components/brand/Logo";
import { SeverityBadge, StatusBadge } from "@/components/report/badges";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import { api, ApiRequestError, errorMessage } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { useChannel } from "@/lib/realtime";
import { cn } from "@/lib/utils";
import { ProofDialog } from "@/app/dashboard/_components/ProofDialog";
import { etaMinutes, haversineKm, waLink } from "@/app/dashboard/_components/lib";

const TrackingMap = dynamic(() => import("@/components/maps/TrackingMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-[300px] w-full rounded-2xl" />,
});

const MIN_INTERVAL_MS = 5_000;
const MIN_MOVE_M = 25;

type LatLng = { lat: number; lng: number };
type Fix = LatLng & { accuracy: number };

export default function DriverPortalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<PortalSkeleton />}>
      <DriverPortal id={id} />
    </Suspense>
  );
}

function DriverPortal({ id }: { id: string }) {
  const token = useSearchParams().get("t") ?? "";
  const headers = { "x-driver-token": token };

  const { data, error, isLoading, mutate } = useSWR<{ report: OpsReport }>(
    token ? [`/api/driver/${id}`, token] : null,
    ([url]: [string]) => api<{ report: OpsReport }>(url, { headers }),
    { refreshInterval: 30_000, shouldRetryOnError: false }
  );
  const report = data?.report;

  // Keep status in sync when the NGO resolves/closes from the dashboard.
  useChannel(report ? Channels.report(id) : null, {
    [Events.reportUpdated]: (pub: PublicReport) =>
      void mutate((prev) => (prev ? { report: { ...prev.report, ...pub } } : prev), { revalidate: false }),
  });

  // ── Live tracking ────────────────────────────────────────────────────────
  const [tracking, setTracking] = useState(false);
  const [fix, setFix] = useState<Fix | null>(null);
  const [lastSentAt, setLastSentAt] = useState<number | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);
  const lastSent = useRef<{ at: number; pos: LatLng } | null>(null);
  const inflight = useRef(false);
  const wakeLock = useRef<WakeLockSentinel | null>(null);
  const [awake, setAwake] = useState(false);

  const releaseWakeLock = useCallback(() => {
    void wakeLock.current?.release().catch(() => undefined);
    wakeLock.current = null;
    setAwake(false);
  }, []);

  const acquireWakeLock = useCallback(async () => {
    if (!("wakeLock" in navigator) || wakeLock.current) return;
    try {
      const sentinel = await navigator.wakeLock.request("screen");
      wakeLock.current = sentinel;
      setAwake(true);
      sentinel.addEventListener("release", () => {
        wakeLock.current = null;
        setAwake(false);
      });
    } catch {
      /* not allowed (e.g. low battery) — tracking still works */
    }
  }, []);

  const stopTracking = useCallback(
    (message?: string) => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      setTracking(false);
      releaseWakeLock();
      if (message) toast.message(message);
    },
    [releaseWakeLock]
  );

  const send = useCallback(
    async (pos: Fix) => {
      inflight.current = true;
      try {
        await api(`/api/driver/${id}/location`, {
          method: "POST",
          headers: { "x-driver-token": token },
          json: { latitude: pos.lat, longitude: pos.lng, accuracy: Math.round(pos.accuracy) },
        });
        lastSent.current = { at: Date.now(), pos };
        setLastSentAt(Date.now());
        setSendError(null);
        void mutate(
          (prev) =>
            prev && {
              report: {
                ...prev.report,
                status: prev.report.status === "assigned" ? "en_route" : prev.report.status,
                driver: { lat: pos.lat, lng: pos.lng, updatedAt: new Date().toISOString() },
              },
            },
          { revalidate: shouldRevalidateAfterFix(data?.report) }
        );
      } catch (err) {
        if (err instanceof ApiRequestError && (err.status === 409 || err.status === 401)) {
          stopTracking(err.status === 409 ? "This mission is no longer active — tracking stopped." : "Your driver link has expired.");
          void mutate();
        } else {
          setSendError(errorMessage(err, "Couldn't send your location — retrying."));
        }
      } finally {
        inflight.current = false;
      }
    },
    [id, token, mutate, stopTracking, data?.report]
  );

  const startTracking = () => {
    if (!("geolocation" in navigator)) return toast.error("This phone doesn't support GPS in the browser.");
    setTracking(true);
    void acquireWakeLock();
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        const next: Fix = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy };
        setFix(next);
        const prev = lastSent.current;
        const elapsed = prev ? Date.now() - prev.at : Infinity;
        const moved = prev ? haversineKm(prev.pos, next) * 1000 : Infinity;
        // Throttle: at most every 5s, or sooner (≥1s) when the ambulance moved more than 25m.
        if (!inflight.current && (elapsed >= MIN_INTERVAL_MS || (moved > MIN_MOVE_M && elapsed >= 1_000))) void send(next);
      },
      (err) => {
        stopTracking();
        toast.error(err.code === 1 ? "Location permission denied. Allow it in your browser settings." : "Lost GPS signal. Tap start again.");
      },
      { enableHighAccuracy: true, maximumAge: 2_000, timeout: 20_000 }
    );
  };

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && tracking) void acquireWakeLock();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [tracking, acquireWakeLock]);

  useEffect(
    () => () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      releaseWakeLock();
    },
    [releaseWakeLock]
  );

  // Re-render "sent Xs ago" text.
  const [, tick] = useState(0);
  useEffect(() => {
    if (!tracking) return;
    const t = setInterval(() => tick((n) => n + 1), 5_000);
    return () => clearInterval(t);
  }, [tracking]);

  const [proofOpen, setProofOpen] = useState(false);
  const resolve = async (input: { resolvedImageUrl: string; notes?: string }) => {
    const res = await api<{ report: OpsReport }>(`/api/driver/${id}/resolve`, { method: "POST", headers, json: input });
    stopTracking();
    void mutate({ report: res.report }, { revalidate: false });
    toast.success("Rescue complete. Thank you! 💚");
  };

  // ── Render states ────────────────────────────────────────────────────────
  if (!token || (error instanceof ApiRequestError && error.status === 401)) {
    return (
      <PortalMessage
        icon={LinkIcon}
        title="Driver link invalid or expired"
        body="Ask your NGO coordinator to resend the mission link from the command center."
      />
    );
  }
  if (error) {
    return (
      <PortalMessage
        icon={MapPin}
        title={error instanceof ApiRequestError && error.status === 404 ? "Mission not found" : "Couldn't load the mission"}
        body={errorMessage(error)}
        action={<Button onClick={() => mutate()}>Try again</Button>}
      />
    );
  }
  if (isLoading || !report) return <PortalSkeleton />;

  const cow = report.location;
  const me: LatLng | null = fix ?? report.driver ?? null;
  const km = me ? haversineKm(me, cow) : null;
  const done = report.status === "resolved" || report.status === "closed";
  const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${cow.lat},${cow.lng}&travelmode=driving`;

  return (
    <div className="min-h-dvh bg-background pb-36">
      <header className="sticky top-0 z-[900] border-b bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-xl items-center gap-3 px-4">
          <LogoMark className="size-7" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-tight">Rescue mission</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {report.ngoName ?? "Cowscue"} · {report.driverName ?? "Driver"}
            </p>
          </div>
          <StatusBadge status={report.status} />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-xl space-y-4 px-4 pt-4">
        {done ? (
          <Card className="overflow-hidden">
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
              <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="grid size-16 place-items-center rounded-full bg-success text-success-foreground">
                {report.status === "resolved" ? <ShieldCheck className="size-8" /> : <CheckCircle2 className="size-8" />}
              </motion.div>
              <h1 className="text-2xl font-semibold tracking-tight">{report.status === "resolved" ? "Animal is safe" : "Mission closed"}</h1>
              <p className="max-w-xs text-sm text-muted-foreground">
                {report.status === "resolved"
                  ? "Great work. The citizen has been notified and can see the proof photo on their tracker."
                  : "The coordinator closed this case. No further action is needed."}
              </p>
            </div>
            {report.resolvedImageUrl && (
              <div className="relative aspect-[4/3] w-full bg-muted">
                <Image src={report.resolvedImageUrl} alt="Rescue proof" fill sizes="576px" className="object-cover" />
              </div>
            )}
          </Card>
        ) : (
          <>
            {/* Distance / ETA */}
            <div className="grid grid-cols-3 gap-2">
              <Metric label="Distance" value={km != null ? (km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`) : "—"} />
              <Metric label="ETA" value={km != null ? `~${etaMinutes(km)} min` : "—"} />
              <Metric
                label="GPS"
                value={fix ? `±${Math.round(fix.accuracy)} m` : tracking ? "…" : "Off"}
                tone={fix && fix.accuracy > 100 ? "text-moderate" : undefined}
              />
            </div>

            <Card className="overflow-hidden p-0">
              <TrackingMap cow={cow} driver={me} follow={tracking} className="h-[300px] rounded-none" />
              <div className="p-3">
                <Button asChild size="lg" variant="inverse" className="w-full">
                  <a href={navUrl} target="_blank" rel="noopener noreferrer">
                    <Navigation /> Navigate in Google Maps
                  </a>
                </Button>
              </div>
            </Card>
          </>
        )}

        {/* Mission card */}
        <Card className="overflow-hidden">
          <div className="flex gap-4 p-4">
            <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-muted">
              <Image src={report.imageUrl} alt={report.injuryType} fill sizes="96px" className="object-cover" />
            </div>
            <div className="min-w-0 space-y-1.5">
              <SeverityBadge severity={report.severity} />
              <p className="font-semibold leading-snug">{report.injuryType}</p>
              <p className="line-clamp-3 text-sm text-muted-foreground">{report.description}</p>
              <p className="text-xs text-muted-foreground">Reported {timeAgo(report.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 border-t px-4 py-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Reporter</p>
              <p className="truncate text-sm font-medium">{report.reporterName}</p>
            </div>
            {report.reporterPhone && (
              <div className="flex gap-2">
                <Button asChild size="icon" variant="outline" aria-label="Call reporter">
                  <a href={`tel:${report.reporterPhone}`}>
                    <Phone />
                  </a>
                </Button>
                <Button asChild size="icon" variant="outline" aria-label="WhatsApp reporter">
                  <a href={waLink(report.reporterPhone)} target="_blank" rel="noopener noreferrer">
                    <MessageCircle />
                  </a>
                </Button>
              </div>
            )}
          </div>
        </Card>

        {report.firstAid.length > 0 && !done && (
          <Card className="p-4">
            <p className="mb-2 flex items-center gap-1.5 text-sm font-medium">
              <Sparkles className="size-4 text-primary" /> On arrival
            </p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {report.firstAid.map((tip) => (
                <li key={tip} className="flex gap-2">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-primary" />
                  {tip}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </main>

      {/* Sticky action bar — large targets for one-handed use */}
      {!done && (
        <div className="fixed inset-x-0 bottom-0 z-[900] border-t bg-background/95 backdrop-blur-xl safe-bottom">
          <div className="mx-auto max-w-xl space-y-2 p-3">
            <AnimatePresence>
              {tracking && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className={cn("flex items-center justify-center gap-2 text-xs", sendError ? "text-moderate" : "text-muted-foreground")}
                >
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-70" />
                    <span className="relative inline-flex size-2 rounded-full bg-success" />
                  </span>
                  {sendError ?? (lastSentAt ? `Sharing live location · sent ${timeAgo(new Date(lastSentAt))}` : "Waiting for GPS fix…")}
                  {awake && <span className="hidden sm:inline">· screen kept awake</span>}
                </motion.p>
              )}
            </AnimatePresence>
            <div className="grid grid-cols-2 gap-2">
              {tracking ? (
                <Button size="xl" variant="outline" className="h-14 rounded-2xl" onClick={() => stopTracking("Location sharing paused.")}>
                  <Square className="fill-current" /> Stop sharing
                </Button>
              ) : (
                <Button size="xl" variant="default" className="h-14 rounded-2xl" onClick={startTracking}>
                  {lastSentAt ? <Crosshair /> : <Radio />} {lastSentAt ? "Resume" : "Start tracking"}
                </Button>
              )}
              <Button size="xl" variant="success" className="h-14 rounded-2xl" onClick={() => setProofOpen(true)}>
                <ShieldCheck /> Animal safe
              </Button>
            </div>
          </div>
        </div>
      )}

      <ProofDialog
        open={proofOpen}
        onOpenChange={setProofOpen}
        onSubmit={resolve}
        description="Take a photo of the animal in your care. The citizen and NGO will see it immediately."
      />
    </div>
  );
}

function shouldRevalidateAfterFix(r?: OpsReport) {
  // Refetch once after the first fix so the timeline/status reflect the server transition.
  return r?.status === "assigned";
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card className="p-3 text-center">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-lg font-semibold tabular-nums tracking-tight", tone)}>{value}</p>
    </Card>
  );
}

function PortalMessage({ icon: Icon, title, body, action }: { icon: typeof Clock; title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
          <Icon className="size-6" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        <div className="mt-6 flex justify-center gap-2">
          {action}
          <Button asChild variant="outline">
            <Link href="/">Go to Cowscue</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function PortalSkeleton() {
  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 pt-20">
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
      <Skeleton className="h-[360px]" />
      <Skeleton className="h-40" />
    </div>
  );
}
