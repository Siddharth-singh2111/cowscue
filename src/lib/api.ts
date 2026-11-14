import type { ApiError } from "@/types";

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
  }
}

/**
 * Typed fetch wrapper for our own API. Throws ApiRequestError carrying the server's friendly
 * message so UI code can `toast.error(err.message)` without parsing responses itself.
 */
export async function api<T>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, headers, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: { ...(json !== undefined ? { "content-type": "application/json" } : {}), ...headers },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const data = (await res.json().catch(() => ({}))) as T & Partial<ApiError>;
  if (!res.ok) {
    throw new ApiRequestError(res.status, data.error || `Request failed (${res.status})`, data.code, data.details);
  }
  return data;
}

/** SWR fetcher. */
export const fetcher = <T,>(url: string) => api<T>(url);

export function errorMessage(err: unknown, fallback = "Something went wrong. Please try again.") {
  return err instanceof Error && err.message ? err.message : fallback;
}
