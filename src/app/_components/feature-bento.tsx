import { BrainCircuit, Copy, HeartHandshake, MapPinned, MessageCircle, Navigation, TimerReset } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Reveal } from "./reveal";

function Tile({
  icon: Icon,
  title,
  body,
  tech,
  children,
  className,
  delay = 0,
}: {
  icon: typeof BrainCircuit;
  title: string;
  body: string;
  tech: string;
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <Reveal delay={delay} className={cn("group", className)}>
      <article className="flex h-full flex-col overflow-hidden rounded-3xl border bg-card shadow-[var(--shadow-soft)] transition-shadow duration-300 hover:shadow-[var(--shadow-lift)]">
        <div className="relative flex min-h-48 flex-1 items-center justify-center overflow-hidden border-b bg-subtle p-6">
          <div className="pointer-events-none absolute inset-0 bg-dots opacity-60 mask-radial" aria-hidden />
          <div className="relative w-full">{children}</div>
        </div>
        <div className="space-y-2 p-6">
          <div className="flex items-center gap-2">
            <Icon className="size-4 text-primary" aria-hidden />
            <h3 className="font-semibold tracking-tight">{title}</h3>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
          <p className="pt-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground/80">{tech}</p>
        </div>
      </article>
    </Reveal>
  );
}

