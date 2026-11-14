import {
  Bell,
  CheckCircle2,
  Copy,
  HandCoins,
  Heart,
  Megaphone,
  Navigation,
  PauseCircle,
  ShieldCheck,
  Siren,
  Sparkles,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { TimelineEvent, TimelineEventType } from "@/types";
import { formatDateTime, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const ICONS: Record<TimelineEventType, { icon: LucideIcon; tone: string }> = {
  reported: { icon: Megaphone, tone: "bg-muted text-foreground" },
  triaged: { icon: Sparkles, tone: "bg-primary-soft text-primary" },
  duplicate_flagged: { icon: Copy, tone: "bg-muted text-muted-foreground" },
  ngos_notified: { icon: Bell, tone: "bg-routine-soft text-routine" },
  escalated: { icon: Siren, tone: "bg-critical-soft text-critical" },
  assigned: { icon: ShieldCheck, tone: "bg-primary-soft text-primary" },
  en_route: { icon: Navigation, tone: "bg-routine-soft text-routine" },
  resolved: { icon: CheckCircle2, tone: "bg-success/15 text-success" },
  closed: { icon: XCircle, tone: "bg-muted text-muted-foreground" },
  fundraiser_started: { icon: HandCoins, tone: "bg-moderate-soft text-moderate" },
  fundraiser_paused: { icon: PauseCircle, tone: "bg-muted text-muted-foreground" },
  donation: { icon: Heart, tone: "bg-critical-soft text-critical" },
};

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (!events.length) return <p className="text-sm text-muted-foreground">No updates yet.</p>;
  return (
    <ol className="relative space-y-5">
      {events.map((e, i) => {
        const { icon: Icon, tone } = ICONS[e.type] ?? ICONS.reported;
        const last = i === events.length - 1;
        return (
          <li key={`${e.at}-${i}`} className="relative flex gap-3">
            {!last && <span className="absolute left-4 top-9 h-[calc(100%-1rem)] w-px bg-border" aria-hidden />}
            <span className={cn("relative z-[1] grid size-8 shrink-0 place-items-center rounded-full", tone, last && "ring-4 ring-primary/10")}>
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1 pt-1">
              <p className="text-sm leading-snug">{e.message}</p>
              <time dateTime={e.at} title={formatDateTime(e.at)} className="text-xs text-muted-foreground">
                {timeAgo(e.at)}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
