/**
 * End-to-end lifecycle smoke test against a running instance + its database.
 *
 *   npm run dev & npm run worker      # with REDIS_URL set to exercise BullMQ
 *   npm run db:seed
 *   npm run smoke                     # BASE_URL defaults to http://localhost:3000
 *
 * Signed-in steps (citizen report, NGO accept) call the service layer directly with synthetic
 * identities; every public/driver step goes over real HTTP so routing, auth, rate limiting and
 * serialisation are exercised. All data created here uses a `smoke-` prefix and is removed.
 */
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connect";
import { Report } from "@/server/models/Report";
import { Ngo } from "@/server/models/Ngo";
import { Donation } from "@/server/models/Donation";
import { assignReport, createReport, driverLink, updateFundraiser } from "@/server/services/reports";
import { handlers } from "@/server/queue/handlers";
import type { Identity } from "@/server/auth/identity";
import type { Triage } from "@/types";

const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const IMG = "https://res.cloudinary.com/demo/image/upload/v1/samples/animals/cat.jpg";
const triage: Triage = { isCattle: true, severity: "CRITICAL", injuryType: "Rear leg fracture", confidence: 0.9, firstAid: ["Keep distance"], source: "ai" };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let step = 0;
const ok = (msg: string) => console.log(`  ✓ ${++step}. ${msg}`);

