"use client";

import Image from "next/image";
import { useState } from "react";
import {
  BadgeCheck,
  CheckCircle2,
  Copy,
  ExternalLink,
  HandHeart,
  Link2,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
  Truck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { OpsReport, TimelineEventType } from "@/types";
import { SeverityBadge, StatusBadge } from "@/components/report/badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { api, errorMessage } from "@/lib/api";
import { formatDateTime, formatINR, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { SlaCountdown } from "./CaseCard";
import { AssignDialog, CloseDialog, FundraiserDialog } from "./dialogs";
import { ProofDialog } from "./ProofDialog";
import { copyText, isActive, mapsLink, waLink } from "./lib";

const TIMELINE_TONE: Partial<Record<TimelineEventType, string>> = {
  escalated: "bg-moderate",
  resolved: "bg-success",
  closed: "bg-muted-foreground",
  assigned: "bg-primary",
  en_route: "bg-routine",
  duplicate_flagged: "bg-moderate",
};

type DialogKind = "assign" | "close" | "resolve" | "fund" | null;

export function CaseSheet({
  report,
  open,
  onOpenChange,
  onUpdate,
}: {
  report: OpsReport | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onUpdate: (r: OpsReport) => void;
}) {
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const r = report;

  const copyDriverLink = async () => {
    if (!r) return;
    setLinkLoading(true);
    try {
      const { driverLink } = await api<{ driverLink: string }>(`/api/reports/${r.id}/driver-link`);
      if (await copyText(driverLink)) toast.success("Driver link copied.");
      else toast.message("Driver link", { description: driverLink });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLinkLoading(false);
    }
  };

  const copyTrackLink = async () => {
    if (!r) return;
    const url = `${window.location.origin}/track/${r.id}`;
    if (await copyText(url)) toast.success("Citizen tracking link copied.");
  };

  const resolve = async (input: { resolvedImageUrl: string; notes?: string }) => {
    if (!r) return;
    const res = await api<{ report: OpsReport }>(`/api/reports/${r.id}/resolve`, { method: "POST", json: input });
    onUpdate({ ...res.report, isMine: true, distanceKm: r.distanceKm });
    toast.success("Rescue complete — the citizen has been notified. 💚");
  };

  const mineActive = !!r && r.isMine && isActive(r);
  const canClose = !!r && (r.status === "pending" || mineActive);
  const canFund = !!r && r.isMine && (isActive(r) || r.status === "resolved");
  const keep = (next: OpsReport) => onUpdate({ ...next, distanceKm: r?.distanceKm ?? next.distanceKm });

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent aria-describedby={undefined}>
          {!r ? null : (
            <>
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-muted md:rounded-tl-3xl">
                  <Image src={r.imageUrl} alt={`Reported animal: ${r.injuryType}`} fill sizes="480px" className="object-cover" priority />
                  <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1.5 bg-gradient-to-t from-black/60 to-transparent p-4 pt-12">
                    <SeverityBadge severity={r.severity} className="bg-white/90 dark:bg-black/60" />
                    <StatusBadge status={r.status} className="bg-white/90 dark:bg-black/60" />
                    {r.status === "pending" && <SlaCountdown report={r} />}
                  </div>
                </div>

                <div className="space-y-6 p-5 sm:p-6">
                  <div className="space-y-1.5">
                    <SheetTitle className="text-xl">{r.injuryType}</SheetTitle>
                    <SheetDescription>
                      Reported {timeAgo(r.createdAt)}
                      {r.distanceKm != null && ` · ${r.distanceKm} km away`}
                      {r.channel === "whatsapp" && " · via WhatsApp"}
                    </SheetDescription>
                    <p className="pt-1 text-sm leading-relaxed">{r.description}</p>
                    {r.duplicateOf && (
                      <p className="rounded-xl bg-moderate-soft px-3 py-2 text-xs text-moderate">
                        Probable duplicate of an open case reported nearby — dispatch was not repeated.
                      </p>
                    )}
                    {r.duplicateCount > 0 && (
                      <p className="text-xs text-muted-foreground">{r.duplicateCount} other citizen(s) reported this animal.</p>
                    )}
                  </div>

                  {/* Reporter */}
                  <section className="rounded-2xl border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Reporter</p>
                        <p className="truncate font-medium">{r.reporterName}</p>
                      </div>
                      {r.reporterHistory > 0 ? (
                        <Badge variant="success">
                          <BadgeCheck /> Trusted · {r.reporterHistory} rescue{r.reporterHistory === 1 ? "" : "s"}
                        </Badge>
                      ) : (
                        <Badge variant="outline">First report</Badge>
                      )}
                    </div>
                    {r.reporterPhone && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button asChild variant="outline" size="sm">
                          <a href={`tel:${r.reporterPhone}`}>
                            <Phone /> Call
                          </a>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                          <a href={waLink(r.reporterPhone)} target="_blank" rel="noopener noreferrer">
                            <MessageCircle /> WhatsApp
                          </a>
                        </Button>
                      </div>
                    )}
                  </section>

                  {/* Dispatch */}
                  {r.status !== "pending" && r.ngoName && (
                    <section className="rounded-2xl border p-4 text-sm">
                      <p className="text-xs text-muted-foreground">Handled by</p>
                      <p className="font-medium">
                        {r.ngoName} {r.isMine && <span className="text-primary">(your team)</span>}
                      </p>
                      {r.driverName && (
                        <p className="mt-1 text-muted-foreground">
                          Driver: <span className="text-foreground">{r.driverName}</span>
                          {r.driver?.updatedAt && ` · GPS ${timeAgo(r.driver.updatedAt)}`}
                        </p>
                      )}
                    </section>
                  )}

                  {/* Fundraiser summary */}
                  {r.fundraiser.active && (
                    <section className="space-y-2 rounded-2xl border p-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{r.fundraiser.title ?? "Recovery fund"}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {formatINR(r.fundraiser.raised)} / {formatINR(r.fundraiser.goal)}
                        </span>
                      </div>
                      <Progress value={r.fundraiser.goal ? (r.fundraiser.raised / r.fundraiser.goal) * 100 : 0} />
                    </section>
                  )}

                  {/* First aid */}
                  {r.firstAid.length > 0 && (
                    <section>
                      <h4 className="mb-2 flex items-center gap-1.5 text-sm font-medium">
                        <Sparkles className="size-4 text-primary" /> AI first-aid guidance
                      </h4>
                      <ul className="space-y-1.5 text-sm text-muted-foreground">
                        {r.firstAid.map((tip) => (
                          <li key={tip} className="flex gap-2">
                            <span className="mt-2 size-1 shrink-0 rounded-full bg-primary" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {/* Location */}
                  <section className="flex items-center justify-between gap-3 rounded-2xl bg-subtle p-4">
                    <div className="flex items-center gap-2.5 text-sm">
                      <MapPin className="size-4 text-muted-foreground" />
                      <span className="font-mono text-xs">
                        {r.location.lat.toFixed(5)}, {r.location.lng.toFixed(5)}
                      </span>
                    </div>
                    <Button asChild size="sm" variant="ghost">
                      <a href={mapsLink(r.location.lat, r.location.lng)} target="_blank" rel="noopener noreferrer">
                        Google Maps <ExternalLink />
                      </a>
                    </Button>
                  </section>

                  {/* Timeline */}
                  <section>
                    <h4 className="mb-3 text-sm font-medium">Timeline</h4>
                    <ol className="relative space-y-4 border-l border-border pl-5">
                      {r.timeline.map((t, i) => (
                        <li key={`${t.at}-${i}`} className="relative">
                          <span
                            className={cn(
                              "absolute -left-[25px] top-1 size-2.5 rounded-full ring-4 ring-card",
                              TIMELINE_TONE[t.type] ?? "bg-muted-foreground/50"
                            )}
                          />
                          <p className="text-sm leading-snug">{t.message}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(t.at)}</p>
                        </li>
                      ))}
                    </ol>
                  </section>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2 border-t bg-card p-4 safe-bottom">
                {r.status === "pending" && (
                  <Button className="w-full" size="lg" onClick={() => setDialog("assign")}>
                    <Truck /> Accept & dispatch
                  </Button>
                )}
                {mineActive && (
                  <>
                    <Button className="w-full" size="lg" variant="success" onClick={() => setDialog("resolve")}>
                      <CheckCircle2 /> Mark rescued
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={copyDriverLink} loading={linkLoading}>
                        {!linkLoading && <Link2 />} Driver link
                      </Button>
                      <Button variant="outline" size="sm" onClick={copyTrackLink}>
                        <Copy /> Citizen link
                      </Button>
                    </div>
                  </>
                )}
                {(canFund || canClose) && (
                  <div className="grid grid-cols-2 gap-2">
                    {canFund && (
                      <Button variant="outline" size="sm" onClick={() => setDialog("fund")} className={cn(!canClose && "col-span-2")}>
                        <HandHeart /> {r.fundraiser.active ? "Manage fund" : "Recovery fund"}
                      </Button>
                    )}
                    {canClose && (
                      <Button variant="ghost" size="sm" onClick={() => setDialog("close")} className={cn("text-muted-foreground", !canFund && "col-span-2")}>
                        <XCircle /> Close case
                      </Button>
                    )}
                  </div>
                )}
                {!r.isMine && isActive(r) && (
                  <p className="text-center text-xs text-muted-foreground">Another team is handling this rescue.</p>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AssignDialog report={r} open={dialog === "assign"} onOpenChange={(o) => setDialog(o ? "assign" : null)} onDone={keep} />
      <CloseDialog
        report={r}
        open={dialog === "close"}
        onOpenChange={(o) => setDialog(o ? "close" : null)}
        onDone={(next) => {
          keep(next);
          onOpenChange(false);
        }}
      />
      <FundraiserDialog report={r} open={dialog === "fund"} onOpenChange={(o) => setDialog(o ? "fund" : null)} onDone={keep} />
      <ProofDialog open={dialog === "resolve"} onOpenChange={(o) => setDialog(o ? "resolve" : null)} onSubmit={resolve} />
    </>
  );
}
