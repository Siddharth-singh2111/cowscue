import PusherServer from "pusher";
import PusherClient from "pusher-js";

// 1. Extract variables with strict string fallbacks to satisfy TypeScript
const appId = process.env.PUSHER_APP_ID || "";
const key = process.env.NEXT_PUBLIC_PUSHER_KEY || "";
const secret = process.env.PUSHER_SECRET || "";
const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap-south-1";

// 2. Server-side instance (used in API routes to SEND alerts)
export const pusherServer = new PusherServer({
  appId: appId,
  key: key,
  secret: secret,
  cluster: cluster,
  useTLS: true,
});

// 3. Client-side instance (used in React components to LISTEN for alerts)
export const pusherClient = new PusherClient(key, {
  cluster: cluster,
});