// src/models/Report.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export interface IReport extends Document {
  reporterId: string; 
  reporterName: string;   
  reporterPhone: string;  
  reporterHistory: number; 
  imageUrl: string;  
  description: string;
  ngoName?: string;
  driverName?: string;
  driverPhone?: string;
  status: "pending" | "assigned" | "resolved";
  severity: "CRITICAL" | "MODERATE" | "ROUTINE";
  injuryType: string;
  resolvedImageUrl?:string;
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
    ngoName: { type: String },
  driverName: { type: String },
  driverPhone: { type: String },
    resolvedImageUrl: { type: String},
    description: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "assigned", "resolved"],
      default: "pending",
    },
    severity: {
      type: String,
      enum: ["CRITICAL", "MODERATE", "ROUTINE"],
      default: "ROUTINE",
    },
    injuryType: { type: String, default: "Unknown" },
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