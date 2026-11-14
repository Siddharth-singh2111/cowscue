import Redis from "ioredis";
import { logger } from "./logger";

declare global {
  var __cowscueRedis: Redis | null | undefined;
}

/**
 * Shared Redis connection (one per process). Returns null when REDIS_URL is not configured so
 * callers can fall back to in-memory behaviour — the app runs fine on a laptop without Redis.
 */
export function getRedis(): Redis | null {
  if (globalThis.__cowscueRedis !== undefined) return globalThis.__cowscueRedis;
  const url = process.env.REDIS_URL;
  if (!url) {
    globalThis.__cowscueRedis = null;
    return null;
  }
  const client = new Redis(url, {
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    lazyConnect: false,
    retryStrategy: (times) => Math.min(times * 200, 5_000),
  });
  client.on("error", (err) => logger.warn({ err: err.message }, "redis connection error"));
  globalThis.__cowscueRedis = client;
  return client;
}

/** Connection options for BullMQ (it needs its own connections with maxRetriesPerRequest = null). */
export function bullConnection() {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  return new Redis(url, { maxRetriesPerRequest: null, enableReadyCheck: false });
}

export async function redisHealthy(timeoutMs = 1500): Promise<boolean | null> {
  const r = getRedis();
  if (!r) return null;
  try {
    if (r.status !== "ready") {
      // Fresh process: give the initial connection a moment instead of reporting a false negative.
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error("redis not ready")), timeoutMs);
        r.once("ready", () => {
          clearTimeout(t);
          resolve();
        });
      });
    }
    return (await r.ping()) === "PONG";
  } catch {
    return false;
  }
}
