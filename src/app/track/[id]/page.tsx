"use client";

import { use, useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  HeartPulse,
  Navigation,
  Phone,
  Radio,
  SearchX,
  Share2,
  ShieldCheck,
  Siren,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";
import { Channels, Events, type Donation, type PublicReport } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { SeverityBadge, StatusBadge } from "@/components/report/badges";
import { ApiRequestError, fetcher } from "@/lib/api";
import { useChannel, useRealtimeStatus } from "@/lib/realtime";
import { formatDateTime, formatINR, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Stepper } from "./_components/Stepper";
import { Timeline } from "./_components/Timeline";
import { FundCard } from "./_components/FundCard";
import { BeforeAfter } from "./_components/BeforeAfter";
import { Confetti } from "./_components/Confetti";

const TrackingMap = dynamic(() => import("@/components/maps/TrackingMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-[360px] w-full rounded-2xl" />,
});

const CLOSE_TEXT: Record<NonNullable<PublicReport["closeReason"]>, string> = {
  duplicate: "This was a duplicate of another report — that case is being handled.",
  false_alarm: "Responders reached the spot and found no animal in distress.",
  not_found: "Responders couldn't find the animal at the pinned location.",
  other: "The responding team closed this case.",
};

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/** ~25 km/h average urban ambulance speed with a 1.4× road detour factor. */
function etaMinutes(report: PublicReport): number | null {
  if (!report.driver) return null;
  const km = haversineKm(report.driver, report.location);
  return Math.max(1, Math.round(((km * 1.4) / 25) * 60));
}

export default function TrackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const [showNewBanner, setShowNewBanner] = useState(searchParams.get("new") === "1");
  const [burst, setBurst] = useState(0);

  const { data, error, isLoading, mutate } = useSWR<{ report: PublicReport }>(`/api/reports/${id}`, fetcher, {
    refreshInterval: 60_000, // safety net if realtime is unavailable
  });
  const report = data?.report;

  const { data: donationData, isLoading: loadingDonations, mutate: mutateDonations } = useSWR<{ donations: Donation[] }>(
    report?.fundraiser.active ? `/api/reports/${id}/donations` : null,
    fetcher
  );

  useEffect(() => {
    if (!burst) return;
    const t = setTimeout(() => setBurst(0), 6000);
    return () => clearTimeout(t);
  }, [burst]);

  const onDonation = useCallback(
    (payload: { donation: Donation; raised: number; goal: number; donorCount: number }) => {
      mutate(
        (cur) =>
          cur && {
            report: {
              ...cur.report,
              fundraiser: { ...cur.report.fundraiser, raised: payload.raised, goal: payload.goal, donorCount: payload.donorCount },
            },
          },
        { revalidate: false }
      );
      mutateDonations(
        (cur) => ({ donations: [payload.donation, ...(cur?.donations ?? []).filter((d) => d.id !== payload.donation.id)] }),
        { revalidate: false }
      );
      setBurst((b) => b + 1);
      toast(`${payload.donation.sponsorName} pledged ${formatINR(payload.donation.amount)}`, { icon: "💛" });
    },
    [mutate, mutateDonations]
  );

  useChannel(Channels.report(id), {
    [Events.reportUpdated]: (next: PublicReport) => mutate({ report: next }, { revalidate: false }),
    [Events.driverMoved]: (p: { lat: number; lng: number; updatedAt: string }) =>
      mutate(
        (cur) =>
          cur && {
            report: {
              ...cur.report,
              status: cur.report.status === "assigned" ? "en_route" : cur.report.status,
              driver: { lat: p.lat, lng: p.lng, updatedAt: p.updatedAt },
            },
          },
        { revalidate: false }
      ),
    [Events.donation]: onDonation,
  });

  const share = async () => {
    const url = `${window.location.origin}/track/${id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Live cattle rescue · Cowscue", text: "Follow this rescue live", url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success("Tracking link copied");
    } catch {
      /* user cancelled share */
    }
  };

  if (isLoading) return <TrackSkeleton />;

  if (error || !report) {
    const notFound = error instanceof ApiRequestError && error.status === 404;
    return (
      <div className="mx-auto max-w-lg px-4 py-20">
        <EmptyState
          icon={SearchX}
          title={notFound ? "We couldn't find this rescue" : "Couldn't load this rescue"}
          description={
            notFound
              ? "The tracking link may be mistyped or the case may have been removed."
              : "Check your connection and try again."
          }
          action={
            notFound ? (
              <Button asChild variant="outline">
                <Link href="/">Go home</Link>
              </Button>
            ) : (
              <Button variant="outline" onClick={() => mutate()}>
                Retry
              </Button>
            )
          }
        />
      </div>
    );
  }

  const active = report.status === "pending" || report.status === "assigned" || report.status === "en_route";

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-dots mask-fade-b opacity-60" aria-hidden />
      <div className="relative mx-auto max-w-6xl space-y-6 px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        <div className="flex items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href="/">
              <ArrowLeft /> Home
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <LiveIndicator active={active} />
            <Button variant="outline" size="sm" onClick={share}>
              <Share2 /> Share
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {showNewBanner && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-3 rounded-2xl border border-success/30 bg-success/10 p-4"
              role="status"
            >
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
              <div className="flex-1 text-sm">
                <p className="font-medium">Report received — teams are being alerted</p>
                <p className="text-muted-foreground">Keep this page open or share the link. It updates live as the rescue progresses.</p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setShowNewBanner(false)} aria-label="Dismiss">
                <X />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="min-w-0 space-y-6">
            <StatusHero report={report} />

            <Card className="overflow-hidden p-2">
              <TrackingMap cow={report.location} driver={report.driver ?? null} follow />
              {report.driver?.updatedAt && report.status === "en_route" && (
                <p className="px-3 pb-1.5 pt-2.5 text-xs text-muted-foreground">Ambulance position updated {timeAgo(report.driver.updatedAt)}</p>
              )}
            </Card>

            {report.status === "resolved" && report.resolvedImageUrl && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HeartPulse className="size-4 text-success" /> Before & after
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Drag to compare. Proof of rescue uploaded by the team.</p>
                </CardHeader>
                <CardContent>
                  <BeforeAfter before={report.imageUrl} after={report.resolvedImageUrl} />
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Case timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <Timeline events={report.timeline} />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {active && report.firstAid.length > 0 && (
              <Card className="border-primary/25 bg-primary-soft/40">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="size-4 text-primary" /> While you wait
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2.5">
                    {report.firstAid.map((tip, i) => (
                      <li key={i} className="flex gap-3 text-sm">
                        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                          {i + 1}
                        </span>
                        <span className="leading-relaxed">{tip}</span>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="size-3" /> People in danger? Call 112.
                  </p>
                </CardContent>
              </Card>
            )}

            <Card className="overflow-hidden">
              <div className="relative aspect-[4/3] bg-muted">
                <Image src={report.imageUrl} alt="Photo of the reported animal" fill sizes="(max-width: 1024px) 100vw, 380px" className="object-cover" />
                <div className="absolute left-3 top-3 flex gap-1.5">
                  <SeverityBadge severity={report.severity} className="bg-card/90 backdrop-blur" />
                </div>
              </div>
              <CardContent className="space-y-3 pt-5">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={report.status} />
                  <span className="text-xs text-muted-foreground" title={formatDateTime(report.createdAt)}>
                    Reported {timeAgo(report.createdAt)}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">AI assessment</p>
                  <p className="font-medium">{report.injuryType}</p>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{report.description}</p>
                {report.ngoName && (
                  <div className="flex items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm">
                    <ShieldCheck className="size-4 text-primary" />
                    <span>
                      Handled by <span className="font-medium">{report.ngoName}</span>
                      {report.driverName && <span className="text-muted-foreground"> · {report.driverName}</span>}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {report.fundraiser.active && (
              <FundCard
                reportId={report.id}
                fundraiser={report.fundraiser}
                donations={donationData?.donations ?? []}
                loadingDonations={loadingDonations}
              />
            )}
          </div>
        </div>
      </div>
      <Confetti burst={burst} />
    </div>
  );
}

function StatusHero({ report }: { report: PublicReport }) {
  const eta = etaMinutes(report);
  const hero = (() => {
    switch (report.status) {
      case "pending":
        return {
          icon: report.escalationLevel > 0 ? Siren : Radio,
          tone: report.escalationLevel > 0 ? "bg-critical-soft text-critical" : "bg-primary-soft text-primary",
          title: "Finding the nearest rescue team",
          body:
            report.escalationLevel > 0
              ? `No team has accepted yet, so we've widened the search (level ${report.escalationLevel}). More responders are being alerted.`
              : "Partner NGOs near you have been alerted. Most critical cases are accepted within minutes.",
        };
      case "assigned":
        return {
          icon: ShieldCheck,
          tone: "bg-primary-soft text-primary",
          title: `${report.ngoName ?? "A rescue team"} accepted`,
          body: `${report.driverName ?? "Their driver"} is preparing to head out. You'll see the ambulance on the map once they start driving.`,
        };
      case "en_route":
        return {
          icon: Navigation,
          tone: "bg-routine-soft text-routine",
          title: eta ? `Ambulance on the way · ~${eta} min` : "Ambulance on the way",
          body: `${report.driverName ?? "The driver"} from ${report.ngoName ?? "the rescue team"} is heading to the animal's location.`,
        };
      case "resolved":
        return {
          icon: CheckCircle2,
          tone: "bg-success/15 text-success",
          title: "Rescued and safe 💚",
          body: "The animal is now in care. Thank you for speaking up for it.",
        };
      case "closed":
        return {
          icon: XCircle,
          tone: "bg-muted text-muted-foreground",
          title: "Case closed",
          body: report.closeReason ? CLOSE_TEXT[report.closeReason] : CLOSE_TEXT.other,
        };
    }
  })();
  const Icon = hero.icon;

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-6 pt-5 sm:pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${report.status}-${report.escalationLevel}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-start gap-4"
          >
            <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl", hero.tone)}>
              <Icon className="size-6" />
            </span>
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-3xl">{hero.title}</h1>
              <p className="text-pretty text-muted-foreground">{hero.body}</p>
            </div>
          </motion.div>
        </AnimatePresence>
        <Stepper status={report.status} />
        {report.status !== "pending" && report.assignedAt && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            Accepted {Math.max(1, Math.round((new Date(report.assignedAt).getTime() - new Date(report.createdAt).getTime()) / 60000))} min after reporting
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function LiveIndicator({ active }: { active: boolean }) {
  const state = useRealtimeStatus();
  const live = state === "connected" && active;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs text-muted-foreground">
      <span className="relative flex size-2">
        {live && <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />}
        <span className={cn("relative inline-flex size-2 rounded-full", live ? "bg-success" : "bg-muted-foreground/50")} />
      </span>
      {live ? "Live" : active ? "Auto-refresh" : "Final"}
    </span>
  );
}

function TrackSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-16 pt-10 sm:px-6">
      <Skeleton className="h-8 w-40" />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-[360px] w-full rounded-2xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
