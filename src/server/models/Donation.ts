import mongoose, { Schema, type Model, type Types } from "mongoose";

/**
 * Append-only donation ledger. The report keeps a denormalised running total for fast reads;
 * this collection is the auditable source of truth (and powers the live supporters feed).
 */
export interface IDonation {
  _id: Types.ObjectId;
  reportId: Types.ObjectId;
  amount: number;
  currency: "INR";
  sponsorName: string;
  message?: string;
  donorUserId?: string;
  provider: "demo";
  status: "succeeded";
  idempotencyKey?: string;
  createdAt: Date;
}

const DonationSchema = new Schema<IDonation>(
  {
    reportId: { type: Schema.Types.ObjectId, ref: "Report", required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, enum: ["INR"], default: "INR" },
    sponsorName: { type: String, required: true },
    message: { type: String },
    donorUserId: { type: String },
    provider: { type: String, enum: ["demo"], default: "demo" },
    status: { type: String, enum: ["succeeded"], default: "succeeded" },
    idempotencyKey: { type: String, unique: true, sparse: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

DonationSchema.index({ reportId: 1, createdAt: -1 });

export const Donation: Model<IDonation> =
  (mongoose.models.Donation as Model<IDonation>) || mongoose.model<IDonation>("Donation", DonationSchema);

export default Donation;
