import { Queue } from "bullmq";
import { bullConnection } from "../lib/redis";
import { logger } from "../lib/logger";
import { JOB_DEFAULTS, QUEUE_NAME, type JobName, type JobPayloads } from "./jobs";

declare global {
  var __cowscueQueue: Queue | null | undefined;
}

function queue(): Queue | null {
  if (globalThis.__cowscueQueue !== undefined) return globalThis.__cowscueQueue;
  if (process.env.QUEUE_MODE === "inline") return (globalThis.__cowscueQueue = null);
  const connection = bullConnection();
  globalThis.__cowscueQueue = connection
    ? new Queue(QUEUE_NAME, { connection, defaultJobOptions: JOB_DEFAULTS })
    : null;
  return globalThis.__cowscueQueue;
}

interface EnqueueOptions {
  delayMs?: number;
  /** Deduplicates jobs: BullMQ ignores a second add with the same id while the first exists. */
  jobId?: string;
}

/**
 * Enqueue background work.
 *
 * With Redis: the job goes to BullMQ and is consumed by the horizontally-scalable worker tier,
 * with retries + exponential backoff. Without Redis (local dev, single box): the handler runs
 * in-process after the response is sent, so the app is fully functional with zero infra.
 */
export async function enqueue<N extends JobName>(name: N, data: JobPayloads[N], opts: EnqueueOptions = {}) {
  const q = queue();
  if (q) {
    try {
      await q.add(name, data, { delay: opts.delayMs, jobId: opts.jobId });
      return;
    } catch (err) {
      logger.error({ err, job: name }, "enqueue failed; running inline");
    }
  }
  runInline(name, data, opts.delayMs);
}

function runInline<N extends JobName>(name: N, data: JobPayloads[N], delayMs?: number) {
  const exec = async () => {
    try {
      const { handlers } = await import("./handlers");
      await handlers[name](data);
    } catch (err) {
      logger.error({ err, job: name }, "inline job failed");
    }
  };

  if (delayMs && delayMs > 0) {
    // Best effort: survives on a long-lived `next start` process, not on serverless.
    setTimeout(exec, delayMs).unref?.();
    return;
  }

  void (async () => {
    try {
      const { after } = await import("next/server");
      after(exec);
    } catch {
      setImmediate(exec);
    }
  })();
}

export async function queueHealth() {
  const q = queue();
  if (!q) return { mode: "inline" as const };
  try {
    const counts = await q.getJobCounts("waiting", "active", "delayed", "failed");
    return { mode: "bullmq" as const, ...counts };
  } catch {
    return { mode: "bullmq" as const, error: "unreachable" };
  }
}
