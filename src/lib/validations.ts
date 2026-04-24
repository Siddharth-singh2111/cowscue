import { z } from "zod";

// ─── Phone Number ───────────────────────────────────────────────
// Indian phone numbers: optional +91 prefix, then 10 digits starting with 6-9
const indianPhoneRegex = /^(\+91[\s-]?)?[6-9]\d{9}$/;

export const phoneSchema = z
  .string()
  .trim()
  .regex(indianPhoneRegex, "Please enter a valid Indian phone number (e.g., +91 9876543210)");

// ─── Report Submission ──────────────────────────────────────────
export const createReportSchema = z.object({
  imageUrl: z
    .string()
    .url("Image URL must be a valid URL")
    .refine(
      (url) => url.includes("cloudinary.com") || url.includes("res.cloudinary.com"),
      "Image must be uploaded via Cloudinary"
    ),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description must be under 500 characters"),
  latitude: z
    .number()
    .min(-90, "Invalid latitude")
    .max(90, "Invalid latitude"),
  longitude: z
    .number()
    .min(-180, "Invalid longitude")
    .max(180, "Invalid longitude"),
  reporterPhone: phoneSchema,
});

// ─── Report Status Update ───────────────────────────────────────
export const updateReportStatusSchema = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("assigned"),
    ngoName: z.string().trim().min(1, "NGO name is required"),
    driverName: z.string().trim().min(1, "Driver name is required").optional(),
    driverPhone: phoneSchema.optional(),
  }),
  z.object({
    status: z.literal("resolved"),
    resolvedImageUrl: z
      .string()
      .url("Resolved image URL must be valid")
      .optional(),
  }),
]);

// ─── Nearby Reports Query ───────────────────────────────────────
export const nearbyQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(1).max(100).default(10),
});

// ─── NGO Application ───────────────────────────────────────────
export const ngoApplicationSchema = z.object({
  ngoName: z
    .string()
    .trim()
    .min(2, "NGO name must be at least 2 characters")
    .max(100, "NGO name must be under 100 characters"),
  registrationNumber: z
    .string()
    .trim()
    .min(3, "Registration number is required")
    .max(50, "Registration number is too long"),
  contactPerson: z
    .string()
    .trim()
    .min(2, "Contact person name is required")
    .max(100, "Name is too long"),
  phone: phoneSchema,
  address: z
    .string()
    .trim()
    .min(10, "Address must be at least 10 characters")
    .max(300, "Address must be under 300 characters"),
});

// ─── Chat Message ───────────────────────────────────────────────
export const chatMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Message cannot be empty")
    .max(1000, "Message is too long"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "model"]),
        content: z.string(),
      })
    )
    .max(50, "Conversation history is too long")
    .default([]),
});

// ─── WhatsApp Webhook ───────────────────────────────────────────
export const whatsappWebhookSchema = z.object({
  base64Image: z
    .string()
    .min(100, "Image data is required"),
  phone: z
    .string()
    .trim()
    .min(10, "Phone number is required"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// ─── NGO Status Toggle ─────────────────────────────────────────
export const ngoStatusSchema = z.object({
  isAccepting: z.boolean(),
});
