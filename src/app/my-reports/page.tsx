"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import useSWR from "swr";
import { SignInButton, useAuth } from "@clerk/nextjs";
import { motion } from "motion/react";
import { Award, ChevronRight, Copy, HeartHandshake, ListChecks, Plus, Radio, Sparkles } from "lucide-react";
import type { CitizenReport } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SeverityBadge, StatusBadge } from "@/components/report/badges";
import { fetcher } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MineResponse {
  reports: CitizenReport[];
  stats: { totalReported: number; rescued: number; active: number; karma: number };
}

type Filter = "all" | "active" | "rescued" | "closed";

const TIERS = [
  { name: "Helper", min: 0 },
  { name: "Rescuer", min: 3 },
  { name: "Protector", min: 10 },
  { name: "Guardian", min: 25 },
] as const;

function tierFor(rescued: number) {
  let idx = 0;
  TIERS.forEach((t, i) => {
    if (rescued >= t.min) idx = i;
  });
  const current = TIERS[idx]!;
  const next = TIERS[idx + 1];
  const pct = next ? Math.round(((rescued - current.min) / (next.min - current.min)) * 100) : 100;
  return { current, next, pct };
}

export default function MyReportsPage() {
  const { isLoaded, isSignedIn } = useAuth();

  if (isLoaded && !isSignedIn) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20">
        <EmptyState
          icon={ListChecks}
          title="Sign in to see your reports"
          description="Track every rescue you've started, your karma, and your badge progress."
          action={
            <SignInButton mode="modal">
              <Button>Sign in</Button>
            </SignInButton>
          }
        />
      </div>
    );
  }

  return <MyReports enabled={Boolean(isLoaded && isSignedIn)} />;
}

function MyReports({ enabled }: { enabled: boolean }) {
  const [filter, setFilter] = useState<Filter>("all");
  const { data, error, isLoading, mutate } = useSWR<MineResponse>(enabled ? "/api/reports/mine" : null, fetcher);

  const filtered = useMemo(() => {
    const reports = data?.reports ?? [];
    switch (filter) {
      case "active":
        return reports.filter((r) => r.status === "pending" || r.status === "assigned" || r.status === "en_route");
      case "rescued":
        return reports.filter((r) => r.status === "resolved");
      case "closed":
        return reports.filter((r) => r.status === "closed");
      default:
        return reports;
    }
  }, [data, filter]);

  const stats = data?.stats;
  const tier = tierFor(stats?.rescued ?? 0);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6">
      <PageHeader
        eyebrow="Your impact"
        title="My reports"
        description="Every rescue you've started, live."
        actions={
          <Button asChild>
            <Link href="/report">
              <Plus /> New report
            </Link>
          </Button>
        }
      />

      {/* Stats + tier */}
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Karma", value: stats?.karma, icon: Sparkles, accent: "text-primary" },
            { label: "Rescued", value: stats?.rescued, icon: HeartHandshake, accent: "text-success" },
            { label: "Active", value: stats?.active, icon: Radio, accent: "text-routine" },
            { label: "Reported", value: stats?.totalReported, icon: ListChecks, accent: "text-muted-foreground" },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="h-full p-4">
                <s.icon className={cn("size-4", s.accent)} />
                {isLoading || !stats ? (
                  <Skeleton className="mt-3 h-8 w-14" />
                ) : (
                  <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight">{s.value}</p>
                )}
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        <Card className="p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary">
              <Award className="size-5" />
            </span>
            <div>
              <p className="text-xs text-muted-foreground">Current badge</p>
              <p className="font-semibold">{tier.current.name}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Progress value={tier.pct} aria-label="Progress to next badge" />
            <p className="text-xs text-muted-foreground">
              {tier.next
                ? `${tier.next.min - (stats?.rescued ?? 0)} more rescue${tier.next.min - (stats?.rescued ?? 0) === 1 ? "" : "s"} to ${tier.next.name}`
                : "Highest badge reached — thank you!"}
            </p>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList className="w-full sm:w-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="rescued">Rescued</TabsTrigger>
            <TabsTrigger value="closed">Closed</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading || !enabled ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={ListChecks}
            title="Couldn't load your reports"
            description="Please check your connection."
            action={
              <Button variant="outline" onClick={() => mutate()}>
                Retry
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={HeartHandshake}
            title={filter === "all" ? "No reports yet" : "Nothing here"}
            description={filter === "all" ? "Spotted an injured cow? One photo is all it takes to get help moving." : "No reports match this filter."}
            action={
              filter === "all" ? (
                <Button asChild>
                  <Link href="/report">
                    <Plus /> Report a rescue
                  </Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {filtered.map((r, i) => (
              <motion.li key={r.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.03 }}>
                <ReportCard report={r} />
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ReportCard({ report }: { report: CitizenReport }) {
  return (
    <Link href={`/track/${report.id}`} className="group block rounded-2xl focus-visible:outline-2 focus-visible:outline-ring">
      <Card className="flex gap-4 p-3 transition group-hover:border-primary/40 group-hover:shadow-[var(--shadow-lift)]">
        <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-muted">
          <Image src={report.imageUrl} alt="" fill sizes="96px" className="object-cover" />
        </div>
        <CardContent className="flex min-w-0 flex-1 flex-col justify-between p-0 sm:p-0">
          <div className="space-y-1.5">
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge status={report.status} />
              <SeverityBadge severity={report.severity} />
            </div>
            <p className="truncate text-sm font-medium">{report.injuryType}</p>
            <p className="line-clamp-1 text-xs text-muted-foreground">{report.description}</p>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 truncate">
              {report.duplicateOf ? (
                <>
                  <Copy className="size-3" /> Linked to an earlier report
                </>
              ) : report.ngoName ? (
                report.ngoName
              ) : (
                timeAgo(report.createdAt)
              )}
            </span>
            <ChevronRight className="size-4 shrink-0 transition group-hover:translate-x-0.5" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
