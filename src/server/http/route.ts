import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { AppError, Errors } from "../lib/errors";
import { logger, type Logger } from "../lib/logger";
import { rateLimit, type RateLimitRule } from "../lib/rateLimit";
import { getIdentity, type Identity, type Role } from "../auth/identity";

type Access = "public" | "user" | Role | Role[];

export interface RouteContext<P> {
  req: Request;
  params: P;
  identity: Identity | null;
  requestId: string;
  ip: string;
  log: Logger;
  /** Parses and validates the JSON body, throwing a 400 with the first issue on failure. */
  body<T>(schema: ZodType<T>): Promise<T>;
  query<T>(schema: ZodType<T>): T;
}

export interface AuthedContext<P> extends RouteContext<P> {
  identity: Identity;
}

interface RouteOptions {
  access?: Access;
  rateLimit?: RateLimitRule;
  /** Rate-limit key: the caller's user id when signed in, otherwise client IP. */
  rateLimitBy?: "user" | "ip";
}

type Handler<C> = (ctx: C) => Promise<unknown>;

/**
 * Wraps a route handler with the cross-cutting concerns every endpoint needs:
 * request ids, structured access logs, authentication/authorisation, distributed rate limiting,
 * Zod validation and consistent JSON error envelopes. Handlers just return data or throw AppError.
 */
export function route<P = Record<string, never>>(
  opts: RouteOptions & { access: Exclude<Access, "public"> },
  handler: Handler<AuthedContext<P>>
): (req: Request, props: { params: Promise<P> }) => Promise<Response>;
export function route<P = Record<string, never>>(
  opts: RouteOptions,
  handler: Handler<RouteContext<P>>
): (req: Request, props: { params: Promise<P> }) => Promise<Response>;
export function route<P>(opts: RouteOptions, handler: Handler<RouteContext<P>> | Handler<AuthedContext<P>>) {
  return async (req: Request, props: { params: Promise<P> }): Promise<Response> => {
    const started = performance.now();
    const requestId = req.headers.get("x-request-id") || randomUUID();
    const ip = clientIp(req);
    const url = new URL(req.url);
    const log = logger.child({ requestId, method: req.method, path: url.pathname });
    const headers = new Headers({ "x-request-id": requestId });

    try {
      const access = opts.access ?? "public";
      const identity = access === "public" ? await getIdentity().catch(() => null) : await getIdentity();
      authorize(access, identity);

      if (opts.rateLimit) {
        const by = opts.rateLimitBy === "ip" || !identity ? `ip:${ip}` : `user:${identity.userId}`;
        const rl = await rateLimit(opts.rateLimit, by);
        headers.set("x-ratelimit-limit", String(rl.limit));
        headers.set("x-ratelimit-remaining", String(rl.remaining));
        if (!rl.allowed) {
          headers.set("retry-after", String(rl.retryAfterSec));
          throw Errors.rateLimited(rl.retryAfterSec);
        }
      }

      const params = (await props?.params) ?? ({} as P);
      const ctx: RouteContext<P> = {
        req,
        params,
        identity,
        requestId,
        ip,
        log,
        async body<T>(schema: ZodType<T>) {
          let raw: unknown;
          try {
            const text = await req.text();
            raw = text ? JSON.parse(text) : undefined;
          } catch {
            throw Errors.badRequest("Request body must be valid JSON.");
          }
          return schema.parse(raw);
        },
        query<T>(schema: ZodType<T>) {
          return schema.parse(Object.fromEntries(url.searchParams));
        },
      };

      // Safe: when access !== "public", authorize() has guaranteed identity is non-null.
      const result = await (handler as Handler<RouteContext<P>>)(ctx);
      const response = result instanceof Response ? result : NextResponse.json(result ?? { ok: true });
      headers.forEach((v, k) => response.headers.set(k, v));
      log.info({ status: response.status, ms: Math.round(performance.now() - started) }, "request");
      return response;
    } catch (err) {
      const { status, body } = toErrorBody(err);
      if (status >= 500) log.error({ err }, "request failed");
      else log.info({ status, code: body.code, ms: Math.round(performance.now() - started) }, "request rejected");
      return NextResponse.json(body, { status, headers });
    }
  };
}

function authorize(access: Access, identity: Identity | null) {
  if (access === "public") return;
  if (!identity) throw Errors.unauthorized();
  if (access === "user") return;
  const allowed = Array.isArray(access) ? access : [access];
  // Superadmins can do anything an NGO can, which keeps support/debugging simple.
  if (identity.role === "superadmin") return;
  if (!allowed.includes(identity.role)) throw Errors.forbidden();
}

export function toErrorBody(err: unknown): { status: number; body: { error: string; code: string; details?: unknown } } {
  if (err instanceof AppError) {
    return { status: err.status, body: { error: err.message, code: err.code, details: err.details } };
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return {
      status: 400,
      body: {
        error: first?.message || "Invalid input",
        code: "VALIDATION_FAILED",
        details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
    };
  }
  return { status: 500, body: { error: "Something went wrong on our side. Please try again.", code: "INTERNAL" } };
}

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") || "unknown";
}
