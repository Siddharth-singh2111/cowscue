"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SignInButton, useAuth } from "@clerk/nextjs";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  Check,
  ImagePlus,
  Loader2,
  LocateFixed,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { LogoMark } from "@/components/brand/Logo";
import { useGeolocation } from "@/hooks/useGeolocation";
import { uploadImage } from "@/lib/upload";
import { api, ApiRequestError, errorMessage } from "@/lib/api";
import { createReportSchema } from "@/lib/validations";
import type { CitizenReport } from "@/types";
import { cn } from "@/lib/utils";

const TrackingMap = dynamic(() => import("@/components/maps/TrackingMap"), {
  ssr: false,
  loading: () => <Skeleton className="h-44 w-full rounded-2xl" />,
});

const QUICK_PICKS = ["Hit by vehicle", "Bleeding", "Can't stand", "Plastic ingestion", "Weak / starving"];
const PHONE_KEY = "cowscue:reporter-phone";
const MAX_DESC = 500;

type Stage = "idle" | "uploading" | "triage" | "dispatch";
type FieldErrors = Partial<Record<"photo" | "location" | "reporterPhone" | "description", string>>;

export default function ReportPage() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <Shell>
        <div className="space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-64 w-full rounded-3xl" />
          <Skeleton className="h-40 w-full rounded-3xl" />
        </div>
      </Shell>
    );
  }

  if (!isSignedIn) {
    return (
      <Shell>
        <Card className="mx-auto max-w-md overflow-hidden text-center">
          <div className="bg-dots px-6 pb-6 pt-10">
            <LogoMark className="mx-auto size-14" />
          </div>
          <div className="space-y-3 px-6 pb-8">
            <h1 className="text-2xl font-semibold tracking-tight">Sign in to report a rescue</h1>
            <p className="text-sm text-muted-foreground">
              We ask for a quick sign-in so responders can reach you and to keep fake reports out. It takes a few seconds.
            </p>
            <SignInButton mode="modal">
              <Button size="lg" className="mt-2 w-full">
                Continue
              </Button>
            </SignInButton>
            <p className="pt-2 text-xs text-muted-foreground">
              Human life in danger? Call <span className="font-medium text-foreground">112</span> first.
            </p>
          </div>
        </Card>
      </Shell>
    );
  }

  return <ReportForm />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-subtle px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pt-10">
      <div className="mx-auto max-w-xl">{children}</div>
    </div>
  );
}

