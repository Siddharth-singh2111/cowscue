import mongoose, { Schema, Document, Model } from "mongoose";

export interface INgoApplication extends Document {
  userId: string;
  email: string;
  ngoName: string;
  registrationNumber: string;
  contactPerson: string;
  phone: string;
  address: string;
  operatingLatitude?: number;
  operatingLongitude?: number;
  operatingRadius?: number;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
}

const NgoApplicationSchema: Schema = new Schema(
  {
    userId: { type: String, required: true },
    email: { type: String, required: true },
    ngoName: { type: String, required: true },
    registrationNumber: { type: String, required: true },
    contactPerson: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    operatingLatitude: { type: Number },
    operatingLongitude: { type: Number },
    operatingRadius: { type: Number, default: 15 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const NgoApplication: Model<INgoApplication> =
  mongoose.models.NgoApplication ||
  mongoose.model<INgoApplication>("NgoApplication", NgoApplicationSchema);

export default NgoApplication;