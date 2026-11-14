import { createHmac } from "node:crypto";
import { z } from "zod";

/**
 * Centralised, validated runtime configuration.
 *
 * Every integration is optional except MongoDB so the app degrades gracefully:
 * missing Redis → in-process rate limiting + inline jobs, missing Twilio → alerts are logged, etc.
 * Validation is lazy so `next build` never needs production secrets.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  REDIS_URL: z.string().optional(),

  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),

  PUSHER_APP_ID: z.string().optional(),
  PUSHER_SECRET: z.string().optional(),
  NEXT_PUBLIC_PUSHER_KEY: z.string().optional(),
  NEXT_PUBLIC_PUSHER_CLUSTER: z.string().default("ap2"),

  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: z.string().optional(),
  NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET: z.string().optional(),

  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_NUMBER: z.string().optional(),
  NGO_WHATSAPP_NUMBER: z.string().optional(),

  BOT_SECRET_KEY: z.string().optional(),
  DRIVER_LINK_SECRET: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),

  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
  SUPERADMIN_EMAILS: z.string().default(""),

  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  /** "auto" enqueues to BullMQ when Redis is configured; "inline" always runs jobs in-process. */
  QUEUE_MODE: z.enum(["auto", "inline"]).default("auto"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration — ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export const features = {
  redis: () => Boolean(process.env.REDIS_URL),
  ai: () => Boolean(process.env.GEMINI_API_KEY),
  realtime: () =>
    Boolean(process.env.PUSHER_APP_ID && process.env.PUSHER_SECRET && process.env.NEXT_PUBLIC_PUSHER_KEY),
  twilio: () => Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
  cloudinary: () =>
    Boolean(process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME && process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET),
};

/**
 * Secret used to sign driver portal links. Prefers an explicit DRIVER_LINK_SECRET and otherwise
 * derives a stable, domain-separated key from the Clerk secret so links work with zero extra config.
 */
export function driverLinkSecret(): string {
  const e = env();
  if (e.DRIVER_LINK_SECRET) return e.DRIVER_LINK_SECRET;
  const base = e.CLERK_SECRET_KEY || e.BOT_SECRET_KEY;
  if (!base) {
    if (e.NODE_ENV === "production") throw new Error("DRIVER_LINK_SECRET must be set in production");
    return "cowscue-dev-driver-link-secret";
  }
  return createHmac("sha256", base).update("cowscue:driver-link:v1").digest("hex");
}

export function superadminEmails(): string[] {
  return env()
    .SUPERADMIN_EMAILS.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
