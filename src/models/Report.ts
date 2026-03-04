// src/models/Report.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReport extends Document {
  reporterId: string; 
  reporterName: string;   // 🟢 NEW
  reporterPhone: string;  // 🟢 NEW
  reporterHistory: number; // 🟢 NEW: How many successful reports they had before this one
  imageUrl: string;  
  description: string;
  status: "pending" | "assigned" | "resolved";
  location: {
    type: "Point";
    coordinates: number[]; 
  };
  createdAt: Date;
}

const ReportSchema: Schema = new Schema(
  {
    reporterId: { type: String, required: true },
    reporterName: { type: String, required: true },
    reporterPhone: { type: String, required: true },
    reporterHistory: { type: Number, default: 0 },
    imageUrl: { type: String, required: true },
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "assigned", "resolved"],
      default: "pending",
    },
    location: {
      type: { type: String, enum: ["Point"], required: true },
      coordinates: { type: [Number], required: true },
    },
  },
  { timestamps: true }
);

ReportSchema.index({ location: "2dsphere" });

const Report: Model<IReport> = mongoose.models.Report || mongoose.model<IReport>("Report", ReportSchema);
export default Report;