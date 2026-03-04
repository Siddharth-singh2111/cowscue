import mongoose, { Schema, Document, Model } from "mongoose";
import { ReportStatus, ReportSeverity } from "@/types";

export interface IReport extends Document {
  reporterId: string;
  reporterName: string;
  reporterPhone: string;
  reporterHistory: number;
  imageUrl: string;
  description: string;
  severity: ReportSeverity;
  ngoNotes: string;
  assignedTo: string;
  status: ReportStatus;
  location: { type: "Point"; coordinates: number[] };
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema: Schema = new Schema(
  {
    reporterId: { type: String, required: true },
    reporterName: { type: String, required: true },
    reporterPhone: { type: String, required: true },
    reporterHistory: { type: Number, default: 0 },
    imageUrl: { type: String, required: true },
    description: { type: String, required: true },
    severity: {
      type: String,
      enum: ["critical", "moderate", "routine"],
      default: "routine",
    },
    ngoNotes: { type: String, default: "" },
    assignedTo: { type: String, default: "" },
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
ReportSchema.index({ reporterId: 1, status: 1 });
ReportSchema.index({ severity: 1, status: 1, createdAt: -1 });

const Report: Model<IReport> =
  mongoose.models.Report || mongoose.model<IReport>("Report", ReportSchema);

export default Report;