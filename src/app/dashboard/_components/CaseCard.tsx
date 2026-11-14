"use client";

import Image from "next/image";
import { memo } from "react";
import { Check, Copy, Flame, MapPin, MessageSquareWarning, Timer, Users } from "lucide-react";
import type { OpsReport } from "@/types";
import { SeverityBadge, StatusBadge } from "@/components/report/badges";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatCountdown, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { slaDeadline } from "./lib";
import { useNow } from "./useNow";

/** Live SLA timer; turns red once the window is breached (the server escalates at that point). */
export function SlaCountdown({ report, className }: { report: OpsReport; className?: string }) {
  const now = useNow(1000);
  const left = slaDeadline(report) - now;
  const breached = left < 0;
  const urgent = !breached && left < 60_000;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] tabular-nums",
        breached ? "bg-critical text-white" : urgent ? "bg-critical-soft text-critical" : "bg-muted text-muted-foreground",
        className
      )}
      aria-label={breached ? "SLA breached" : "Time until escalation"}
    >
      <Timer className="size-3" />
      {breached ? `+${formatCountdown(-left)}` : formatCountdown(left)}
    </span>
  );
}

function CaseCardImpl({
  report,
  selected,
  checked,
  flash,
  onOpen,
  onToggle,
}: {
  report: OpsReport;
  selected: boolean;
  checked: boolean;
  flash: boolean;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const r = report;
  const canRoute = r.status === "pending" || ((r.status === "assigned" || r.status === "en_route") && r.isMine);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(r.id)}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onOpen(r.id))}
      className={cn(
        "group relative flex gap-3 rounded-2xl border bg-card p-2.5 text-left outline-none transition-all hover:border-foreground/15 hover:shadow-[var(--shadow-soft)] focus-visible:ring-2 focus-visible:ring-ring",
        selected && "border-primary/50 ring-2 ring-primary/20",
        checked && "bg-primary-soft/30",
        flash && "animate-in fade-in-0 zoom-in-95 ring-2 ring-critical/50"
      )}
    >
      <div className="relative size-[84px] shrink-0 overflow-hidden rounded-xl bg-muted">
        <Image src={r.imageUrl} alt="" fill sizes="84px" className="object-cover" />
        {r.severity === "CRITICAL" && r.status === "pending" && (
          <span className="absolute inset-x-0 bottom-0 bg-critical/90 py-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-white">
            Urgent
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-1.5 py-0.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <SeverityBadge severity={r.severity} />
          {r.status !== "pending" && <StatusBadge status={r.status} />}
          {r.status === "pending" && <SlaCountdown report={r} />}
          {r.escalationLevel > 0 && r.status === "pending" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-moderate-soft px-1.5 py-0.5 text-[11px] font-medium text-moderate">
                  <Flame className="size-3" />L{r.escalationLevel}
                </span>
              </TooltipTrigger>
              <TooltipContent>Escalated {r.escalationLevel}× — search radius widened</TooltipContent>
            </Tooltip>
          )}
        </div>
        <p className="truncate text-sm font-medium">{r.injuryType}</p>
        <p className="line-clamp-1 text-xs text-muted-foreground">{r.description}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span>{timeAgo(r.createdAt)}</span>
          {r.distanceKm != null && (
            <span className="inline-flex items-center gap-0.5">
              <MapPin className="size-3" />
              {r.distanceKm} km
            </span>
          )}
          {r.duplicateCount > 0 && (
            <span className="inline-flex items-center gap-0.5 text-foreground">
              <Users className="size-3" />+{r.duplicateCount} reports
            </span>
          )}
          {r.duplicateOf && (
            <span className="inline-flex items-center gap-0.5 text-moderate">
              <Copy className="size-3" />
              Possible duplicate
            </span>
          )}
          {r.isMine && r.status !== "pending" && <span className="font-medium text-primary">Your team</span>}
          {!r.isMine && r.ngoName && r.status !== "pending" && <span className="truncate">{r.ngoName}</span>}
          {r.channel === "whatsapp" && (
            <span className="inline-flex items-center gap-0.5">
              <MessageSquareWarning className="size-3" />
              WhatsApp
            </span>
          )}
        </div>
      </div>

      {canRoute && (
        <button
          type="button"
          role="checkbox"
          aria-checked={checked}
          aria-label={checked ? "Remove from route" : "Add to route"}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(r.id);
          }}
          className={cn(
            "absolute right-2.5 top-2.5 grid size-6 place-items-center rounded-lg border bg-card transition",
            checked ? "border-primary bg-primary text-primary-foreground" : "opacity-60 hover:opacity-100 group-hover:opacity-100"
          )}
        >
          {checked && <Check className="size-3.5" strokeWidth={3} />}
        </button>
      )}
    </div>
  );
}

export const CaseCard = memo(CaseCardImpl);
