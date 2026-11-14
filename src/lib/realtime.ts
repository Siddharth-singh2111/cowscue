"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import PusherClient from "pusher-js";

let client: PusherClient | null | undefined;

/** Browser Pusher singleton. Private channels authenticate through /api/realtime/auth. */
export function getRealtime(): PusherClient | null {
  if (typeof window === "undefined") return null;
  if (client !== undefined) return client;
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  client = key
    ? new PusherClient(key, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "ap2",
        channelAuthorization: { endpoint: "/api/realtime/auth", transport: "ajax" },
      })
    : null;
  return client;
}

/**
 * Subscribe to a channel for the component's lifetime and bind event handlers.
 * Handlers are kept in a ref so callers can pass inline closures without re-subscribing.
 */
export function useChannel(
  channelName: string | null | undefined,
  handlers: Record<string, (data: never) => void>
) {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
    const rt = getRealtime();
    if (!rt || !channelName) return;
    const channel = rt.subscribe(channelName);
    const events = Object.keys(ref.current);
    const bound = events.map((event) => {
      const fn = (data: never) => ref.current[event]?.(data);
      channel.bind(event, fn);
      return [event, fn] as const;
    });
    return () => {
      bound.forEach(([event, fn]) => channel.unbind(event, fn));
      rt.unsubscribe(channelName);
    };
  }, [channelName]);
}

/** Connection state for a small "Live" indicator. */
export function useRealtimeStatus(): string {
  return useSyncExternalStore(
    (onChange) => {
      const rt = getRealtime();
      if (!rt) return () => {};
      rt.connection.bind("state_change", onChange);
      return () => {
        rt.connection.unbind("state_change", onChange);
      };
    },
    () => getRealtime()?.connection.state ?? "unavailable",
    () => "initialized"
  );
}
