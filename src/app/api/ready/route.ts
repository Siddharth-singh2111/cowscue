import { hostname } from "node:os";
import { NextResponse } from "next/server";
import { connectDB, mongoHealthy } from "@/server/db/connect";
import { redisHealthy } from "@/server/lib/redis";
import { queueHealth } from "@/server/queue";
import { features } from "@/server/config/env";

export const dynamic = "force-dynamic";

/**
 * Readiness probe: only report ready when hard dependencies are reachable, so the load balancer
 * stops routing to a replica that has lost its database connection.
 */
export async function GET() {
  let mongo = false;
  try {
    await connectDB();
    mongo = mongoHealthy();
  } catch {
    mongo = false;
  }
  const redis = await redisHealthy();
  const queue = await queueHealth();
  const ready = mongo && redis !== false;

  return NextResponse.json(
    {
      status: ready ? "ready" : "degraded",
      instance: hostname(),
      checks: { mongo, redis: redis ?? "not-configured", queue },
      features: {
        ai: features.ai(),
        realtime: features.realtime(),
        whatsapp: features.twilio(),
        uploads: features.cloudinary(),
      },
      timestamp: new Date().toISOString(),
    },
    { status: ready ? 200 : 503 }
  );
}
