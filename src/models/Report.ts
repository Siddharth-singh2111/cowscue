// src/models/Report.ts
import mongoose, { Schema, Document, Model } from "mongoose";

// 1. The TypeScript Interface (For our code to understand)
export interface IReport extends Document {
  reporterId: string; // From Clerk
  imageUrl: string;   // From Cloudinary
  description: string;
  status: "pending" | "assigned" | "resolved";
  location: {
    type: "Point";
    coordinates: number[]; // [longitude, latitude]
  };
  createdAt: Date;
  createdBy: string;
}

// 2. The Mongoose Schema (For the Database to understand)
const ReportSchema: Schema = new Schema(
  {
    reporterId: { type: String, required: true },
    imageUrl: { type: String, required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "assigned", "resolved"],
      default: "pending",
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
  },
  { timestamps: true }
);

// 3. The Geospatial Index (Crucial for "Find Near Me")
ReportSchema.index({ location: "2dsphere" });

// 4. Export the Model
// We check if the model exists first to prevent "OverwriteModelError" in Next.js
const Report: Model<IReport> =
  mongoose.models.Report || mongoose.model<IReport>("Report", ReportSchema);

export default Report;