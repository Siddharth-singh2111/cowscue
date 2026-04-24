import PusherServer from "pusher";
import PusherClient from "pusher-js";

// Extract variables with strict string fallbacks
const appId = process.env.PUSHER_APP_ID || "";
const key = process.env.NEXT_PUBLIC_PUSHER_KEY || "";
const secret = process.env.PUSHER_SECRET || "";
const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap-south-1";

// Server-side instance (used in API routes to SEND alerts)
export const pusherServer = new PusherServer({
  appId,
  key,
  secret,
  cluster,
  useTLS: true,
});

// Client-side instance (lazy-initialized to avoid SSR issues)
// PusherClient should only be instantiated in the browser
let pusherClientInstance: PusherClient | null = null;

export function getPusherClient(): PusherClient {
  if (!pusherClientInstance) {
    pusherClientInstance = new PusherClient(key, { cluster });
  }
  return pusherClientInstance;
}

// Keep backward-compatible export for existing code
// This is safe because modules importing pusherClient are always "use client" components
export const pusherClient =
  typeof window !== "undefined"
    ? new PusherClient(key, { cluster })
    : (null as unknown as PusherClient);
