"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3 } from "lucide-react";
import { SEVERITIES, type NgoStats, type OpsReport } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { formatINR, formatMinutes, SEVERITY_LABEL } from "@/lib/format";

const SEV_COLOR = { CRITICAL: "var(--critical)", MODERATE: "var(--moderate)", ROUTINE: "var(--routine)" } as const;

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-[var(--shadow-lift)]">
      <p className="mb-0.5 text-muted-foreground">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="font-medium">
          {p.value} {p.name}
        </p>
      ))}
    </div>
  );
}

export function Analytics({ stats, reports, loading }: { stats?: NgoStats; reports: OpsReport[]; loading: boolean }) {
  if (loading && !stats) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 lg:col-span-2" />
        <Skeleton className="h-80" />
      </div>
    );
  }
  if (!stats) {
    return <EmptyState icon={BarChart3} title="Analytics unavailable" description="Team analytics appear once your NGO profile is approved." />;
  }

  const daily = stats.last30.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
  }));
  const mix = SEVERITIES.map((s) => ({ severity: SEVERITY_LABEL[s], key: s, count: reports.filter((r) => r.severity === s).length }));
  const tiles = [
    { label: "Rescues accepted", value: String(stats.accepted) },
    { label: "Rescued", value: String(stats.resolved) },
    { label: "Median response", value: formatMinutes(stats.medianResponseMinutes), hint: "report → accepted" },
    { label: "Median resolution", value: formatMinutes(stats.medianResolutionMinutes), hint: "report → safe" },
    { label: "Raised for recovery", value: formatINR(stats.raised) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4">
            <p className="text-xs text-muted-foreground">{t.label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{t.value}</p>
            {t.hint && <p className="text-[11px] text-muted-foreground">{t.hint}</p>}
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Rescues completed</CardTitle>
            <CardDescription>Last 30 days, by your team</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="resolvedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} interval="preserveStartEnd" minTickGap={24} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--border)" }} />
                <Area type="monotone" dataKey="resolved" name="rescued" stroke="var(--chart-2)" strokeWidth={2} fill="url(#resolvedFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Severity in your area</CardTitle>
            <CardDescription>Reports in the current feed</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mix} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="severity" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--accent)" }} />
                <Bar dataKey="count" name="reports" radius={[8, 8, 0, 0]}>
                  {mix.map((m) => (
                    <Cell key={m.key} fill={SEV_COLOR[m.key]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
