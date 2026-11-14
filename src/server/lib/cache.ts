import { getRedis } from "./redis";
import { logger } from "./logger";

const memory = new Map<string, { value: string; expiresAt: number }>();
const inflight = new Map<string, Promise<unknown>>();

/**
 * Read-through cache with request coalescing.
 *
 * Concurrent misses for the same key share a single upstream computation (prevents a cache
 * stampede when a hot key such as public stats expires under load). Redis is the shared tier;
 * a small per-process map is used when Redis is unavailable.
 */
export async function cached<T>(key: string, ttlSec: number, compute: () => Promise<T>): Promise<T> {
  const fullKey = `cache:${key}`;
  const hit = await read(fullKey);
  if (hit !== null) return JSON.parse(hit) as T;

  const existing = inflight.get(fullKey);
  if (existing) return existing as Promise<T>;

  const promise = (async () => {
    try {
      const value = await compute();
      await write(fullKey, JSON.stringify(value), ttlSec);
      return value;
    } finally {
      inflight.delete(fullKey);
    }
  })();
  inflight.set(fullKey, promise);
  return promise;
}

export async function invalidate(...keys: string[]) {
  const fullKeys = keys.map((k) => `cache:${k}`);
  for (const k of fullKeys) memory.delete(k);
  const redis = getRedis();
  if (redis && redis.status === "ready" && fullKeys.length) {
    try {
      await redis.del(...fullKeys);
    } catch (err) {
      logger.warn({ err }, "cache invalidate failed");
    }
  }
}

async function read(key: string): Promise<string | null> {
  const redis = getRedis();
  if (redis && redis.status === "ready") {
    try {
      return await redis.get(key);
    } catch {
      /* fall through to memory */
    }
  }
  const m = memory.get(key);
  if (m && m.expiresAt > Date.now()) return m.value;
  return null;
}

async function write(key: string, value: string, ttlSec: number) {
  const redis = getRedis();
  if (redis && redis.status === "ready") {
    try {
      await redis.set(key, value, "EX", ttlSec);
      return;
    } catch {
      /* fall through */
    }
  }
  memory.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
}

export const CacheKeys = {
  publicStats: "stats:public",
  leaderboard: "leaderboard:top",
  ngoDirectory: "ngos:directory",
  ngoStats: (ngoUserId: string) => `stats:ngo:${ngoUserId}`,
  adminOverview: "stats:admin",
};
