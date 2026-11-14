"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { CheckCircle2, HandHeart, Heart, Info } from "lucide-react";
import type { Donation, Fundraiser } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { api, errorMessage } from "@/lib/api";
import { donationSchema } from "@/lib/validations";
import { formatINR, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const PRESETS = [100, 250, 500, 1000];

export function FundCard({
  reportId,
  fundraiser,
  donations,
  loadingDonations,
}: {
  reportId: string;
  fundraiser: Fundraiser;
  donations: Donation[];
  loadingDonations: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pct = fundraiser.goal > 0 ? Math.min(100, Math.round((fundraiser.raised / fundraiser.goal) * 100)) : 0;

  return (
    <Card className="overflow-hidden">
      <div className="h-1 bg-[linear-gradient(90deg,var(--critical),var(--primary),var(--moderate))]" aria-hidden />
      <CardHeader>
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-primary">
          <HandHeart className="size-3.5" /> Recovery fund
        </div>
        <CardTitle className="text-xl">{fundraiser.title || "Help with this animal's recovery"}</CardTitle>
        {fundraiser.description && <p className="text-sm leading-relaxed text-muted-foreground">{fundraiser.description}</p>}
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-end justify-between gap-2">
            <p>
              <span className="text-2xl font-semibold tabular-nums">{formatINR(fundraiser.raised)}</span>
              <span className="text-sm text-muted-foreground"> of {formatINR(fundraiser.goal)}</span>
            </p>
            <p className="text-sm text-muted-foreground tabular-nums">{pct}%</p>
          </div>
          <Progress value={pct} aria-label={`${pct}% funded`} indicatorClassName="bg-[linear-gradient(90deg,var(--primary),var(--moderate))]" />
          <p className="text-xs text-muted-foreground">
            {fundraiser.donorCount} {fundraiser.donorCount === 1 ? "supporter" : "supporters"}
          </p>
        </div>

        <Button size="lg" className="w-full" onClick={() => setOpen(true)}>
          <Heart /> Support recovery
        </Button>

        <div className="space-y-3">
          <p className="text-sm font-medium">Recent supporters</p>
          {loadingDonations ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : donations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Be the first to support this rescue.</p>
          ) : (
            <ul className="space-y-2.5">
              <AnimatePresence initial={false}>
                {donations.slice(0, 6).map((d) => (
                  <motion.li
                    key={d.id}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                      {d.sponsorName.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{d.sponsorName}</span>{" "}
                        <span className="text-muted-foreground">gave {formatINR(d.amount)}</span>
                      </p>
                      {d.message && <p className="truncate text-xs text-muted-foreground">“{d.message}”</p>}
                    </div>
                    <time className="shrink-0 text-xs text-muted-foreground" dateTime={d.createdAt}>
                      {timeAgo(d.createdAt)}
                    </time>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      </CardContent>
      <DonateDialog reportId={reportId} open={open} onOpenChange={setOpen} />
    </Card>
  );
}

function DonateDialog({ reportId, open, onOpenChange }: { reportId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Remount the form per open so each attempt gets a fresh idempotency key. */}
        {open && <DonateForm reportId={reportId} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function DonateForm({ reportId, onDone }: { reportId: string; onDone: () => void }) {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [amount, setAmount] = useState(250);
  const [custom, setCustom] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const value = custom ? Number(custom) : amount;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = donationSchema.safeParse({
      amount: value,
      sponsorName: name || undefined,
      message: message || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check the amount.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api(`/api/reports/${reportId}/donations`, {
        method: "POST",
        json: parsed.data,
        headers: { "Idempotency-Key": idempotencyKey },
      });
      setSuccess(true);
      setTimeout(onDone, 1600);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="grid size-14 place-items-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="size-7" />
        </motion.div>
        <DialogTitle>Thank you!</DialogTitle>
        <DialogDescription>Your pledge of {formatINR(value)} is now on the recovery fund.</DialogDescription>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <DialogHeader>
        <DialogTitle>Support this recovery</DialogTitle>
        <DialogDescription>Your pledge goes towards vet care, medicines and shelter for this animal.</DialogDescription>
      </DialogHeader>
      <DialogBody className="space-y-5">
        <div className="flex items-start gap-2 rounded-xl bg-moderate-soft px-3 py-2.5 text-xs text-moderate">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <span>Demo mode — no real money is charged. Pledges are recorded to show how the live fund works.</span>
        </div>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">Amount</legend>
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setAmount(p);
                  setCustom("");
                }}
                aria-pressed={!custom && amount === p}
                className={cn(
                  "h-11 rounded-xl border text-sm font-medium tabular-nums transition",
                  !custom && amount === p ? "border-primary bg-primary-soft text-primary" : "bg-card hover:bg-accent"
                )}
              >
                ₹{p}
              </button>
            ))}
          </div>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
            <Input
              type="number"
              inputMode="numeric"
              min={10}
              placeholder="Other amount"
              value={custom}
              onChange={(e) => setCustom(e.target.value.replace(/[^\d]/g, ""))}
              className="pl-8 tabular-nums"
              aria-label="Custom amount in rupees"
            />
          </div>
        </fieldset>

        <div className="space-y-2">
          <Label htmlFor="sponsor-name">Name (optional)</Label>
          <Input id="sponsor-name" maxLength={60} placeholder="Shown as “Anonymous supporter” if empty" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sponsor-message">Message (optional)</Label>
          <Input id="sponsor-message" maxLength={140} placeholder="Get well soon!" value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
        {error && (
          <p role="alert" className="text-sm text-critical">
            {error}
          </p>
        )}
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting} disabled={!value}>
          Pledge {value ? formatINR(value) : ""}
        </Button>
      </DialogFooter>
    </form>
  );
}
