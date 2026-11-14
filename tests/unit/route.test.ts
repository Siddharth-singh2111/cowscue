import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const identity = vi.hoisted(() => ({ current: null as null | { userId: string; name: string; email: string; role: string } }));
vi.mock("@/server/auth/identity", () => ({ getIdentity: async () => identity.current }));

import { route } from "@/server/http/route";
import { Errors } from "@/server/lib/errors";

type RouteHandler<P> = (req: Request, props: { params: Promise<P> }) => Promise<Response>;
const call = <P,>(handler: RouteHandler<P>, init?: RequestInit) =>
  handler(new Request("http://test.local/api/x", init), { params: Promise.resolve({} as P) });

describe("route() wrapper", () => {
  beforeEach(() => {
    identity.current = null;
  });

  it("returns JSON with a request id", async () => {
    const res = await call(route({}, async () => ({ hello: "world" })));
    expect(res.status).toBe(200);
    expect(res.headers.get("x-request-id")).toBeTruthy();
    expect(await res.json()).toEqual({ hello: "world" });
  });

  it("propagates an incoming x-request-id (for tracing through the load balancer)", async () => {
    const res = await call(route({}, async () => ({})), { headers: { "x-request-id": "abc-123" } });
    expect(res.headers.get("x-request-id")).toBe("abc-123");
  });

  it("enforces authentication and roles", async () => {
    const h = route({ access: "ngo" }, async () => ({ ok: true }));
    expect((await call(h)).status).toBe(401);
    identity.current = { userId: "u", name: "n", email: "e", role: "citizen" };
    expect((await call(h)).status).toBe(403);
    identity.current = { userId: "u", name: "n", email: "e", role: "ngo" };
    expect((await call(h)).status).toBe(200);
    identity.current = { userId: "u", name: "n", email: "e", role: "superadmin" };
    expect((await call(h)).status).toBe(200);
  });

  it("maps validation errors to 400 with field details", async () => {
    const h = route({}, async (ctx) => ctx.body(z.object({ amount: z.number().min(10) })));
    const res = await call(h, { method: "POST", body: JSON.stringify({ amount: 1 }) });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe("VALIDATION_FAILED");
    expect(body.details[0].path).toBe("amount");
  });

  it("maps AppErrors and hides internal errors", async () => {
    expect((await call(route({}, async () => { throw Errors.conflict("taken"); }))).status).toBe(409);
    const res = await call(route({}, async () => { throw new Error("db password leaked?"); }));
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("password");
  });

  it("rate limits and sets Retry-After", async () => {
    const h = route({ rateLimit: { name: `t-${Math.random()}`, limit: 2, windowSec: 60 }, rateLimitBy: "ip" }, async () => ({}));
    const headers = { "x-forwarded-for": "203.0.113.9" };
    await call(h, { headers });
    await call(h, { headers });
    const res = await call(h, { headers });
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBeTruthy();
  });
});
