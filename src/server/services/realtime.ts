import Pusher from "pusher";
import { features } from "../config/env";
import { logger } from "../lib/logger";

let client: Pusher | null | undefined;

function pusher(): Pusher | null {
  if (client !== undefined) return client;
  client = features.realtime()
    ? new Pusher({
        appId: process.env.PUSHER_APP_ID!,
        key: process.env.NEXT_PUBLIC_PUSHER_KEY!,
        secret: process.env.PUSHER_SECRET!,
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap2",
        useTLS: true,
      })
    : null;
  return client;
}

/**
 * Fire-and-forget publish. Realtime is an enhancement — a Pusher outage must never fail a rescue
 * write — so errors are logged and swallowed. Payloads are kept under Pusher's 10KB limit by
 * sending DTOs rather than raw documents.
 */
export async function publish(channel: string, event: string, payload: unknown): Promise<void> {
  const p = pusher();
  if (!p) return;
  try {
    await p.trigger(channel, event, payload);
  } catch (err) {
    logger.warn({ err, channel, event }, "realtime publish failed");
  }
}

export function authorizeChannel(socketId: string, channel: string) {
  const p = pusher();
  if (!p) return null;
  return p.authorizeChannel(socketId, channel);
}
