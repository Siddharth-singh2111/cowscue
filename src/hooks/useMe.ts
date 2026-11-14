"use client";

import useSWR from "swr";
import { useAuth } from "@clerk/nextjs";
import { fetcher } from "@/lib/api";

export interface Me {
  signedIn: boolean;
  role: "citizen" | "ngo" | "superadmin" | null;
  name?: string;
  ngo?: { id: string; ngoName: string; isAccepting: boolean } | null;
}

/** Server-authoritative role for the current user (cached by SWR, refetched on sign-in changes). */
export function useMe() {
  const { isLoaded, userId } = useAuth();
  const { data, isLoading, mutate } = useSWR<Me>(isLoaded ? ["/api/me", userId ?? "anon"] : null, ([url]: [string]) =>
    fetcher<Me>(url)
  );
  return { me: data, loading: !isLoaded || isLoading, refresh: mutate };
}
