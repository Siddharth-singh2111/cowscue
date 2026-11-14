"use client";

import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps, type TooltipValueType } from "recharts";
import type { PublicStats } from "@/types";

const dayLabel = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

/*
 * Series colours are validated (scripts/validate_palette.js) per mode:
 * light #ec6100 / #009956 sit in the 6–8 protan band, so identity is also carried by mark shape
 * (filled area vs. line with dots), the legend and the table view below.
 */
const SERIES = [
  { key: "reported", label: "Reported", color: "var(--c-reported)" },
  { key: "rescued", label: "Rescued", color: "var(--c-rescued)" },
] as const;

function ChartTooltip({ active, payload, label }: TooltipContentProps<TooltipValueType, string | number>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-[var(--shadow-lift)]">
      <p className="mb-1 font-medium">{dayLabel(String(label))}</p>
      {SERIES.map((s) => {
        const v = Number(payload.find((p) => p.dataKey === s.key)?.value ?? 0);
        return (
          <p key={s.key} className="flex items-center gap-2 text-muted-foreground">
            <span className="size-2 rounded-full" style={{ background: s.color }} aria-hidden />
            {s.label}
            <span className="ml-auto pl-4 font-mono font-medium text-foreground tabular-nums">{v}</span>
          </p>
        );
      })}
    </div>
  );
}

export function TrendChart({ daily }: { daily: PublicStats["daily"] }) {
  return (
    <div className="[--c-reported:#ec6100] [--c-rescued:#009956] dark:[--c-reported:#e26b1b] dark:[--c-rescued:#22a56a]">
      <ul className="mb-4 flex flex-wrap gap-4 text-xs text-muted-foreground" aria-label="Legend">
        <li className="flex items-center gap-2">
          <span className="h-2.5 w-4 rounded-sm opacity-60" style={{ background: "var(--c-reported)" }} aria-hidden /> Reported
        </li>
        <li className="flex items-center gap-2">
          <span className="relative h-0.5 w-4 rounded-full" style={{ background: "var(--c-rescued)" }} aria-hidden>
            <span className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "var(--c-rescued)" }} />
          </span>
          Rescued
        </li>
      </ul>
      <div className="h-64 w-full" role="img" aria-label="Reports and rescues per day over the last 14 days">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={daily} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
            <defs>
              <linearGradient id="fill-reported" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--c-reported)" stopOpacity={0.28} />
                <stop offset="100%" stopColor="var(--c-reported)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
            <XAxis
              dataKey="date"
              tickFormatter={dayLabel}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={24}
            />
            <YAxis allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
            <Tooltip content={ChartTooltip} cursor={{ stroke: "var(--muted-foreground)", strokeWidth: 1, strokeDasharray: "3 3" }} />
            <Area
              type="monotone"
              dataKey="reported"
              stroke="var(--c-reported)"
              strokeWidth={2}
              fill="url(#fill-reported)"
              activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="rescued"
              stroke="var(--c-rescued)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--c-rescued)", stroke: "var(--card)", strokeWidth: 2 }}
              activeDot={{ r: 5, stroke: "var(--card)", strokeWidth: 2 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3 text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none hover:text-foreground">View as table</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead>
            <tr className="border-b">
              <th className="py-1 font-medium">Day</th>
              <th className="py-1 text-right font-medium">Reported</th>
              <th className="py-1 text-right font-medium">Rescued</th>
            </tr>
          </thead>
          <tbody>
            {daily.map((d) => (
              <tr key={d.date} className="border-b border-border/50">
                <td className="py-1">{dayLabel(d.date)}</td>
                <td className="py-1 text-right">{d.reported}</td>
                <td className="py-1 text-right">{d.rescued}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
