import mongoose, { Schema, Document } from "mongoose";

/**
 * Tracks WhatsApp conversation state per user.
 * Replaces the old in-memory Map() from cowscue-bot/index.js.
 * Stored in MongoDB so it survives serverless cold starts.
 */
export interface IWhatsAppSession extends Document {
  phone: string;
  imageUrl: string | null;
  step: "awaiting_photo" | "awaiting_location";
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppSessionSchema = new Schema<IWhatsAppSession>(
  {
    phone: { type: String, required: true, unique: true, index: true },
    imageUrl: { type: String, default: null },
    step: {
      type: String,
      enum: ["awaiting_photo", "awaiting_location"],
      default: "awaiting_photo",
    },
  },
  { timestamps: true }
);

// Auto-expire stale sessions after 1 hour (prevents abandoned conversations from lingering)
WhatsAppSessionSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 3600 });

export default mongoose.models.WhatsAppSession ||
  mongoose.model<IWhatsAppSession>("WhatsAppSession", WhatsAppSessionSchema);
