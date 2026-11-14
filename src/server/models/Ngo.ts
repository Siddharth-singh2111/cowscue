import mongoose, { Schema, type Model, type Types } from "mongoose";

export type NgoStatus = "pending" | "approved" | "rejected" | "suspended";

export interface INgo {
  _id: Types.ObjectId;
  userId: string;
  email: string;
  ngoName: string;
  registrationNumber: string;
  contactPerson: string;
  phone: string;
  address: string;
  /** Kept for backwards compatibility with existing documents; `operatingLocation` is the source of truth. */
  operatingLatitude?: number;
  operatingLongitude?: number;
  operatingLocation?: { type: "Point"; coordinates: number[] };
  operatingRadius: number;
  isAccepting: boolean;
  status: NgoStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NgoSchema = new Schema<INgo>(
  {
    userId: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    ngoName: { type: String, required: true },
    registrationNumber: { type: String, required: true },
    contactPerson: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    operatingLatitude: { type: Number },
    operatingLongitude: { type: Number },
    operatingLocation: {
      type: { type: String, enum: ["Point"] },
      coordinates: { type: [Number], default: undefined },
    },
    operatingRadius: { type: Number, default: 15, min: 1, max: 100 },
    isAccepting: { type: Boolean, default: true },
    status: { type: String, enum: ["pending", "approved", "rejected", "suspended"], default: "pending" },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
    rejectionReason: { type: String },
  },
  // Keep the original collection so existing applications keep working.
  { timestamps: true, collection: "ngoapplications" }
);

// $geoNear dispatch: find approved, accepting NGOs whose geofence contains a report.
NgoSchema.index({ operatingLocation: "2dsphere" }, { sparse: true });
NgoSchema.index({ status: 1, createdAt: -1 });

export const Ngo: Model<INgo> =
  (mongoose.models.NgoApplication as Model<INgo>) || mongoose.model<INgo>("NgoApplication", NgoSchema);

export default Ngo;
