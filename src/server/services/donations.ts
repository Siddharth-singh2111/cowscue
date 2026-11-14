import { Channels, Events } from "@/types";
import { connectDB } from "../db/connect";
import { Report } from "../models/Report";
import { Donation } from "../models/Donation";
import { Errors } from "../lib/errors";
import { CacheKeys, invalidate } from "../lib/cache";
import { publish } from "./realtime";
import { toDonation } from "./serializers";
import { assertId } from "./reports";

/**
 * Records a sponsorship pledge.
 *
 * This is a *demo* payment provider: no money moves. The flow is structured like a real
 * integration (idempotency key → ledger row → atomic counter update → realtime broadcast) so a
 * Razorpay/Stripe webhook can call `recordDonation` with zero changes to the rest of the system.
 */
export async function recordDonation(
  reportId: string,
  input: { amount: number; sponsorName?: string; message?: string; donorUserId?: string; idempotencyKey?: string }
) {
  assertId(reportId);
  await connectDB();

  const report = await Report.findById(reportId, { isFundraising: 1 }).lean();
  if (!report) throw Errors.notFound("Report");
  if (!report.isFundraising) throw Errors.conflict("This rescue is not accepting sponsorships right now.");

  if (input.idempotencyKey) {
    const existing = await Donation.findOne({ idempotencyKey: input.idempotencyKey }).lean();
    if (existing) return { donation: toDonation(existing), replayed: true };
  }

  let donation;
  try {
    donation = await Donation.create({
      reportId,
      amount: input.amount,
      sponsorName: input.sponsorName?.trim() || "Anonymous supporter",
      message: input.message,
      donorUserId: input.donorUserId,
      idempotencyKey: input.idempotencyKey,
    });
  } catch (err) {
    // Duplicate idempotency key from a concurrent retry: return the original.
    if ((err as { code?: number }).code === 11000 && input.idempotencyKey) {
      const existing = await Donation.findOne({ idempotencyKey: input.idempotencyKey }).lean();
      if (existing) return { donation: toDonation(existing), replayed: true };
    }
    throw err;
  }

  const updated = await Report.findByIdAndUpdate(
    reportId,
    { $inc: { fundraisingRaised: input.amount, donorCount: 1 } },
    { returnDocument: "after", projection: { fundraisingRaised: 1, fundraisingGoal: 1, donorCount: 1, ngoUserId: 1 }, lean: true }
  );

  const dto = toDonation(donation.toObject());
  await Promise.all([
    publish(Channels.report(reportId), Events.donation, {
      donation: dto,
      raised: updated?.fundraisingRaised ?? 0,
      goal: updated?.fundraisingGoal ?? 0,
      donorCount: updated?.donorCount ?? 0,
    }),
    invalidate(CacheKeys.publicStats, ...(updated?.ngoUserId ? [CacheKeys.ngoStats(updated.ngoUserId)] : [])),
  ]);
  return { donation: dto, replayed: false };
}

export async function listDonations(reportId: string, limit = 20) {
  assertId(reportId);
  await connectDB();
  const docs = await Donation.find({ reportId }).sort({ createdAt: -1 }).limit(limit).lean();
  return docs.map(toDonation);
}
