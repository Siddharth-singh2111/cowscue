import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, BarChart3, Camera, HandHeart, Navigation, ScanEye, ShieldCheck } from "lucide-react";
import type { PublicStats } from "@/types";
import { publicStats } from "@/server/services/stats";
import { logger } from "@/server/lib/logger";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WorkspaceBanner } from "@/components/workspace";
import { formatMinutes } from "@/lib/format";
import { CountUp } from "./_components/count-up";
import { Reveal } from "./_components/reveal";
import { FeatureBento } from "./_components/feature-bento";
import { ArchitectureDiagram, SCALE_POINTS } from "./_components/architecture";

export const revalidate = 60;

async function loadStats(): Promise<PublicStats | null> {
  try {
    return await publicStats();
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err }, "landing: stats unavailable");
    return null;
  }
}

const STEPS = [
  {
    icon: Camera,
    title: "Snap & pin",
    body: "Take a photo of the injured animal. Your GPS location is attached automatically — on the web or over WhatsApp.",
  },
  {
    icon: ScanEye,
    title: "AI triage & dispatch",
    body: "AI verifies it's cattle, grades severity, and alerts every partner NGO whose coverage area contains the spot.",
  },
  {
    icon: Navigation,
    title: "Track the rescue live",
    body: "Follow the ambulance on a live map, get first-aid tips while you wait, and see proof when the animal is safe.",
  },
];

