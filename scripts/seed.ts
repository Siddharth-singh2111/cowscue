/**
 * Seeds a demo dataset (partner NGOs + reports across the lifecycle) for local development and
 * screenshots. Every seeded document is tagged with a `seed-` id prefix so it can be removed
 * cleanly without touching real data.
 *
 *   npm run db:seed                    # insert demo data around Bengaluru
 *   npm run db:seed -- --reset         # remove previously seeded docs first
 *   npm run db:seed -- --lat 13.55 --lng 79.99
 */
import mongoose from "mongoose";
import { connectDB } from "@/server/db/connect";
import { Ngo } from "@/server/models/Ngo";
import { Report } from "@/server/models/Report";
import { Donation } from "@/server/models/Donation";
import type { ReportStatus, Severity } from "@/types";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const CENTER = { lat: Number(arg("lat") ?? 12.9716), lng: Number(arg("lng") ?? 77.5946) };
const jitter = (km: number) => (Math.random() - 0.5) * (km / 111) * 2;
const minutesAgo = (m: number) => new Date(Date.now() - m * 60_000);
// Local demo photo (served from /public) so seeded cases render without a Cloudinary account.
const IMG = ["/adam-sherez-MC1zyHbmfMg-unsplash.jpg"];

const INJURIES: [Severity, string, string][] = [
  ["CRITICAL", "Hit by vehicle, rear leg fracture", "Cow hit by a truck near the flyover, cannot stand."],
  ["CRITICAL", "Heavy bleeding from neck wound", "Bull bleeding a lot near the vegetable market."],
  ["MODERATE", "Limping, swollen front leg", "Calf limping badly outside the school gate."],
  ["MODERATE", "Plastic ingestion suspected", "Cow eating plastic bags at the garbage point, bloated stomach."],
  ["ROUTINE", "Malnourished stray calf", "Very thin calf wandering alone near the bus depot."],
  ["ROUTINE", "Minor skin infection", "Cow with patches of skin infection near the temple."],
];