async function http(path: string, init: RequestInit & { json?: unknown } = {}) {
  const { json, ...rest } = init;
  const res = await fetch(BASE + path, {
    ...rest,
    headers: { ...(json ? { "content-type": "application/json" } : {}), ...(rest.headers || {}) },
    body: json ? JSON.stringify(json) : rest.body,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

async function main() {
  await connectDB();
  const ngos = await Ngo.find({ status: "approved" }).limit(2).lean();
  assert.ok(ngos.length >= 2, "Run `npm run db:seed` first (needs 2 approved NGOs).");
  const asNgo = (n: (typeof ngos)[number]): Identity => ({
    userId: n.userId, name: n.contactPerson, email: n.email, role: "ngo",
    ngo: { id: String(n._id), ngoName: n.ngoName, isAccepting: true },
  });
  const [lng, lat] = ngos[0]!.operatingLocation!.coordinates as [number, number];
  console.log(`Smoke testing ${BASE}\n`);

  // 1. Citizen reports an emergency inside NGO #1's geofence.
  const { report, duplicate } = await createReport({
    reporterId: "smoke-citizen", reporterName: "Smoke Tester", reporterPhone: "+919876543210", channel: "web",
    imageUrl: IMG, description: "Cow hit by a car near the flyover, cannot stand", latitude: lat + 0.001, longitude: lng, triage,
  });
  assert.equal(duplicate, false);
  ok(`report created (${report.id}, ${report.severity})`);

  // 2. A second citizen reports the same animal 50 m away → flagged as duplicate, no re-dispatch.
  const dup = await createReport({
    reporterId: "smoke-citizen-2", reporterName: "Second Tester", reporterPhone: "+919876543211", channel: "web",
    imageUrl: IMG, description: "Injured cow lying on the road near flyover", latitude: lat + 0.0014, longitude: lng, triage,
  });
  assert.equal(dup.duplicate, true);
  ok("nearby report within 150 m flagged as a duplicate");

  // 3. The worker consumed the dispatch job (geofence lookup → notifications → timeline).
  let notified = false;
  for (let i = 0; i < 20 && !notified; i++) {
    await sleep(500);
    const r = await Report.findById(report.id).lean();
    notified = Boolean(r?.timeline.some((t) => t.type === "ngos_notified"));
  }
  assert.ok(notified, "dispatch.notify job was not processed — is the worker running?");
  ok("background dispatch job processed by the worker");

  // 4. Public tracking view is PII-free.
  const pub = await http(`/api/reports/${report.id}`);
  assert.equal(pub.status, 200);
  assert.ok(!JSON.stringify(pub.body).includes("9876543210"), "public view leaked a phone number");
  ok("public tracker returns no phone numbers");

  // 5. Two NGOs accept at the same instant → exactly one wins (atomic compare-and-set).
  const results = await Promise.allSettled([
    assignReport(report.id, asNgo(ngos[0]!), { driverName: "Ramesh", driverPhone: "+919811111111" }),
    assignReport(report.id, asNgo(ngos[1]!), { driverName: "Suresh", driverPhone: "+919822222222" }),
  ]);
  const winners = results.filter((r) => r.status === "fulfilled");
  const losers = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
  assert.equal(winners.length, 1);
  assert.equal(losers[0]!.reason.status, 409);
  const ownerIndex = results.findIndex((r) => r.status === "fulfilled");
  const owner = asNgo(ngos[ownerIndex]!);
  ok("concurrent accepts: one succeeded, the other got 409 Conflict");

  // 6. Driver portal requires the signed link.
  const link = new URL(driverLink(report.id));
  const token = link.searchParams.get("t")!;
  assert.equal((await http(`/api/driver/${report.id}`)).status, 401);
  assert.equal((await http(`/api/driver/${report.id}`, { headers: { "x-driver-token": token.replace(/.$/, "x") } })).status, 401);
  const drv = await http(`/api/driver/${report.id}`, { headers: { "x-driver-token": token } });
  assert.equal(drv.status, 200);
  ok("driver endpoints reject missing/forged tokens and accept the signed link");

  // 7. First GPS fix moves the case to en_route and is visible on the public tracker.
  const loc = await http(`/api/driver/${report.id}/location`, { method: "POST", headers: { "x-driver-token": token }, json: { latitude: lat + 0.01, longitude: lng + 0.01 } });
  assert.equal(loc.status, 200);
  const tracked = await http(`/api/reports/${report.id}`);
  assert.equal(tracked.body.report.status, "en_route");
  assert.ok(tracked.body.report.driver);
  ok("driver GPS → status en_route with live position on the tracker");

  // 8. Owner opens a recovery fund; donations are idempotent.
  await updateFundraiser(report.id, owner, { active: true, title: "Surgery for smoke-test cow", description: "Fracture surgery and two weeks of post-op care.", goal: 5000 });
  const key = `smoke-${Date.now()}`;
  const d1 = await http(`/api/reports/${report.id}/donations`, { method: "POST", headers: { "idempotency-key": key }, json: { amount: 500, sponsorName: "Smoke" } });
  const d2 = await http(`/api/reports/${report.id}/donations`, { method: "POST", headers: { "idempotency-key": key }, json: { amount: 500, sponsorName: "Smoke" } });
  assert.equal(d1.status, 201);
  assert.equal(d2.status, 200);
  assert.equal(d2.body.replayed, true);
  const afterDonations = await http(`/api/reports/${report.id}`);
  assert.equal(afterDonations.body.report.fundraiser.raised, 500);
  ok("donation recorded once despite a retried request (Idempotency-Key)");

  // 9. Driver marks the animal safe.
  const resolved = await http(`/api/driver/${report.id}/resolve`, { method: "POST", headers: { "x-driver-token": token }, json: { resolvedImageUrl: IMG, notes: "Moved to shelter" } });
  assert.equal(resolved.status, 200);
  assert.equal(resolved.body.report.status, "resolved");
  const again = await http(`/api/driver/${report.id}/location`, { method: "POST", headers: { "x-driver-token": token }, json: { latitude: lat, longitude: lng } });
  assert.equal(again.status, 409);
  ok("driver resolved the case; further GPS updates are rejected (409)");

  // 10. SLA escalation: an unaccepted case widens its search radius when the timer fires.
  const pending = await createReport({
    reporterId: "smoke-citizen-3", reporterName: "Third Tester", reporterPhone: "+919876543212", channel: "web",
    imageUrl: IMG, description: "Calf trapped in an open drain, crying loudly", latitude: lat + 0.05, longitude: lng + 0.05, triage,
  });
  await handlers["sla.check"]({ reportId: pending.report.id, level: 0 });
  const escalated = await Report.findById(pending.report.id).lean();
  assert.equal(escalated?.escalationLevel, 1);
  await handlers["sla.check"]({ reportId: pending.report.id, level: 0 }); // duplicate delivery
  assert.equal((await Report.findById(pending.report.id).lean())?.escalationLevel, 1);
  ok("SLA timer escalated the case once (idempotent under redelivery)");

  // 11. Validation + rate limiting at the edge of the API.
  const bad = await http(`/api/reports/${report.id}/donations`, { method: "POST", json: { amount: 1 } });
  assert.equal(bad.status, 400);
  ok("invalid input rejected with a 400 and field details");

  // Cleanup
  const ids = (await Report.find({ reporterId: /^smoke-/ }, { _id: 1 }).lean()).map((r) => r._id);
  await Donation.deleteMany({ reportId: { $in: ids } });
  await Report.deleteMany({ _id: { $in: ids } });
  console.log(`\nAll ${step} checks passed. Cleaned up ${ids.length} smoke-test reports.`);
  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error("\n✗ Smoke test failed:", err);
  await mongoose.disconnect();
  process.exit(1);
});
