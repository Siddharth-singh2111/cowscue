"use client";

import { useEffect, useState } from "react";
import { Check, Copy, LocateFixed, MessageCircle, Truck } from "lucide-react";
import { toast } from "sonner";
import { CLOSE_REASONS, type CloseReason, type NgoProfile, type OpsReport } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiRequestError, errorMessage } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { copyText, waLink } from "./lib";

type DialogProps = { open: boolean; onOpenChange: (o: boolean) => void };

// ─── Accept & dispatch ───────────────────────────────────────────────────────

export function AssignDialog({
  report,
  open,
  onOpenChange,
  onDone,
}: DialogProps & { report: OpsReport | null; onDone: (r: OpsReport) => void }) {
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setLink(null);
      setCopied(false);
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report) return;
    setSubmitting(true);
    try {
      const res = await api<{ report: OpsReport; driverLink: string }>(`/api/reports/${report.id}/assign`, {
        method: "POST",
        json: { driverName, driverPhone },
      });
      onDone({ ...res.report, isMine: true });
      setLink(res.driverLink);
      toast.success("Rescue accepted — send the driver their mission link.");
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        toast.warning("Another team just accepted this case.");
        onOpenChange(false);
      } else toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const message = link
    ? `🚑 Cowscue rescue mission\n\n${report?.injuryType ?? "Injured animal"} (${report?.severity.toLowerCase()}).\nOpen your live mission page and tap "Start live tracking":\n${link}`
    : "";

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent>
        {!link ? (
          <form onSubmit={submit} className="contents">
            <DialogHeader>
              <DialogTitle>Accept & dispatch</DialogTitle>
              <DialogDescription>Assign a driver. They get a secure link to share live GPS with the citizen.</DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="driver-name">Driver name</Label>
                <Input id="driver-name" required minLength={2} placeholder="e.g. Ramesh Kumar" value={driverName} onChange={(e) => setDriverName(e.target.value)} autoComplete="off" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="driver-phone">Driver phone</Label>
                <Input id="driver-phone" required type="tel" inputMode="tel" placeholder="+91 98765 43210" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting} disabled={driverName.trim().length < 2 || driverPhone.trim().length < 10}>
                {!submitting && <Truck />} Accept rescue
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-full bg-success text-success-foreground">
                  <Check className="size-4" />
                </span>
                Rescue accepted
              </DialogTitle>
              <DialogDescription>Share this signed link with {driverName || "the driver"}. It only works for this mission and expires in 48 hours.</DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-3">
              <div className="flex items-center gap-2 rounded-xl border bg-subtle p-2 pl-3">
                <code className="flex-1 truncate font-mono text-xs text-muted-foreground">{link}</code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    setCopied(await copyText(link));
                  }}
                >
                  {copied ? <Check /> : <Copy />} {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Done
              </Button>
              <Button asChild variant="success">
                <a href={waLink(driverPhone, message)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle /> Send on WhatsApp
                </a>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Close case ──────────────────────────────────────────────────────────────

const REASON_COPY: Record<CloseReason, { label: string; hint: string }> = {
  duplicate: { label: "Duplicate", hint: "Already handled under another report" },
  false_alarm: { label: "False alarm", hint: "No animal in distress" },
  not_found: { label: "Not found", hint: "Animal wasn't at the pinned spot" },
  other: { label: "Other", hint: "Explain in the note" },
};

export function CloseDialog({
  report,
  open,
  onOpenChange,
  onDone,
}: DialogProps & { report: OpsReport | null; onDone: (r: OpsReport) => void }) {
  const [reason, setReason] = useState<CloseReason>("duplicate");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!report) return;
    setSubmitting(true);
    try {
      const res = await api<{ report: OpsReport }>(`/api/reports/${report.id}/close`, {
        method: "POST",
        json: { reason, note: note.trim() || undefined },
      });
      onDone(res.report);
      toast.success("Case closed. The reporter has been informed.");
      onOpenChange(false);
      setNote("");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Close case</DialogTitle>
          <DialogDescription>Closed cases leave the queue and the citizen sees the reason on their tracker.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div role="radiogroup" aria-label="Reason" className="grid grid-cols-2 gap-2">
            {CLOSE_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={reason === r}
                onClick={() => setReason(r)}
                className={cn(
                  "rounded-xl border p-3 text-left transition",
                  reason === r ? "border-primary bg-primary-soft/50 ring-2 ring-primary/20" : "hover:bg-accent"
                )}
              >
                <p className="text-sm font-medium">{REASON_COPY[r].label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{REASON_COPY[r].hint}</p>
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="close-note">Note {reason === "other" ? "" : "(optional)"}</Label>
            <Textarea id="close-note" maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything the reporter should know" className="min-h-20" />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={submit} loading={submitting} disabled={reason === "other" && !note.trim()}>
            Close case
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Recovery fund ───────────────────────────────────────────────────────────

export function FundraiserDialog({
  report,
  open,
  onOpenChange,
  onDone,
}: DialogProps & { report: OpsReport | null; onDone: (r: OpsReport) => void }) {
  const [active, setActive] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("5000");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !report) return;
    const f = report.fundraiser;
    setActive(f.active || !f.title);
    setTitle(f.title ?? `Help this ${report.injuryType.toLowerCase().includes("calf") ? "calf" : "cow"} recover`);
    setDescription(
      f.description ??
        `Rescued with ${report.injuryType.toLowerCase()}. Funds cover veterinary treatment, medicines, transport and recovery feed at our shelter.`
    );
    setGoal(String(f.goal || 5000));
  }, [open, report]);

  const submit = async () => {
    if (!report) return;
    setSubmitting(true);
    try {
      const res = await api<{ report: OpsReport }>(`/api/reports/${report.id}/fundraiser`, {
        method: "PUT",
        json: { active, title: title.trim(), description: description.trim(), goal: Math.round(Number(goal) || 0) },
      });
      onDone({ ...res.report, isMine: true });
      toast.success(active ? "Recovery fund is live on the public tracker." : "Recovery fund paused.");
      onOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const f = report?.fundraiser;
  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recovery fund</DialogTitle>
          <DialogDescription>Let supporters sponsor this animal&apos;s treatment from the public tracking page.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <label className="flex items-center justify-between gap-4 rounded-xl border bg-subtle p-3.5">
            <span>
              <span className="block text-sm font-medium">Accept sponsorships</span>
              <span className="block text-xs text-muted-foreground">
                {f && f.raised > 0 ? `${formatINR(f.raised)} raised from ${f.donorCount} supporter${f.donorCount === 1 ? "" : "s"}` : "Visible to anyone with the tracking link"}
              </span>
            </span>
            <Switch checked={active} onCheckedChange={setActive} aria-label="Accept sponsorships" />
          </label>
          <div className={cn("space-y-4 transition-opacity", !active && "pointer-events-none opacity-50")}>
            <div className="space-y-2">
              <Label htmlFor="fund-title">Title</Label>
              <Input id="fund-title" maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fund-goal">Goal (₹)</Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3.5 grid place-items-center text-muted-foreground">₹</span>
                <Input id="fund-goal" type="number" inputMode="numeric" min={100} step={100} className="pl-8 font-mono" value={goal} onChange={(e) => setGoal(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fund-desc">What the funds cover</Label>
              <Textarea id="fund-desc" maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} loading={submitting}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Workspace settings ──────────────────────────────────────────────────────

export function SettingsDialog({
  open,
  onOpenChange,
  profile,
  onSaved,
}: DialogProps & { profile?: NgoProfile; onSaved: (p: NgoProfile) => void }) {
  const [ngoName, setNgoName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState(15);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !profile) return;
    setNgoName(profile.ngoName);
    setPhone(profile.phone);
    setAddress(profile.address);
    setLat(profile.operatingLatitude != null ? String(profile.operatingLatitude) : "");
    setLng(profile.operatingLongitude != null ? String(profile.operatingLongitude) : "");
    setRadius(profile.operatingRadius || 15);
  }, [open, profile]);

  const locate = () => {
    if (!("geolocation" in navigator)) return toast.error("Location isn't available on this device.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setLocating(false);
      },
      () => {
        toast.error("Couldn't get your location. Enter coordinates manually.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const la = lat.trim() ? Number(lat) : null;
    const ln = lng.trim() ? Number(lng) : null;
    if ((la === null) !== (ln === null) || (la !== null && (Number.isNaN(la) || Number.isNaN(ln!)))) {
      return toast.warning("Enter both latitude and longitude, or leave both empty.");
    }
    setSubmitting(true);
    try {
      const res = await api<{ ngo: NgoProfile }>("/api/ngo/profile", {
        method: "PATCH",
        json: { ngoName: ngoName.trim(), phone: phone.trim(), address: address.trim(), operatingLatitude: la, operatingLongitude: ln, operatingRadius: radius },
      });
      onSaved(res.ngo);
      toast.success("Workspace updated. Dispatch now uses your new coverage area.");
      onOpenChange(false);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-xl">
        <form onSubmit={submit} className="contents">
          <DialogHeader>
            <DialogTitle>Workspace settings</DialogTitle>
            <DialogDescription>Your public profile and the coverage area used for geofenced dispatch.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {!profile ? (
              <p className="text-sm text-muted-foreground">No approved NGO profile is linked to this account.</p>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="s-name">Organisation name</Label>
                    <Input id="s-name" required minLength={2} value={ngoName} onChange={(e) => setNgoName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s-phone">Alert phone (WhatsApp)</Label>
                    <Input id="s-phone" required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s-address">Office address</Label>
                    <Input id="s-address" required minLength={10} value={address} onChange={(e) => setAddress(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-3 rounded-2xl border bg-subtle p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">Operating centre</p>
                      <p className="text-xs text-muted-foreground">Reports inside your radius alert your team first.</p>
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={locate} loading={locating}>
                      {!locating && <LocateFixed />} Use my location
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="s-lat" className="text-xs text-muted-foreground">Latitude</Label>
                      <Input id="s-lat" inputMode="decimal" className="h-10 font-mono text-sm" placeholder="28.6139" value={lat} onChange={(e) => setLat(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="s-lng" className="text-xs text-muted-foreground">Longitude</Label>
                      <Input id="s-lng" inputMode="decimal" className="h-10 font-mono text-sm" placeholder="77.2090" value={lng} onChange={(e) => setLng(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-2.5 pt-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">Coverage radius</span>
                      <span className="font-mono text-primary">{radius} km</span>
                    </div>
                    <Slider value={[radius]} min={1} max={100} step={1} onValueChange={(v) => setRadius(v[0] ?? 15)} aria-label="Coverage radius" />
                  </div>
                </div>
              </>
            )}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting} disabled={!profile}>
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
