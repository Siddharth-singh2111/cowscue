"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { SignInButton, useAuth } from "@clerk/nextjs";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  CheckCircle2,
  Clock,
  HandCoins,
  LayoutDashboard,
  Navigation,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ApplicationForm, type Application } from "./_components/application-form";

const BENEFITS = [
  { icon: BellRing, title: "Alerts only from your area", body: "WhatsApp alerts for AI-verified cases inside your own coverage circle — no spam, no wasted trips." },
  { icon: LayoutDashboard, title: "Live command center", body: "A realtime queue sorted by severity and SLA, a map of every case and multi-stop route planning." },
  { icon: Navigation, title: "Driver tracking, no app", body: "Send your driver a signed link; their GPS streams to you and the citizen who reported." },
  { icon: HandCoins, title: "Recovery fundraising", body: "Open a fund for an animal's treatment and watch supporter contributions arrive live." },
  { icon: BarChart3, title: "Response analytics", body: "Track median response and rescue times, outcomes and funds raised for your reports and donors." },
];

function StatusCard({ app, onReapply }: { app: Application; onReapply: () => void }) {
  const config = {
    pending: {
      icon: Clock,
      tone: "border-moderate/30 bg-moderate-soft/60",
      iconTone: "text-moderate",
      title: "Your application is under review",
      body: `Submitted ${formatDateTime(app.createdAt)}. Our team verifies registration details manually — this usually takes 1–2 working days. You'll get access automatically once approved.`,
    },
    approved: {
      icon: CheckCircle2,
      tone: "border-success/30 bg-success/5",
      iconTone: "text-success",
      title: `${app.ngoName} is a verified partner`,
      body: "Your command center is ready. Set your coverage area there to start receiving rescue alerts.",
    },
    rejected: {
      icon: XCircle,
      tone: "border-destructive/30 bg-destructive/5",
      iconTone: "text-destructive",
      title: "Your application wasn't approved",
      body: app.rejectionReason ? `Reason: ${app.rejectionReason}` : "You can update your details and apply again.",
    },
    suspended: {
      icon: ShieldAlert,
      tone: "border-destructive/30 bg-destructive/5",
      iconTone: "text-destructive",
      title: "Your partner access is suspended",
      body: app.rejectionReason
        ? `Reason: ${app.rejectionReason}. Contact the Cowscue team to restore access.`
        : "Contact the Cowscue team to restore access.",
    },
  }[app.status];

  return (
    <Card className={cn("p-6 sm:p-8", config.tone)} role="status">
      <config.icon className={cn("mb-4 size-8", config.iconTone)} aria-hidden />
      <h2 className="text-xl font-semibold tracking-tight">{config.title}</h2>
      <p className="mt-2 text-muted-foreground">{config.body}</p>
      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Organisation</dt>
          <dd className="font-medium">{app.ngoName}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Registration no.</dt>
          <dd className="font-medium">{app.registrationNumber}</dd>
        </div>
      </dl>
      <div className="mt-6">
        {app.status === "approved" && (
          <Button asChild>
            <Link href="/dashboard">
              Open command center <ArrowRight />
            </Link>
          </Button>
        )}
        {app.status === "rejected" && (
          <Button onClick={onReapply}>
            Update details & re-apply <ArrowRight />
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function ApplyPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { data, isLoading, mutate } = useSWR<{ application: Application | null }>(isSignedIn ? "/api/ngo/apply" : null);
  const [reapplying, setReapplying] = useState(false);
  const app = data?.application ?? null;
  const showForm = isSignedIn && data && (!app || (app.status === "rejected" && reapplying));

  return (
    <div className="mx-auto max-w-7xl px-4 pb-32 pt-10 sm:px-6 md:pb-20 md:pt-14">
      <PageHeader
        eyebrow="For NGOs & gaushalas"
        title={
          <>
            Partner with Cowscue, <span className="font-display font-normal italic">reach more animals.</span>
          </>
        }
        description="Join the network of verified rescue organisations receiving AI-triaged emergencies from citizens in your area. Free for registered NGOs."
      />

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:gap-12">
        <aside className="order-2 lg:order-1">
          <div className="space-y-5 lg:sticky lg:top-24">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">What you get</h2>
            <ul className="space-y-4">
              {BENEFITS.map((b) => (
                <li key={b.title} className="flex gap-4 rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                    <b.icon className="size-4" aria-hidden />
                  </div>
                  <div>
                    <p className="font-medium">{b.title}</p>
                    <p className="text-sm text-muted-foreground">{b.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <section className="order-1 lg:order-2" aria-label="Application">
          {!isLoaded || (isSignedIn && isLoading) ? (
            <Card className="space-y-4 p-6 sm:p-8">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-24 w-full" />
            </Card>
          ) : !isSignedIn ? (
            <Card className="p-8 text-center sm:p-12">
              <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary">
                <LayoutDashboard className="size-6" aria-hidden />
              </div>
              <h2 className="text-xl font-semibold tracking-tight">Sign in to apply</h2>
              <p className="mx-auto mt-2 max-w-sm text-muted-foreground">
                Use the account your team will log in with — it becomes your organisation&apos;s command center login once approved.
              </p>
              <SignInButton mode="modal">
                <Button size="lg" className="mt-6">
                  Sign in to continue
                </Button>
              </SignInButton>
            </Card>
          ) : showForm ? (
            <Card className="p-6 sm:p-8">
              <h2 className="mb-6 text-xl font-semibold tracking-tight">{app ? "Update your application" : "Partner application"}</h2>
              <ApplicationForm
                initial={app}
                onSubmitted={(a) => {
                  setReapplying(false);
                  void mutate({ application: a }, { revalidate: false });
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </Card>
          ) : app ? (
            <StatusCard app={app} onReapply={() => setReapplying(true)} />
          ) : null}
        </section>
      </div>
    </div>
  );
}