function ReportForm() {
  const router = useRouter();
  const { state: geo, locate } = useGeolocation();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [stage, setStage] = useState<Stage>("idle");
  const [uploadPct, setUploadPct] = useState(0);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  // Remembered phone number (best effort — storage may be unavailable).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PHONE_KEY);
      if (saved) setPhone(saved);
    } catch {
      /* ignore */
    }
  }, []);

  // Start locating immediately: by the time the photo is taken the fix is usually ready.
  useEffect(() => {
    locate().catch(() => undefined);
  }, [locate]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const location = geo.status === "ready" ? { lat: geo.lat, lng: geo.lng } : null;
  const busy = stage !== "idle";

  const steps = [
    { label: "Photo", done: Boolean(file) },
    { label: "Location", done: Boolean(location) },
    { label: "Details", done: description.trim().length >= 10 && phone.trim().length >= 10 },
  ];
  const completed = steps.filter((s) => s.done).length;

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setErrors((e) => ({ ...e, photo: undefined }));
  };

  const clearPhoto = () => {
    setFile(null);
    setPreview(null);
    if (cameraRef.current) cameraRef.current.value = "";
    if (galleryRef.current) galleryRef.current.value = "";
  };

  const addChip = (chip: string) => {
    setDescription((d) => {
      if (d.toLowerCase().includes(chip.toLowerCase())) return d;
      const next = d.trim() ? `${d.trim().replace(/[.,]$/, "")}, ${chip.toLowerCase()}` : chip;
      return next.slice(0, MAX_DESC);
    });
    setErrors((e) => ({ ...e, description: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;

    const next: FieldErrors = {};
    if (!file) next.photo = "Add a photo of the animal so responders can assess it.";
    if (!location) next.location = "We need your location to send the nearest team.";
    const parsed = createReportSchema
      .pick({ reporterPhone: true, description: true })
      .safeParse({ reporterPhone: phone, description });
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        next[key] ??= issue.message;
      }
    }
    setErrors(next);
    if (Object.keys(next).length) {
      toast.warning(Object.values(next)[0]);
      return;
    }

    try {
      localStorage.setItem(PHONE_KEY, phone.trim());
    } catch {
      /* ignore */
    }

    try {
      setStage("uploading");
      setUploadPct(0);
      const imageUrl = await uploadImage(file!, setUploadPct);

      setStage("triage");
      // Swap the label once the request has been in flight long enough for triage to finish.
      const dispatchTimer = setTimeout(() => setStage("dispatch"), 4500);
      let result: { report: CitizenReport; duplicate: boolean };
      try {
        result = await api<{ report: CitizenReport; duplicate: boolean }>("/api/reports", {
          method: "POST",
          json: {
            imageUrl,
            description: description.trim(),
            latitude: location!.lat,
            longitude: location!.lng,
            reporterPhone: phone.trim(),
          },
        });
      } finally {
        clearTimeout(dispatchTimer);
      }

      setStage("dispatch");
      toast.success(result.duplicate ? "Linked to an existing case nearby — help is already on it." : "Report received. Alerting nearby teams.");
      router.push(`/track/${result.report.id}?new=1`);
    } catch (err) {
      setStage("idle");
      if (err instanceof ApiRequestError) {
        const reason = (err.details as { reason?: string } | undefined)?.reason;
        if (err.status === 422 && reason === "NOT_CATTLE") {
          setErrors({ photo: err.message });
          toast.error("We couldn't see a cow in that photo. Please retake it.");
          document.getElementById("step-photo")?.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
        if (err.status === 429) {
          toast.error("You've sent several reports in a short time. Please wait a few minutes and try again.");
          return;
        }
        if (err.status === 400 && Array.isArray(err.details)) {
          const fieldErrs: FieldErrors = {};
          for (const d of err.details as { path: string; message: string }[]) {
            if (d.path === "reporterPhone" || d.path === "description") fieldErrs[d.path] = d.message;
          }
          setErrors(fieldErrs);
        }
      }
      toast.error(errorMessage(err));
    }
  };

  return (
    <Shell>
      <div className="mb-6 flex items-center gap-3">
        <Button asChild variant="ghost" size="icon-sm" aria-label="Back to home">
          <Link href="/">
            <ArrowLeft />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Report a rescue</h1>
          <p className="text-sm text-muted-foreground">Takes under a minute. AI triage alerts the nearest team.</p>
        </div>
      </div>

      {/* Progress indicator */}
      <ol className="mb-6 grid grid-cols-3 gap-2" aria-label="Report progress">
        {steps.map((s, i) => (
          <li key={s.label} className="space-y-1.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={false}
                animate={{ width: s.done ? "100%" : "0%" }}
                transition={{ type: "spring", stiffness: 200, damping: 30 }}
              />
            </div>
            <p className={cn("text-xs", s.done ? "text-foreground" : "text-muted-foreground")}>
              {i + 1}. {s.label}
            </p>
          </li>
        ))}
      </ol>

      <form onSubmit={submit} className="space-y-4" noValidate>
        {/* 1. Photo */}
        <Section id="step-photo" n={1} title="Photo of the animal" done={steps[0]!.done} error={errors.photo}>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => pickFile(e.target.files?.[0])}
            aria-label="Take a photo"
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => pickFile(e.target.files?.[0])}
            aria-label="Choose from gallery"
          />
          <AnimatePresence mode="wait" initial={false}>
            {preview ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="relative overflow-hidden rounded-2xl border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                <img src={preview} alt="Selected photo of the animal" className="aspect-[4/3] w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/60 to-transparent p-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
                    <Check className="size-3.5" /> Photo added
                  </span>
                  <Button type="button" size="sm" variant="secondary" onClick={clearPhoto} disabled={busy}>
                    <RefreshCw /> Retake
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="pick" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="group flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/40 bg-primary-soft/50 px-4 py-8 text-center transition hover:border-primary hover:bg-primary-soft"
                >
                  <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm transition group-hover:scale-105">
                    <Camera className="size-5" />
                  </span>
                  <span className="font-medium">Take a photo</span>
                  <span className="text-xs text-muted-foreground">Show the injury clearly</span>
                </button>
                <button
                  type="button"
                  onClick={() => galleryRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-8 text-center transition hover:bg-accent"
                >
                  <span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
                    <ImagePlus className="size-5" />
                  </span>
                  <span className="font-medium">Choose from gallery</span>
                  <span className="text-xs text-muted-foreground">JPG, PNG or HEIC</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </Section>

        {/* 2. Location */}
        <Section n={2} title="Your location" done={steps[1]!.done} error={errors.location}>
          {geo.status === "ready" ? (
            <div className="space-y-3">
              <TrackingMap cow={{ lat: geo.lat, lng: geo.lng }} className="h-44" />
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="size-4 text-success" />
                  Pinned within ~{Math.max(5, Math.round(geo.accuracy))} m
                  {geo.accuracy > 100 && <span className="text-moderate">· low accuracy</span>}
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={() => locate().catch(() => undefined)} disabled={busy}>
                  <RefreshCw /> Refresh
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Stand close to the animal — the team drives to this exact pin.</p>
            </div>
          ) : geo.status === "error" ? (
            <div className="space-y-3 rounded-2xl bg-critical-soft p-4">
              <p className="text-sm text-critical">{geo.message}</p>
              <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                <li>Turn on location/GPS on your phone.</li>
                <li>Allow location for this site (tap the lock icon in the address bar).</li>
              </ul>
              <Button type="button" variant="outline" size="sm" onClick={() => locate().catch(() => undefined)}>
                <LocateFixed /> Try again
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl bg-muted p-4 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              {geo.status === "locating" ? "Finding your location…" : "Waiting for location permission…"}
              {geo.status === "idle" && (
                <Button type="button" size="sm" variant="outline" className="ml-auto" onClick={() => locate().catch(() => undefined)}>
                  <LocateFixed /> Share location
                </Button>
              )}
            </div>
          )}
        </Section>

        {/* 3. Details */}
        <Section n={3} title="What's happening?" done={steps[2]!.done}>
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Quick descriptions">
                {QUICK_PICKS.map((chip) => {
                  const active = description.toLowerCase().includes(chip.toLowerCase());
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => addChip(chip)}
                      aria-pressed={active}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                        active ? "border-primary bg-primary-soft text-primary" : "bg-card hover:bg-accent"
                      )}
                    >
                      {active && <Check className="mr-1 inline size-3" />}
                      {chip}
                    </button>
                  );
                })}
              </div>
              <Label htmlFor="description" className="sr-only">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                maxLength={MAX_DESC}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setErrors((er) => ({ ...er, description: undefined }));
                }}
                placeholder="e.g. Calf with a bleeding back leg near the bus stand, lying by the road."
                aria-invalid={Boolean(errors.description)}
                aria-describedby="description-help"
                className="min-h-28"
              />
              <div id="description-help" className="flex justify-between text-xs">
                <span className="text-critical">{errors.description}</span>
                <span className={cn("tabular-nums text-muted-foreground", description.length > MAX_DESC - 40 && "text-moderate")}>
                  {description.length}/{MAX_DESC}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Your phone number</Label>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+91 98765 43210"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setErrors((er) => ({ ...er, reporterPhone: undefined }));
                }}
                aria-invalid={Boolean(errors.reporterPhone)}
                aria-describedby="phone-help"
              />
              <p id="phone-help" className={cn("text-xs", errors.reporterPhone ? "text-critical" : "text-muted-foreground")}>
                {errors.reporterPhone ?? "Only the responding team sees this, so the driver can call you for directions."}
              </p>
            </div>
          </div>
        </Section>

        {/* Submit */}
        <div className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 pt-2">
          <Card className="space-y-3 p-3 shadow-[var(--shadow-lift)]">
            <AnimatePresence>
              {busy && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="space-y-2 overflow-hidden px-1 pt-1">
                  <div className="flex items-center gap-2 text-sm">
                    {stage === "uploading" ? <Loader2 className="size-4 animate-spin text-primary" /> : <Sparkles className="size-4 animate-pulse text-primary" />}
                    <span aria-live="polite">
                      {stage === "uploading" && `Uploading photo ${uploadPct}%`}
                      {stage === "triage" && "AI is assessing the injury…"}
                      {stage === "dispatch" && "Alerting nearby teams…"}
                    </span>
                  </div>
                  <Progress value={stage === "uploading" ? uploadPct * 0.5 : stage === "triage" ? 70 : 95} />
                </motion.div>
              )}
            </AnimatePresence>
            <Button type="submit" size="lg" className="w-full" loading={busy}>
              {busy ? "Sending…" : completed === 3 ? "Send rescue alert" : `Send rescue alert · ${completed}/3 ready`}
            </Button>
            <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="size-3.5" /> Photos are checked by AI to keep fake reports out.
            </p>
          </Card>
        </div>
      </form>
    </Shell>
  );
}

function Section({
  id,
  n,
  title,
  done,
  error,
  children,
}: {
  id?: string;
  n: number;
  title: string;
  done: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: n * 0.05 }}
      className={cn("rounded-3xl border bg-card p-4 shadow-[var(--shadow-soft)] sm:p-5", error && "border-critical/60")}
      aria-labelledby={`${id ?? `step-${n}`}-title`}
    >
      <div className="mb-4 flex items-center gap-3">
        <span
          className={cn(
            "grid size-7 place-items-center rounded-full text-xs font-semibold transition-colors",
            done ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          {done ? <Check className="size-3.5" /> : n}
        </span>
        <h2 id={`${id ?? `step-${n}`}-title`} className="font-medium">
          {title}
        </h2>
      </div>
      {children}
      {error && (
        <p role="alert" className="mt-3 text-sm text-critical">
          {error}
        </p>
      )}
    </motion.section>
  );
}
