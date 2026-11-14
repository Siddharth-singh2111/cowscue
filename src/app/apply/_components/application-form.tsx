"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Crosshair, Loader2, MapPin, Send } from "lucide-react";
import type { NgoProfile } from "@/types";
import { ngoApplicationSchema } from "@/lib/validations";
import { api, errorMessage } from "@/lib/api";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

type Fields = "ngoName" | "registrationNumber" | "contactPerson" | "phone" | "address";
type Errors = Partial<Record<Fields | "form", string>>;

export type Application = NgoProfile & { rejectionReason?: string };

function Field({
  id,
  label,
  hint,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function ApplicationForm({ initial, onSubmitted }: { initial?: Application | null; onSubmitted: (a: Application) => void }) {
  const [values, setValues] = useState<Record<Fields, string>>({
    ngoName: initial?.ngoName ?? "",
    registrationNumber: initial?.registrationNumber ?? "",
    contactPerson: initial?.contactPerson ?? "",
    phone: initial?.phone ?? "",
    address: initial?.address ?? "",
  });
  const [centre, setCentre] = useState<{ lat: number; lng: number } | null>(
    initial?.operatingLatitude != null && initial?.operatingLongitude != null
      ? { lat: initial.operatingLatitude, lng: initial.operatingLongitude }
      : null
  );
  const [radius, setRadius] = useState(initial?.operatingRadius ?? 15);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const { state: geo, locate } = useGeolocation();

  const set = (k: Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const useMyLocation = async () => {
    try {
      const p = await locate();
      setCentre({ lat: p.lat, lng: p.lng });
      toast.success("Operating centre set to your current location.");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...values,
      operatingLatitude: centre?.lat,
      operatingLongitude: centre?.lng,
      operatingRadius: radius,
    };
    const parsed = ngoApplicationSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as Fields;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      const first = Object.keys(next)[0];
      if (first) document.getElementById(first)?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const { application } = await api<{ application: Application }>("/api/ngo/apply", { method: "POST", json: parsed.data });
      toast.success("Application submitted! We'll review it shortly.");
      onSubmitted(application);
    } catch (err) {
      setErrors({ form: errorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const aria = (k: Fields) => ({
    "aria-invalid": Boolean(errors[k]) || undefined,
    "aria-describedby": errors[k] ? `${k}-error` : undefined,
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-8">
      <fieldset className="space-y-5">
        <legend className="mb-1 text-sm font-semibold">Organisation</legend>
        <Field id="ngoName" label="NGO / gaushala name" error={errors.ngoName}>
          <Input id="ngoName" value={values.ngoName} onChange={set("ngoName")} autoComplete="organization" placeholder="Shri Krishna Gaushala" {...aria("ngoName")} />
        </Field>
        <Field id="registrationNumber" label="Registration number" hint="Trust / society / Section 8 registration ID." error={errors.registrationNumber}>
          <Input id="registrationNumber" value={values.registrationNumber} onChange={set("registrationNumber")} placeholder="e.g. TN/2019/0042" {...aria("registrationNumber")} />
        </Field>
        <Field id="address" label="Office address" error={errors.address}>
          <Textarea id="address" value={values.address} onChange={set("address")} rows={3} autoComplete="street-address" placeholder="Street, area, city, PIN" {...aria("address")} />
        </Field>
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-semibold sm:col-span-2">Primary contact</legend>
        <Field id="contactPerson" label="Contact person" error={errors.contactPerson}>
          <Input id="contactPerson" value={values.contactPerson} onChange={set("contactPerson")} autoComplete="name" placeholder="Full name" {...aria("contactPerson")} />
        </Field>
        <Field id="phone" label="WhatsApp number" hint="Rescue alerts are sent here." error={errors.phone}>
          <Input id="phone" type="tel" inputMode="tel" value={values.phone} onChange={set("phone")} autoComplete="tel" placeholder="+91 98765 43210" {...aria("phone")} />
        </Field>
      </fieldset>

      <fieldset className="space-y-4 rounded-2xl border bg-subtle p-5">
        <legend className="sr-only">Coverage area</legend>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Coverage area <span className="font-normal text-muted-foreground">(optional)</span></p>
            <p className="text-sm text-muted-foreground">You&apos;ll only be alerted to rescues inside this circle. You can change it any time.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={useMyLocation} disabled={geo.status === "locating"} className="shrink-0">
            {geo.status === "locating" ? <Loader2 className="animate-spin" /> : <Crosshair />}
            Use my current location
          </Button>
        </div>
        <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2.5 text-sm">
          <MapPin className="size-4 text-muted-foreground" aria-hidden />
          {centre ? (
            <span className="font-mono text-xs">
              {centre.lat.toFixed(4)}, {centre.lng.toFixed(4)}
            </span>
          ) : (
            <span className="text-muted-foreground">No centre set — you can add it later from your command center.</span>
          )}
          {centre && (
            <button type="button" onClick={() => setCentre(null)} className="ml-auto text-xs text-muted-foreground underline-offset-4 hover:underline">
              Clear
            </button>
          )}
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <Label htmlFor="radius">Coverage radius</Label>
            <span className="font-mono text-sm font-medium tabular-nums">{radius} km</span>
          </div>
          <Slider id="radius" min={1} max={100} step={1} value={[radius]} onValueChange={(v) => setRadius(v[0] ?? 15)} aria-label="Coverage radius in kilometres" />
        </div>
      </fieldset>

      {errors.form && (
        <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {errors.form}
        </p>
      )}

      <Button type="submit" size="lg" loading={submitting} className="w-full sm:w-auto">
        {!submitting && <Send />} Submit application
      </Button>
    </form>
  );
}
