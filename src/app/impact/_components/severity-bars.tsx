import { SEVERITIES, type Severity } from "@/types";
import { SEVERITY_LABEL } from "@/lib/format";
import { severityColorVar } from "@/components/report/badges";

const HINT: Record<Severity, string> = {
  CRITICAL: "Bleeding, unable to stand, road trauma",
  MODERATE: "Limping, open wounds, eye injuries",
  ROUTINE: "Weak, malnourished, minor issues",
};

/** Labelled horizontal bars: names and values are always visible text, colour only reinforces. */
export function SeverityBars({ mix }: { mix: Record<Severity, number> }) {
  const total = SEVERITIES.reduce((s, k) => s + (mix[k] ?? 0), 0);
  const max = Math.max(1, ...SEVERITIES.map((k) => mix[k] ?? 0));
  return (
    <ul className="space-y-5">
      {SEVERITIES.map((k) => {
        const n = mix[k] ?? 0;
        const pct = total ? Math.round((n / total) * 100) : 0;
        return (
          <li key={k} title={`${SEVERITY_LABEL[k]}: ${n} cases (${pct}%)`}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{SEVERITY_LABEL[k]}</span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                <span className="text-foreground">{n}</span> · {pct}%
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-r-[4px] transition-[width] duration-700 ease-out"
                style={{ width: `${(n / max) * 100}%`, background: severityColorVar[k] }}
              />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{HINT[k]}</p>
          </li>
        );
      })}
    </ul>
  );
}
