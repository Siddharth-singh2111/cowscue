import { hostname } from "node:os";
import { NextResponse } from "next/server";

/** Liveness probe: answers as long as the process can serve HTTP. Used by Nginx and Kubernetes. */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ status: "ok", uptimeSec: Math.round(process.uptime()), instance: hostname() });
}
