import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import mongoose from "mongoose";

/**
 * Health check endpoint — verifies that all critical services are reachable.
 * Use with uptime monitoring (BetterStack, Checkly, etc.)
 */
export async function GET() {
  const checks: Record<string, "ok" | "error"> = {};
  let allHealthy = true;

  // 1. MongoDB connectivity
  try {
    await connectDB();
    const state = mongoose.connection.readyState;
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    checks.mongodb = state === 1 ? "ok" : "error";
    if (state !== 1) allHealthy = false;
  } catch {
    checks.mongodb = "error";
    allHealthy = false;
  }

  // 2. Environment variables present
  const requiredEnvVars = [
    "MONGODB_URI",
    "GEMINI_API_KEY",
    "NEXT_PUBLIC_PUSHER_KEY",
    "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
  ];

  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
  checks.environment = missingVars.length === 0 ? "ok" : "error";
  if (missingVars.length > 0) allHealthy = false;

  return NextResponse.json(
    {
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
      ...(missingVars.length > 0 && { missingEnvVars: missingVars }),
    },
    { status: allHealthy ? 200 : 503 }
  );
}
