import { describe, expect, it } from "vitest";
import { evaluate, rateLimit } from "@/server/lib/rateLimit";

const rule = { name: "test", limit: 5, windowSec: 60 };

describe("sliding-window rate limiter", () => {
  it("weights the previous window by its remaining overlap", () => {
    // 10 requests last window, 25% into the current one → 7.5 carried over + 1 current = 8.5 > 5
    expect(evaluate(rule, 1, 10, 0.25, 60_000, 15_000).allowed).toBe(false);
    // 90% into the window only 1 of the previous 10 still counts → 1 + 3 = 4 ≤ 5
    expect(evaluate(rule, 3, 10, 0.9, 60_000, 54_000).allowed).toBe(true);
  });

  it("reports retry-after when blocked", () => {
    const r = evaluate(rule, 6, 0, 0.5, 60_000, 30_000);
    expect(r.allowed).toBe(false);
    expect(r.retryAfterSec).toBe(30);
  });

  it("allows up to the limit then blocks (in-memory fallback, no Redis)", async () => {
    const id = `user-${Math.random()}`;
    const now = 1_700_000_000_000 - (1_700_000_000_000 % 60_000); // start of a window
    const results = [];
    for (let i = 0; i < 7; i++) results.push(await rateLimit(rule, id, now + i));
    expect(results.slice(0, 5).every((r) => r.allowed)).toBe(true);
    expect(results[5]!.allowed).toBe(false);
    expect(results[5]!.remaining).toBe(0);
  });

  it("isolates identifiers", async () => {
    const now = 1_700_000_100_000;
    for (let i = 0; i < 6; i++) await rateLimit(rule, "noisy", now);
    expect((await rateLimit(rule, "quiet", now)).allowed).toBe(true);
  });
});
