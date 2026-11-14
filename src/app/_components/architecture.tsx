import {
  Activity,
  BrainCircuit,
  Cloud,
  Database,
  Globe,
  ImageIcon,
  Layers,
  MessageCircle,
  Network,
  Radio,
  Server,
  Smartphone,
  Workflow,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

function Node({
  icon: Icon,
  title,
  sub,
  tone = "default",
  className,
}: {
  icon: typeof Server;
  title: string;
  sub?: string;
  tone?: "default" | "brand" | "inverse";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-left shadow-xs",
        tone === "default" && "bg-card",
        tone === "brand" && "border-primary/30 bg-primary-soft",
        tone === "inverse" && "border-transparent bg-inverse text-inverse-foreground",
        className
      )}
    >
      <Icon className={cn("size-4 shrink-0", tone === "brand" ? "text-primary" : tone === "inverse" ? "opacity-80" : "text-muted-foreground")} aria-hidden />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium leading-tight">{title}</p>
        {sub && <p className={cn("truncate text-[11px] leading-tight", tone === "inverse" ? "opacity-70" : "text-muted-foreground")}>{sub}</p>}
      </div>
    </div>
  );
}

function Stage({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function Arrow() {
  return (
    <div className="flex items-center justify-center py-1 text-muted-foreground lg:py-0" aria-hidden>
      <svg viewBox="0 0 24 24" className="size-5 rotate-90 lg:rotate-0">
        <path d="M4 12h14m-5-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/** Div-built system diagram: request path left→right, async path into the worker tier. */
export function ArchitectureDiagram() {
  return (
    <figure className="rounded-3xl border bg-subtle p-4 sm:p-6">
      <div className="grid items-center gap-2 lg:grid-cols-[1fr_auto_1fr_auto_1.2fr_auto_1.2fr]">
        <Stage label="Clients">
          <Node icon={Smartphone} title="Web / PWA" sub="Citizens, NGOs, drivers" />
          <Node icon={MessageCircle} title="WhatsApp" sub="Twilio webhook" />
        </Stage>
        <Arrow />
        <Stage label="Edge">
          <Node icon={Network} title="Nginx" sub="least_conn · rate limit · gzip" tone="inverse" />
        </Stage>
        <Arrow />
        <Stage label="Stateless app tier">
          <div className="relative">
            <Node icon={Server} title="Next.js replica ×N" sub="API routes + SSR" tone="brand" className="relative z-20" />
            <div className="absolute inset-x-2 -bottom-1.5 z-10 h-full rounded-2xl border bg-card" aria-hidden />
            <div className="absolute inset-x-4 -bottom-3 h-full rounded-2xl border bg-card/70" aria-hidden />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Node icon={Activity} title="/api/health" sub="liveness" />
            <Node icon={Activity} title="/api/ready" sub="readiness" />
          </div>
        </Stage>
        <Arrow />
        <Stage label="State & async">
          <Node icon={Database} title="MongoDB Atlas" sub="2dsphere geo indexes" />
          <Node icon={Zap} title="Redis" sub="rate limits · cache · queue" />
          <Node icon={Workflow} title="BullMQ worker pool ×N" sub="dispatch · SLA · notify" tone="brand" />
        </Stage>
      </div>

      <div className="mt-6 border-t pt-5">
        <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Managed services</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Node icon={BrainCircuit} title="Gemini" sub="vision triage" />
          <Node icon={MessageCircle} title="Twilio" sub="WhatsApp alerts" />
          <Node icon={Radio} title="Pusher" sub="websockets" />
          <Node icon={ImageIcon} title="Cloudinary" sub="image CDN" />
        </div>
      </div>
      <figcaption className="sr-only">
        Clients reach an Nginx load balancer, which spreads traffic across stateless Next.js replicas. Replicas use MongoDB Atlas and Redis, and push
        background jobs to a BullMQ worker pool that calls Gemini, Twilio, Pusher and Cloudinary.
      </figcaption>
    </figure>
  );
}

export const SCALE_POINTS = [
  { icon: Layers, title: "Stateless replicas", body: "Sessions are JWTs and all state lives in Mongo/Redis, so any replica can serve any request." },
  { icon: Zap, title: "Distributed rate limiting", body: "Sliding-window counters in Redis enforce limits across every instance, with an in-memory fallback." },
  { icon: Database, title: "Stampede-proof caching", body: "Read-through cache with request coalescing keeps hot stats off the database under spikes." },
  { icon: Workflow, title: "Idempotent background jobs", body: "Retries with exponential backoff; handlers re-check state so at-least-once delivery is safe." },
  { icon: Activity, title: "Health & readiness probes", body: "The balancer drains replicas that lose their database instead of serving errors." },
  { icon: Cloud, title: "Autoscaling on Kubernetes", body: "HPA scales web and worker deployments independently on CPU." },
  { icon: Globe, title: "Graceful degradation", body: "No Redis? Jobs run inline. No AI? Keyword triage. Rescues are never lost to an outage." },
] as const;
