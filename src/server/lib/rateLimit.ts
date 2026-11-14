import { getRedis } from "./redis";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  retryAfterSec: number;
}

export interface RateLimitRule {
  /** Logical bucket name, e.g. "reports:create". */
  name: string;
  limit: number;
  windowSec: number;
}

/**
 * Sliding-window counter rate limiter.
 *
 * Uses two fixed windows (current + previous) and weights the previous one by how much of it still
 * overlaps the sliding window. This gives ~99% of the accuracy of a sliding log at O(1) memory, and
 * because state lives in Redis the limit is enforced across every replica behind the load balancer.
 * Falls back to a per-process Map when Redis isn't configured.
 */
export async function rateLimit(rule: RateLimitRule, identifier: string, now = Date.now()): Promise<RateLimitResult> {
  const windowMs = rule.windowSec * 1000;
  const currentWindow = Math.floor(now / windowMs);
  const elapsedFraction = (now % windowMs) / windowMs;
  const keyBase = `rl:${rule.name}:${identifier}`;
  const currentKey = `${keyBase}:${currentWindow}`;
  const previousKey = `${keyBase}:${currentWindow - 1}`;

  const redis = getRedis();
  let current: number;
  let previous: number;

  if (redis && redis.status === "ready") {
    try {
      const results = await redis
        .multi()
        .incr(currentKey)
        .pexpire(currentKey, windowMs * 2)
        .get(previousKey)
        .exec();
      current = Number(results?.[0]?.[1] ?? 1);
      previous = Number(results?.[2]?.[1] ?? 0);
    } catch {
      ({ current, previous } = memoryIncrement(currentKey, previousKey, windowMs, now));
    }
  } else {
    ({ current, previous } = memoryIncrement(currentKey, previousKey, windowMs, now));
  }

  return evaluate(rule, current, previous, elapsedFraction, windowMs, now);
}

export function evaluate(
  rule: RateLimitRule,
  current: number,
  previous: number,
  elapsedFraction: number,
  windowMs: number,
  now: number
): RateLimitResult {
  const weighted = previous * (1 - elapsedFraction) + current;
  const allowed = weighted <= rule.limit;
  const remaining = Math.max(0, Math.floor(rule.limit - weighted));
  const retryAfterSec = allowed ? 0 : Math.max(1, Math.ceil((windowMs - (now % windowMs)) / 1000));
  return { allowed, remaining, limit: rule.limit, retryAfterSec };
}

// ── In-memory fallback ────────────────────────────────────────────────────────
const memory = new Map<string, { count: number; expiresAt: number }>();

function memoryIncrement(currentKey: string, previousKey: string, windowMs: number, now: number) {
  if (memory.size > 10_000) {
    for (const [k, v] of memory) if (v.expiresAt < now) memory.delete(k);
  }
  const entry = memory.get(currentKey);
  const current = entry && entry.expiresAt > now ? entry.count + 1 : 1;
  memory.set(currentKey, { count: current, expiresAt: now + windowMs * 2 });
  const prev = memory.get(previousKey);
  const previous = prev && prev.expiresAt > now ? prev.count : 0;
  return { current, previous };
}

/** Central catalogue of limits so they are easy to audit and tune. */
export const RateLimits = {
  createReport: { name: "reports:create", limit: 6, windowSec: 600 },
  chat: { name: "chat", limit: 20, windowSec: 60 },
  donate: { name: "donate", limit: 10, windowSec: 60 },
  driverLocation: { name: "driver:location", limit: 90, windowSec: 60 },
  publicRead: { name: "public:read", limit: 120, windowSec: 60 },
  authedRead: { name: "authed:read", limit: 240, windowSec: 60 },
  mutation: { name: "mutation", limit: 60, windowSec: 60 },
  webhook: { name: "webhook", limit: 120, windowSec: 60 },
} satisfies Record<string, RateLimitRule>;