export default async function Home() {
  const stats = await loadStats();
  const t = stats?.totals;
  const active = t?.active ?? 0;

  return (
    <div className="overflow-x-clip">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 bg-grid mask-radial opacity-60" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 md:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-24">
          <div className="space-y-7">
            <WorkspaceBanner />
            <HeroIn>
              <Link
                href="/impact"
                className="inline-flex items-center gap-2 rounded-full border bg-card/80 py-1 pl-2 pr-3 text-sm shadow-xs backdrop-blur transition hover:bg-card"
              >
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-70" />
                  <span className="relative inline-flex size-2 rounded-full bg-success" />
                </span>
                {active > 0 ? (
                  <span>
                    <span className="font-semibold tabular-nums">{active}</span> rescue{active === 1 ? "" : "s"} in progress right now
                  </span>
                ) : (
                  <span>Dispatch is online — 24/7</span>
                )}
                <ArrowRight className="size-3.5 text-muted-foreground" />
              </Link>
            </HeroIn>

            <HeroIn delay={0.05}>
              <h1 className="text-balance text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
                Every injured cow deserves a{" "}
                <span className="font-display text-[1.12em] font-normal italic text-gradient-brand">rescue.</span>
              </h1>
            </HeroIn>

            <HeroIn delay={0.1}>
              <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
                Thousands of stray cattle are hurt on India&apos;s roads every day, and most bystanders don&apos;t know who to call. With Cowscue,
                one photo is enough — AI triages the injury and the nearest verified gaushala is on its way in seconds.
              </p>
            </HeroIn>

            <HeroIn delay={0.15} className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="xl">
                <Link href="/report">
                  <Camera /> Report a rescue
                </Link>
              </Button>
              <Button asChild size="xl" variant="outline">
                <Link href="/impact">
                  <BarChart3 /> See live impact
                </Link>
              </Button>
            </HeroIn>

            <HeroIn delay={0.2}>
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="size-4 text-success" aria-hidden />
                Free for citizens · Verified NGO partners · Your number is only shared with the responding team
              </p>
            </HeroIn>
          </div>

          <HeroIn delay={0.1} className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border shadow-[var(--shadow-lift)] sm:aspect-[5/4] lg:aspect-[4/5]">
              <Image
                src="/adam-sherez-MC1zyHbmfMg-unsplash.jpg"
                alt="A cow standing in a narrow street lined with shop signs"
                fill
                priority
                sizes="(min-width: 1024px) 45vw, 100vw"
                className="object-cover object-[45%_50%]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" aria-hidden />
              <p className="absolute bottom-4 left-5 text-xs text-white/70">Photo: Adam Sherez / Unsplash</p>
            </div>

            {/* Floating product moments */}
            <div className="absolute -left-4 top-8 hidden w-60 rounded-2xl border bg-card/95 p-4 shadow-[var(--shadow-lift)] backdrop-blur sm:block lg:-left-10" aria-hidden>
              <div className="flex items-center justify-between">
                <Badge variant="critical">
                  <span className="size-1.5 rounded-full bg-current" /> Critical
                </Badge>
                <span className="font-mono text-[10px] text-muted-foreground">AI · 0.9s</span>
              </div>
              <p className="mt-2 text-sm font-medium">Hit by vehicle, unable to stand</p>
              <p className="mt-1 text-xs text-muted-foreground">3 partner NGOs alerted within 4 km</p>
            </div>
            <div className="absolute -right-3 bottom-10 hidden w-56 rounded-2xl border bg-card/95 p-4 shadow-[var(--shadow-lift)] backdrop-blur sm:block lg:-right-8" aria-hidden>
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-info text-base">🚑</span>
                <div>
                  <p className="text-sm font-medium">Ambulance en route</p>
                  <p className="text-xs text-muted-foreground">≈ 6 min · live GPS</p>
                </div>
              </div>
            </div>
          </HeroIn>
        </div>
      </section>

      {/* ── Live numbers ─────────────────────────────────────────────────── */}
      <section aria-labelledby="numbers-heading" className="border-y bg-subtle">
        <h2 id="numbers-heading" className="sr-only">
          Platform numbers
        </h2>
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-border px-4 sm:px-6 md:grid-cols-4 md:divide-x">
          {[
            { label: "Animals rescued", value: t?.rescued },
            { label: "Partner NGOs", value: t?.ngos },
            { label: "Median response", text: formatMinutes(stats?.medianResponseMinutes) },
            { label: "Citizen reporters", value: t?.citizens },
          ].map((s) => (
            <div key={s.label} className="px-2 py-8 md:px-8 md:py-10">
              <p className="text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
                {s.text !== undefined ? s.text : s.value != null ? <CountUp value={s.value} /> : "—"}
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24 sm:px-6">
        <Reveal className="max-w-2xl space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">How it works</p>
          <h2 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            From roadside to rescue in <span className="font-display font-normal italic">three steps.</span>
          </h2>
        </Reveal>
        <ol className="mt-12 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal as="li" key={s.title} delay={i * 0.08} className="relative h-full rounded-3xl border bg-card p-7 shadow-[var(--shadow-soft)]">
                <span className="absolute right-6 top-5 font-display text-6xl italic leading-none text-muted-foreground/25" aria-hidden>
                  {i + 1}
                </span>
                <div className="mb-6 grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary">
                  <s.icon className="size-5" aria-hidden />
                </div>
                <h3 className="text-lg font-semibold tracking-tight">
                  <span className="sr-only">Step {i + 1}: </span>
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ── Feature bento ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <Reveal className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">Inside Cowscue</p>
            <h2 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Built like an emergency service, <span className="font-display font-normal italic">not a contact form.</span>
            </h2>
          </div>
          <p className="max-w-sm text-muted-foreground">Every piece exists to shave minutes off the time between a photo and a vet.</p>
        </Reveal>
        <FeatureBento />
      </section>

      {/* ── Built for scale ──────────────────────────────────────────────── */}
      <section className="border-y bg-card">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-[1fr_1.6fr]">
          <Reveal className="space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">Engineering</p>
              <h2 className="text-balance text-4xl font-semibold tracking-tight">Built to stay up when it matters.</h2>
              <p className="text-muted-foreground">
                A rescue platform can&apos;t go down during a monsoon spike. Cowscue runs as horizontally scalable, stateless services behind a
                load balancer, with background work isolated in its own worker tier.
              </p>
            </div>
            <ul className="space-y-4">
              {SCALE_POINTS.map((p) => (
                <li key={p.title} className="flex gap-3">
                  <p.icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <div>
                    <p className="text-sm font-medium">{p.title}</p>
                    <p className="text-sm text-muted-foreground">{p.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.1} className="self-center">
            <ArchitectureDiagram />
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Live dependency status at{" "}
              <a href="/api/ready" className="font-mono underline underline-offset-4 hover:text-foreground">
                /api/ready
              </a>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── For NGOs ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] bg-inverse p-8 text-inverse-foreground sm:p-12 lg:p-16">
            <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-primary/30 blur-3xl" aria-hidden />
            <div className="pointer-events-none absolute inset-0 bg-dots opacity-20 mask-radial" aria-hidden />
            <div className="relative grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-end">
              <div className="space-y-4">
                <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] opacity-70">
                  <HandHeart className="size-4" aria-hidden /> For gaushalas & NGOs
                </p>
                <h2 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                  Spend fuel on rescues, <span className="font-display font-normal italic">not on false alarms.</span>
                </h2>
                <p className="max-w-xl opacity-75">
                  Get verified, AI-triaged cases only from inside your coverage area, a live command center with route planning, driver tracking,
                  fundraising tools and response-time analytics. Free for registered organisations.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
                <Button asChild size="xl" className="w-full sm:w-auto">
                  <Link href="/apply">
                    Become a partner <ArrowRight />
                  </Link>
                </Button>
                <Button asChild size="xl" variant="ghost" className="w-full text-inverse-foreground hover:bg-white/10 sm:w-auto">
                  <Link href="/impact#partners">
                    Meet current partners <ArrowUpRight />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 pb-28 text-center sm:px-6">
        <Reveal className="space-y-6">
          <h2 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            Seen an animal in pain? <span className="font-display font-normal italic text-gradient-brand">Don&apos;t walk past.</span>
          </h2>
          <p className="text-lg text-muted-foreground">It takes under a minute to report — and you can watch help arrive.</p>
          <Button asChild size="xl">
            <Link href="/report">
              <Camera /> Report a rescue now
            </Link>
          </Button>
        </Reveal>
      </section>
    </div>
  );
}

/**
 * Above-the-fold entrance animation in pure CSS: content is visible in the server HTML and animates
 * from first paint, without waiting for hydration (keeps LCP fast and works without JS).
 */
function HeroIn({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <div
      className={`animate-in fade-in slide-in-from-bottom-3 fill-mode-both duration-700 ease-out motion-reduce:animate-none ${className ?? ""}`}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}