/** Each tile carries a small, div-built UI mock of the feature instead of stock imagery. */
export function FeatureBento() {
  return (
    <div className="grid gap-4 md:grid-cols-6">
      <Tile
        className="md:col-span-4"
        icon={BrainCircuit}
        title="AI triage in seconds"
        body="A vision model checks the photo really shows cattle, grades severity and hands the citizen safe first-aid steps while help is on the way. Spam never reaches a responder."
        tech="Gemini vision · structured JSON output · heuristic fallback"
      >
        <div className="mx-auto grid max-w-md gap-3 sm:grid-cols-[96px_1fr]" aria-hidden>
          <div className="relative hidden aspect-square overflow-hidden rounded-2xl bg-[linear-gradient(135deg,var(--muted),var(--accent))] sm:block">
            <div className="absolute inset-3 rounded-xl border-2 border-dashed border-critical/60" />
            <span className="absolute bottom-1.5 left-1.5 rounded-md bg-card/90 px-1.5 text-[10px] font-medium">cattle ✓</span>
          </div>
          <div className="space-y-2.5 rounded-2xl border bg-card p-4 text-left shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <Badge variant="critical">
                <span className="size-1.5 rounded-full bg-current" /> Critical
              </Badge>
              <span className="font-mono text-[11px] text-muted-foreground">92% confidence</span>
            </div>
            <p className="text-sm font-medium">Deep laceration, rear left leg</p>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-[92%] rounded-full bg-critical" />
            </div>
            <ul className="space-y-1 text-xs text-muted-foreground">
              <li>• Keep a safe distance — it may kick</li>
              <li>• Divert traffic around the animal</li>
            </ul>
          </div>
        </div>
      </Tile>

      <Tile
        className="md:col-span-2"
        delay={0.05}
        icon={MapPinned}
        title="Geofenced dispatch"
        body="Every NGO sets its own coverage circle. One index-backed query finds exactly the teams whose area contains the animal."
        tech="MongoDB $geoNear · 2dsphere index"
      >
        <svg viewBox="0 0 200 140" className="mx-auto h-36 w-full max-w-[220px]" aria-hidden>
          <circle cx="78" cy="70" r="52" fill="color-mix(in oklch, var(--success) 10%, transparent)" stroke="var(--success)" strokeDasharray="4 5" />
          <circle cx="138" cy="62" r="38" fill="color-mix(in oklch, var(--routine) 10%, transparent)" stroke="var(--routine)" strokeDasharray="4 5" />
          <circle cx="78" cy="70" r="4" fill="var(--success)" />
          <circle cx="138" cy="62" r="4" fill="var(--routine)" />
          <circle cx="112" cy="80" r="14" fill="var(--critical)" opacity="0.2">
            <animate attributeName="r" values="7;18;7" dur="2.2s" repeatCount="indefinite" />
          </circle>
          <circle cx="112" cy="80" r="6" fill="var(--critical)" stroke="white" strokeWidth="2.5" />
        </svg>
      </Tile>

      <Tile
        className="md:col-span-2"
        delay={0.05}
        icon={TimerReset}
        title="SLA auto-escalation"
        body="If nobody accepts in time, the search widens automatically — no case is left waiting in silence. (Timings shown for a critical case.)"
        tech="BullMQ delayed jobs · idempotent workers"
      >
        <ol className="mx-auto max-w-[240px] space-y-2 text-left text-xs" aria-hidden>
          {[
            ["1×", "Own coverage radius", "0 min"],
            ["1.5×", "Wider net", "+5 min"],
            ["2×", "Neighbouring teams", "+12 min"],
            ["All", "Broadcast within 100 km", "+22 min"],
          ].map(([m, label, t], i) => (
            <li key={m} className="flex items-center gap-3 rounded-xl border bg-card px-3 py-2 shadow-xs">
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-lg font-mono text-[10px] font-semibold",
                  i === 3 ? "bg-critical-soft text-critical" : "bg-primary-soft text-primary"
                )}
              >
                {m}
              </span>
              <span className="flex-1 font-medium">{label}</span>
              <span className="font-mono text-muted-foreground">{t}</span>
            </li>
          ))}
        </ol>
      </Tile>

      <Tile
        className="md:col-span-4"
        delay={0.1}
        icon={Navigation}
        title="Live ambulance tracking"
        body="Drivers get a signed, single-mission link — no app or account. Their GPS streams to the citizen's tracking page and the NGO map in real time."
        tech="Pusher websockets · HMAC-signed capability links"
      >
        <div className="relative mx-auto h-40 max-w-lg overflow-hidden rounded-2xl border bg-card shadow-sm" aria-hidden>
          <div className="absolute inset-0 bg-grid opacity-70" />
          <svg viewBox="0 0 400 160" className="absolute inset-0 size-full" preserveAspectRatio="none">
            <path d="M40 130 C 120 130, 110 60, 200 70 S 300 30, 350 40" fill="none" stroke="var(--info)" strokeWidth="3" strokeDasharray="8 8" strokeLinecap="round">
              <animate attributeName="stroke-dashoffset" values="32;0" dur="1.2s" repeatCount="indefinite" />
            </path>
          </svg>
          <span className="absolute left-[6%] top-[68%] grid size-9 place-items-center rounded-full border-[3px] border-white bg-info text-base shadow-lg">🚑</span>
          <span className="absolute right-[8%] top-[12%] grid size-9 place-items-center rounded-full border-[3px] border-white bg-critical text-base shadow-lg">🐄</span>
          <div className="absolute bottom-3 right-3 rounded-xl border bg-card/95 px-3 py-2 text-left shadow-md backdrop-blur">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">ETA</p>
            <p className="text-sm font-semibold">≈ 6 min · 2.1 km</p>
          </div>
        </div>
      </Tile>

      <Tile
        className="md:col-span-2"
        delay={0.1}
        icon={MessageCircle}
        title="Report over WhatsApp"
        body="No app to install. Send a photo and your location to the Cowscue number and the same AI pipeline takes over."
        tech="Twilio webhook → queue → async replies"
      >
        <div className="mx-auto max-w-[230px] space-y-2 text-left text-xs" aria-hidden>
          <div className="ml-auto w-fit rounded-2xl rounded-br-md bg-success px-3 py-2 text-success-foreground">📷 Photo · 📍 Location</div>
          <div className="w-fit rounded-2xl rounded-bl-md border bg-card px-3 py-2 shadow-xs">
            ✅ Reported! Severity <b>CRITICAL</b>. 2 teams alerted.
          </div>
          <div className="w-fit rounded-2xl rounded-bl-md border bg-card px-3 py-2 shadow-xs">🚑 Driver Ramesh is on the way.</div>
        </div>
      </Tile>

      <Tile
        className="md:col-span-2"
        delay={0.15}
        icon={HeartHandshake}
        title="Recovery crowdfunding"
        body="NGOs can open a fund for an animal's treatment. Supporters see every contribution land live."
        tech="Idempotent ledger · atomic counters"
      >
        <div className="mx-auto max-w-[240px] space-y-3 rounded-2xl border bg-card p-4 text-left shadow-sm" aria-hidden>
          <p className="text-sm font-medium">Help Gauri walk again</p>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full w-[68%] rounded-full bg-primary" />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold">₹6,800 <span className="font-normal text-muted-foreground">of ₹10,000</span></span>
            <div className="flex -space-x-1.5">
              {["A", "R", "M"].map((c, i) => (
                <span
                  key={c}
                  className="grid size-6 place-items-center rounded-full border-2 border-card text-[10px] font-semibold text-white"
                  style={{ background: `var(--chart-${i + 1})` }}
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Tile>

      <Tile
        className="md:col-span-2"
        delay={0.15}
        icon={Copy}
        title="Duplicate detection"
        body="Ten people reporting the same cow shouldn't send ten ambulances. Nearby reports are linked to the open case."
        tech="$nearSphere · 150 m / 6 h window"
      >
        <div className="mx-auto max-w-[240px] space-y-2 text-left text-xs" aria-hidden>
          <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 shadow-xs">
            <span className="size-2.5 rounded-full bg-critical" /> <span className="flex-1 font-medium">Open case #A21</span>
            <span className="text-muted-foreground">3 reports</span>
          </div>
          <div className="ml-5 flex items-center gap-2 rounded-xl border border-dashed bg-card/70 px-3 py-2">
            <span className="size-2.5 rounded-full bg-muted-foreground/50" />
            <span className="flex-1">New report · 80 m away</span>
            <Badge variant="secondary">linked</Badge>
          </div>
        </div>
      </Tile>
    </div>
  );
}
