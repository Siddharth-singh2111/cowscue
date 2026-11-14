"use client";

import { useCallback, useState } from "react";

export type GeoState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "ready"; lat: number; lng: number; accuracy: number }
  | { status: "error"; message: string };

const MESSAGES: Record<number, string> = {
  1: "Location permission was denied. Enable it in your browser settings and try again.",
  2: "We couldn't determine your location. Move to an open area and retry.",
  3: "Getting your location took too long. Please retry.",
};

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ status: "idle" });

  const locate = useCallback(
    () =>
      new Promise<{ lat: number; lng: number; accuracy: number }>((resolve, reject) => {
        if (!("geolocation" in navigator)) {
          const message = "This device doesn't support location services.";
          setState({ status: "error", message });
          reject(new Error(message));
          return;
        }
        setState({ status: "locating" });
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const v = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
            setState({ status: "ready", ...v });
            resolve(v);
          },
          (err) => {
            const message = MESSAGES[err.code] ?? "Unable to get your location.";
            setState({ status: "error", message });
            reject(new Error(message));
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 }
        );
      }),
    []
  );

  return { state, locate, setState };
}
