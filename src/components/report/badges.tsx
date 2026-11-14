import { AlertTriangle, CheckCircle2, Circle, Clock, Navigation, ShieldAlert, XCircle } from "lucide-react";
import type { ReportStatus, Severity } from "@/types";
import { Badge } from "@/components/ui/badge";
import { SEVERITY_LABEL, STATUS_LABEL } from "@/lib/format";
import { cn } from "@/lib/utils";

const SEVERITY_VARIANT = { CRITICAL: "critical", MODERATE: "moderate", ROUTINE: "routine" } as const;

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <Badge variant={SEVERITY_VARIANT[severity]} className={className}>
      {severity === "CRITICAL" ? (
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-75" />
          <span className="relative inline-flex size-1.5 rounded-full bg-current" />
        </span>
      ) : severity === "MODERATE" ? (
        <AlertTriangle />
      ) : (
        <Circle className="fill-current" />
      )}
      {SEVERITY_LABEL[severity]}
    </Badge>
  );
}

const STATUS_STYLE: Record<ReportStatus, { variant: "outline" | "default" | "routine" | "success" | "secondary"; icon: typeof Clock }> = {
  pending: { variant: "outline", icon: Clock },
  assigned: { variant: "default", icon: ShieldAlert },
  en_route: { variant: "routine", icon: Navigation },
  resolved: { variant: "success", icon: CheckCircle2 },
  closed: { variant: "secondary", icon: XCircle },
};

export function StatusBadge({ status, className }: { status: ReportStatus; className?: string }) {
  const { variant, icon: Icon } = STATUS_STYLE[status];
  return (
    <Badge variant={variant} className={className}>
      <Icon />
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export const severityColorVar: Record<Severity, string> = {
  CRITICAL: "var(--critical)",
  MODERATE: "var(--moderate)",
  ROUTINE: "var(--routine)",
};

export function SeverityDot({ severity, className }: { severity: Severity; className?: string }) {
  return <span className={cn("inline-block size-2 rounded-full", className)} style={{ background: severityColorVar[severity] }} />;
}
