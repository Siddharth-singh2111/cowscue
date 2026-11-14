import mongoose, { Schema, type Model, type Types } from "mongoose";
import {
  CLOSE_REASONS,
  REPORT_STATUSES,
  SEVERITIES,
  type CloseReason,
  type ReportStatus,
  type Severity,
  type TimelineEventType,
} from "@/types";

export interface ITimelineEvent {
  type: TimelineEventType;
  at: Date;
  actor?: string;
  message: string;
}

export interface IReport {
  _id: Types.ObjectId;
  reporterId: string;
  reporterName: string;
  reporterPhone: string;
  reporterHistory: number;
  channel: "web" | "whatsapp";

  imageUrl: string;
  description: string;
  location: { type: "Point"; coordinates: number[] };

  status: ReportStatus;
  severity: Severity;
  injuryType: string;
  triageConfidence?: number;
  triageSource?: "ai" | "fallback";
  firstAid: string[];

  ngoUserId?: string;
  ngoId?: Types.ObjectId;
  ngoName?: string;
  driverName?: string;
  driverPhone?: string;
  driverLatitude?: number;
  driverLongitude?: number;
  driverUpdatedAt?: Date;

  assignedAt?: Date;
  enRouteAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  closeReason?: CloseReason;
  resolvedImageUrl?: string;
  resolutionNotes?: string;

  escalationLevel: number;
  lastEscalatedAt?: Date;
  notifiedNgoIds: Types.ObjectId[];

  duplicateOf?: Types.ObjectId;
  duplicateCount: number;

  isFundraising: boolean;
  fundraisingTitle?: string;
  fundraisingDescription?: string;
  fundraisingGoal: number;
  fundraisingRaised: number;
  donorCount: number;

  timeline: ITimelineEvent[];
  createdAt: Date;
  updatedAt: Date;
}

const TimelineSchema = new Schema<ITimelineEvent>(
  {
    type: { type: String, required: true },
    at: { type: Date, default: Date.now },
    actor: { type: String },
    message: { type: String, required: true },
  },
  { _id: false }
);

const ReportSchema = new Schema<IReport>(
  {
    reporterId: { type: String, required: true },
    reporterName: { type: String, required: true },
    reporterPhone: { type: String, required: true },
    reporterHistory: { type: Number, default: 0 },
    channel: { type: String, enum: ["web", "whatsapp"], default: "web" },

    imageUrl: { type: String, required: true },
    description: { type: String, required: true },
    location: {
      type: { type: String, enum: ["Point"], required: true },
      coordinates: { type: [Number], required: true },
    },

    status: { type: String, enum: REPORT_STATUSES, default: "pending" },
    severity: { type: String, enum: SEVERITIES, default: "ROUTINE" },
    injuryType: { type: String, default: "Unspecified" },
    triageConfidence: { type: Number },
    triageSource: { type: String, enum: ["ai", "fallback"] },
    firstAid: { type: [String], default: [] },

    ngoUserId: { type: String },
    ngoId: { type: Schema.Types.ObjectId, ref: "NgoApplication" },
    ngoName: { type: String },
    driverName: { type: String },
    driverPhone: { type: String },
    driverLatitude: { type: Number },
    driverLongitude: { type: Number },
    driverUpdatedAt: { type: Date },

    assignedAt: { type: Date },
    enRouteAt: { type: Date },
    resolvedAt: { type: Date },
    closedAt: { type: Date },
    closeReason: { type: String, enum: CLOSE_REASONS },
    resolvedImageUrl: { type: String },
    resolutionNotes: { type: String },

    escalationLevel: { type: Number, default: 0 },
    lastEscalatedAt: { type: Date },
    notifiedNgoIds: { type: [Schema.Types.ObjectId], default: [] },

    duplicateOf: { type: Schema.Types.ObjectId, ref: "Report" },
    duplicateCount: { type: Number, default: 0 },

    isFundraising: { type: Boolean, default: false },
    fundraisingTitle: { type: String },
    fundraisingDescription: { type: String },
    fundraisingGoal: { type: Number, default: 0 },
    fundraisingRaised: { type: Number, default: 0 },
    donorCount: { type: Number, default: 0 },

    timeline: { type: [TimelineSchema], default: [] },
  },
  { timestamps: true }
);

// Geo queries (nearby feed, duplicate detection) + the hot paths of each dashboard.
ReportSchema.index({ location: "2dsphere" });
ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ reporterId: 1, createdAt: -1 });
ReportSchema.index({ ngoUserId: 1, status: 1, createdAt: -1 });
ReportSchema.index({ status: 1, resolvedAt: -1 });

export const Report: Model<IReport> =
  (mongoose.models.Report as Model<IReport>) || mongoose.model<IReport>("Report", ReportSchema);

export default Report;
