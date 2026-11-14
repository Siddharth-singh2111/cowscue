import mongoose, { Schema, type Model } from "mongoose";

/** Per-phone conversation state for the Twilio WhatsApp bot (survives restarts and scales across replicas). */
export interface IWhatsAppSession {
  phone: string;
  imageUrl: string | null;
  step: "awaiting_photo" | "awaiting_location";
  createdAt: Date;
  updatedAt: Date;
}

const WhatsAppSessionSchema = new Schema<IWhatsAppSession>(
  {
    phone: { type: String, required: true, unique: true },
    imageUrl: { type: String, default: null },
    step: { type: String, enum: ["awaiting_photo", "awaiting_location"], default: "awaiting_photo" },
  },
  { timestamps: true }
);

// Abandoned conversations expire after an hour.
WhatsAppSessionSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 3600 });

export const WhatsAppSession: Model<IWhatsAppSession> =
  (mongoose.models.WhatsAppSession as Model<IWhatsAppSession>) ||
  mongoose.model<IWhatsAppSession>("WhatsAppSession", WhatsAppSessionSchema);

export default WhatsAppSession;