async function main() {
  await connectDB();
  if (process.argv.includes("--reset")) {
    const seeded = await Report.find({ reporterId: /^seed-/ }, { _id: 1 }).lean();
    await Donation.deleteMany({ reportId: { $in: seeded.map((r) => r._id) } });
    const r = await Report.deleteMany({ reporterId: /^seed-/ });
    const n = await Ngo.deleteMany({ userId: /^seed-/ });
    console.log(`Removed ${r.deletedCount} seeded reports and ${n.deletedCount} seeded NGOs.`);
  }

  const ngoNames = ["Gau Seva Trust", "Karuna Animal Rescue", "Nandi Care Foundation"];
  const ngos = await Promise.all(
    ngoNames.map((name, i) => {
      const lat = CENTER.lat + jitter(6);
      const lng = CENTER.lng + jitter(6);
      return Ngo.findOneAndUpdate(
        { userId: `seed-ngo-${i}` },
        {
          $set: {
            userId: `seed-ngo-${i}`,
            email: `ngo${i}@example.org`,
            ngoName: name,
            registrationNumber: `REG/2024/${1000 + i}`,
            contactPerson: ["Meera Iyer", "Arjun Patel", "Fatima Khan"][i],
            phone: `+9198000000${10 + i}`,
            address: `${12 + i} Rescue Road, Demo City`,
            operatingLatitude: lat,
            operatingLongitude: lng,
            operatingLocation: { type: "Point", coordinates: [lng, lat] },
            operatingRadius: [12, 18, 25][i],
            isAccepting: true,
            status: "approved",
          },
        },
        { upsert: true, returnDocument: "after" }
      );
    })
  );

  const plan: { status: ReportStatus; age: number }[] = [
    { status: "pending", age: 3 },
    { status: "pending", age: 18 },
    { status: "pending", age: 42 },
    { status: "assigned", age: 25 },
    { status: "en_route", age: 35 },
    ...Array.from({ length: 22 }, (_, i) => ({ status: "resolved" as ReportStatus, age: 60 * (6 + i * 14) })),
    { status: "closed", age: 600 },
  ];

  let created = 0;
  for (const [i, p] of plan.entries()) {
    const [severity, injuryType, description] = INJURIES[i % INJURIES.length]!;
    const ngo = ngos[i % ngos.length]!;
    const createdAt = minutesAgo(p.age);
    const assignedAt = p.status !== "pending" && p.status !== "closed" ? new Date(createdAt.getTime() + (4 + (i % 9)) * 60_000) : undefined;
    const resolvedAt = p.status === "resolved" ? new Date(createdAt.getTime() + (45 + (i % 5) * 20) * 60_000) : undefined;
    const lat = CENTER.lat + jitter(10);
    const lng = CENTER.lng + jitter(10);
    const active = p.status === "assigned" || p.status === "en_route" || p.status === "resolved";

    const timeline = [
      { type: "reported", at: createdAt, message: "Reported via web app." },
      { type: "triaged", at: createdAt, message: `AI triage: ${severity.toLowerCase()} — ${injuryType}.` },
      { type: "ngos_notified", at: createdAt, message: "Alerted 2 partner NGOs nearby on WhatsApp." },
      ...(assignedAt ? [{ type: "assigned", at: assignedAt, message: `${ngo.ngoName} accepted the rescue.` }] : []),
      ...(p.status === "en_route" ? [{ type: "en_route", at: minutesAgo(p.age - 8), message: "Ambulance is on the way with live GPS tracking." }] : []),
      ...(resolvedAt ? [{ type: "resolved", at: resolvedAt, message: "The animal is safe and in care." }] : []),
      ...(p.status === "closed" ? [{ type: "closed", at: minutesAgo(p.age - 30), message: "Closed — the animal could not be located." }] : []),
    ];

    await Report.create({
      reporterId: `seed-citizen-${i % 7}`,
      reporterName: ["Asha Rao", "Vikram Singh", "Priya Nair", "Rahul Verma", "Sneha Kulkarni", "Imran Shaikh", "Divya Menon"][i % 7],
      reporterPhone: `+9197000000${String(i).padStart(2, "0")}`,
      reporterHistory: i % 4,
      channel: i % 5 === 0 ? "whatsapp" : "web",
      imageUrl: IMG[0],
      description,
      location: { type: "Point", coordinates: [lng, lat] },
      status: p.status,
      severity,
      injuryType,
      triageConfidence: 0.8,
      triageSource: "ai",
      firstAid: ["Keep a safe distance.", "Offer clean water if the animal is conscious.", "Divert traffic around the animal."],
      ...(active
        ? {
            ngoUserId: ngo.userId,
            ngoId: ngo._id,
            ngoName: ngo.ngoName,
            driverName: "Ramesh Kumar",
            driverPhone: "+919811111111",
            assignedAt,
          }
        : {}),
      ...(p.status === "en_route" ? { driverLatitude: lat + 0.01, driverLongitude: lng - 0.008, driverUpdatedAt: new Date(), enRouteAt: minutesAgo(p.age - 8) } : {}),
      ...(resolvedAt ? { resolvedAt, resolvedImageUrl: IMG[0] } : {}),
      ...(p.status === "closed" ? { closeReason: "not_found", closedAt: minutesAgo(p.age - 30) } : {}),
      ...(i === 4 ? { isFundraising: true, fundraisingTitle: "Surgery for Gauri", fundraisingDescription: "Gauri needs surgery on her fractured leg and two weeks of post-operative care at the shelter.", fundraisingGoal: 15000, fundraisingRaised: 6200, donorCount: 14 } : {}),
      escalationLevel: p.status === "pending" && p.age > 30 ? 1 : 0,
      timeline,
      createdAt,
      updatedAt: resolvedAt ?? assignedAt ?? createdAt,
    });
    created++;
  }

  console.log(`Seeded ${ngos.length} NGOs and ${created} reports around ${CENTER.lat}, ${CENTER.lng}.`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
