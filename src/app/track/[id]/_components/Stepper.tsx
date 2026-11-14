import { Check } from "lucide-react";
import type { ReportStatus } from "@/types";
import { cn } from "@/lib/utils";

const STEPS = ["Reported", "Accepted", "En route", "Rescued"] as const;

function reached(status: ReportStatus): number {
  switch (status) {
    case "pending":
      return 0;
    case "assigned":
      return 1;
    case "en_route":
      return 2;
    case "resolved":
      return 3;
    default:
      return 0;
  }
}

export function Stepper({ status }: { status: ReportStatus }) {
  const current = reached(status);
  const closed = status === "closed";
  return (
    <ol className="grid grid-cols-4 gap-1" aria-label="Rescue progress">
      {STEPS.map((label, i) => {
        const done = !closed && i <= current;
        const active = !closed && i === current && status !== "resolved";
        return (
          <li key={label} className="flex flex-col gap-2" aria-current={active ? "step" : undefined}>
            <div className="flex items-center gap-1">
              <span
                className={cn(
                  "relative grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold transition-colors",
                  done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}
              >
                {active && <span className="absolute inset-0 animate-pulse-ring rounded-full bg-primary" aria-hidden />}
                {done && !active ? <Check className="size-3.5" /> : i + 1}
              </span>
              {i < STEPS.length - 1 && (
                <span className="h-0.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <span className={cn("block h-full bg-primary transition-all duration-700", !closed && i < current ? "w-full" : "w-0")} />
                </span>
              )}
            </div>
            <span className={cn("text-[11px] sm:text-xs", done ? "font-medium text-foreground" : "text-muted-foreground")}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
