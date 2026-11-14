/**
 * Idempotent, non-destructive data migration for the v2 schema.
 *
 *   npm run db:migrate             # apply
 *   npm run db:migrate -- --dry-run
 *
 * - NGOs: backfill the indexed GeoJSON `operatingLocation` from legacy lat/lng; default isAccepting.
 * - Reports: backfill `channel`, `timeline`, lifecycle timestamps and counters for legacy documents.
 * - Ensures all indexes exist (createIndexes — never drops anything).
 */
import mongoose, { type QueryFilter } from "mongoose";
import { connectDB } from "@/server/db/connect";
import { Ngo, type INgo } from "@/server/models/Ngo";
import { Report } from "@/server/models/Report";
import { Donation } from "@/server/models/Donation";
import { WhatsAppSession } from "@/server/models/WhatsAppSession";

const dryRun = process.argv.includes("--dry-run");

async function main() {
  await connectDB();
  console.log(`Connected. ${dryRun ? "DRY RUN — no writes." : "Applying migration."}`);

  // ── NGOs ──
  const legacyGeoFilter: QueryFilter<INgo> = {
    operatingLatitude: { $exists: true, $ne: null },
    operatingLongitude: { $exists: true, $ne: null },
    "operatingLocation.coordinates": { $exists: false },
  };
  const ngosNeedingGeo = await Ngo.find(legacyGeoFilter).lean();
  console.log(`NGOs needing operatingLocation backfill: ${ngosNeedingGeo.length}`);
  const ngoAcceptMissing = await Ngo.countDocuments({ isAccepting: { $exists: false } });
  console.log(`NGOs missing isAccepting: ${ngoAcceptMissing}`);

  // ── Reports ──
  const legacyReports = await Report.countDocuments({ timeline: { $exists: false } });
  const missingChannel = await Report.countDocuments({ channel: { $exists: false } });
  console.log(`Reports without timeline: ${legacyReports}; without channel: ${missingChannel}`);

  if (!dryRun) {
    for (const n of ngosNeedingGeo) {
      await Ngo.updateOne(
        { _id: n._id },
        { $set: { operatingLocation: { type: "Point", coordinates: [n.operatingLongitude!, n.operatingLatitude!] } } }
      );
    }
    await Ngo.updateMany({ isAccepting: { $exists: false } }, { $set: { isAccepting: true } });

    await Report.updateMany(
      { channel: { $exists: false }, reporterId: /^whatsapp-/ },
      { $set: { channel: "whatsapp" } }
    );
    await Report.updateMany({ channel: { $exists: false } }, { $set: { channel: "web" } });
    await Report.updateMany(
      { timeline: { $exists: false } },
      [
        {
          $set: {
            timeline: [{ type: "reported", at: "$createdAt", message: "Reported (migrated from v1)." }],
            escalationLevel: { $ifNull: ["$escalationLevel", 0] },
            duplicateCount: { $ifNull: ["$duplicateCount", 0] },
            donorCount: { $ifNull: ["$donorCount", 0] },
            firstAid: { $ifNull: ["$firstAid", []] },
            notifiedNgoIds: { $ifNull: ["$notifiedNgoIds", []] },
            assignedAt: { $cond: [{ $in: ["$status", ["assigned", "resolved"]] }, { $ifNull: ["$assignedAt", "$updatedAt"] }, "$$REMOVE"] },
            resolvedAt: { $cond: [{ $eq: ["$status", "resolved"] }, { $ifNull: ["$resolvedAt", "$updatedAt"] }, "$$REMOVE"] },
          },
        },
      ],
      { updatePipeline: true }
    );

    for (const model of [Ngo, Report, Donation, WhatsAppSession] as mongoose.Model<unknown>[]) {
      await model.createIndexes();
      console.log(`Indexes ensured for ${model.modelName}`);
    }
  }

  console.log("Done.");
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
