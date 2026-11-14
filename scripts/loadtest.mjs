#!/usr/bin/env node
/**
 * Zero-dependency HTTP load generator.
 *
 *   node scripts/loadtest.mjs --url http://localhost:8080 --c 50 --d 20
 *
 * Hammers a weighted mix of read endpoints with `c` concurrent virtual users for `d` seconds and
 * prints throughput, latency percentiles and per-instance distribution (from /api/health's
 * `instance` field) — handy to confirm the Nginx load balancer spreads traffic across replicas.
 */
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, arr) => (cur.startsWith("--") ? [...acc, [cur.slice(2), arr[i + 1]]] : acc), [])
);
const BASE = (args.url || "http://localhost:8080").replace(/\/$/, "");
const CONCURRENCY = Number(args.c || 50);
const DURATION_MS = Number(args.d || 15) * 1000;

const MIX = [
  ["/api/health", 3],
  ["/api/stats", 3],
  ["/api/leaderboard", 2],
  ["/api/ngos", 1],
];
const bag = MIX.flatMap(([p, w]) => Array(w).fill(p));

const latencies = [];
const statuses = new Map();
const instances = new Map();
let errors = 0;

async function vu(deadline) {
  while (Date.now() < deadline) {
    const path = bag[Math.floor(Math.random() * bag.length)];
    const t0 = performance.now();
    try {
      const res = await fetch(BASE + path, { headers: { "x-forwarded-for": `10.0.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}` } });
      const body = path === "/api/health" ? await res.json().catch(() => ({})) : await res.arrayBuffer();
      latencies.push(performance.now() - t0);
      statuses.set(res.status, (statuses.get(res.status) || 0) + 1);
      if (path === "/api/health" && body.instance) instances.set(body.instance, (instances.get(body.instance) || 0) + 1);
    } catch {
      errors++;
    }
  }
}

const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))]?.toFixed(1);

console.log(`Load testing ${BASE} with ${CONCURRENCY} VUs for ${DURATION_MS / 1000}s…`);
const started = Date.now();
await Promise.all(Array.from({ length: CONCURRENCY }, () => vu(started + DURATION_MS)));
const elapsed = (Date.now() - started) / 1000;
const sorted = latencies.sort((a, b) => a - b);

console.log(`\nRequests: ${sorted.length}  (${(sorted.length / elapsed).toFixed(0)} req/s), network errors: ${errors}`);
console.log(`Latency ms  p50=${pct(sorted, 50)}  p95=${pct(sorted, 95)}  p99=${pct(sorted, 99)}  max=${sorted.at(-1)?.toFixed(1)}`);
console.log(`Status codes: ${[...statuses].map(([s, n]) => `${s}×${n}`).join("  ")}`);
if (instances.size) console.log(`Served by instances: ${[...instances].map(([h, n]) => `${h}=${n}`).join("  ")}`);
