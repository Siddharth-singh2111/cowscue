/**
 * Cowscue background worker.
 *
 * A separate, horizontally-scalable process that consumes the BullMQ queue: geofenced dispatch,
 * SLA escalation timers, citizen notifications and inbound WhatsApp processing. Run as many
 * replicas as needed — BullMQ distributes jobs with Redis-backed locks, and every handler is
 * idempotent so at-least-once delivery is safe.
 *
 *   npm run worker            (dev, with .env)
 *   docker compose up worker  (prod, scaled with --scale worker=N)
 */
import { Worker, type Job } from "bullmq";
import http from "node:http";
import { QUEUE_NAME, type JobName, type JobPayloads } from "@/server/queue/jobs";
import { handlers } from "@/server/queue/handlers";
import { bullConnection } from "@/server/lib/redis";
import { connectDB } from "@/server/db/connect";
import { logger } from "@/server/lib/logger";

const log = logger.child({ component: "worker" });
const concurrency = Number(process.env.WORKER_CONCURRENCY || 10);

async function main() {
  const connection = bullConnection();
  if (!connection) {
    log.fatal("REDIS_URL is required to run the worker (the web tier runs jobs inline without it).");
    process.exit(1);
  }
  await connectDB();

  const worker = new Worker(
    QUEUE_NAME,
    async (job: Job) => {
      const name = job.name as JobName;
      const handler = handlers[name] as (data: JobPayloads[typeof name]) => Promise<void>;
      if (!handler) throw new Error(`No handler registered for job "${job.name}"`);
      const started = Date.now();
      await handler(job.data);
      log.info({ job: name, id: job.id, attempt: job.attemptsMade + 1, ms: Date.now() - started }, "job completed");
    },
    {
      connection,
      concurrency,
      // Third-party friendly: at most 50 jobs/sec per worker (Twilio + Gemini rate limits).
      limiter: { max: 50, duration: 1000 },
    }
  );

  worker.on("failed", (job, err) =>
    log.error({ job: job?.name, id: job?.id, attempt: job?.attemptsMade, err: err.message }, "job failed")
  );
  worker.on("error", (err) => log.error({ err: err.message }, "worker error"));

  // Tiny health endpoint for container orchestrators.
  const health = http
    .createServer((_, res) => {
      const ok = worker.isRunning();
      res.writeHead(ok ? 200 : 503, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: ok ? "ok" : "down", concurrency }));
    })
    .listen(Number(process.env.WORKER_HEALTH_PORT || 3001));

  log.info({ queue: QUEUE_NAME, concurrency }, "worker started");

  const shutdown = async (signal: string) => {
    log.info({ signal }, "draining worker");
    health.close();
    await worker.close(); // waits for in-flight jobs to finish
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main().catch((err) => {
  log.fatal({ err }, "worker crashed");
  process.exit(1);
});
