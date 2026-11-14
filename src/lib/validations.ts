import { z } from "zod";
import { CLOSE_REASONS } from "@/types";

/** Shared (client + server) input schemas. The server re-validates everything it receives. */

const indianPhoneRegex = /^(\+91[\s-]?)?[6-9]\d{9}$/;

export const phoneSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(indianPhoneRegex, "Enter a valid Indian mobile number, e.g. +91 98765 43210"));

const cloudinaryUrl = z
  .string()
  .url("Image URL must be a valid URL")
  .refine((url) => {
    try {
      return new URL(url).hostname === "res.cloudinary.com";
    } catch {
      return false;
    }
  }, "Images must be uploaded via Cloudinary");

const lat = z.number().min(-90).max(90);
const lng = z.number().min(-180).max(180);

export const createReportSchema = z.object({
  imageUrl: cloudinaryUrl,
  description: z
    .string()
    .trim()
    .min(10, "Please describe the situation in at least 10 characters")
    .max(500, "Keep the description under 500 characters"),
  latitude: lat,
  longitude: lng,
  reporterPhone: phoneSchema,
});

export const assignSchema = z.object({
  driverName: z.string().trim().min(2, "Driver name is required").max(80),
  driverPhone: phoneSchema,
});

export const resolveSchema = z.object({
  resolvedImageUrl: cloudinaryUrl,
  notes: z.string().trim().max(500).optional(),
});

export const closeSchema = z.object({
  reason: z.enum(CLOSE_REASONS),
  note: z.string().trim().max(300).optional(),
});

export const fundraiserSchema = z
  .object({
    active: z.boolean(),
    title: z.string().trim().max(100).optional(),
    description: z.string().trim().max(1000).optional(),
    goal: z.number().int().min(0).max(10_000_000).optional(),
  })
  .refine((v) => !v.active || (v.title && v.title.length >= 5 && v.description && v.description.length >= 20 && v.goal && v.goal >= 100), {
    message: "An active fundraiser needs a title (5+ chars), a description (20+ chars) and a goal of at least ₹100.",
  });

export const driverLocationSchema = z.object({
  latitude: lat,
  longitude: lng,
  accuracy: z.number().min(0).max(10_000).optional(),
});

export const donationSchema = z.object({
  amount: z.number().int("Whole rupees only").min(10, "Minimum donation is ₹10").max(100_000, "Maximum single donation is ₹1,00,000"),
  sponsorName: z.string().trim().max(60).optional(),
  message: z.string().trim().max(140).optional(),
});

export const feedQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radius: z.coerce.number().min(1).max(100).default(15),
});

export const ngoApplicationSchema = z.object({
  ngoName: z.string().trim().min(2, "NGO name must be at least 2 characters").max(100),
  registrationNumber: z.string().trim().min(3, "Registration number is required").max(50),
  contactPerson: z.string().trim().min(2, "Contact person is required").max(100),
  phone: phoneSchema,
  address: z.string().trim().min(10, "Address must be at least 10 characters").max(300),
  operatingLatitude: lat.optional(),
  operatingLongitude: lng.optional(),
  operatingRadius: z.number().min(1).max(100).optional(),
});

export const ngoProfileSchema = z.object({
  ngoName: z.string().trim().min(2).max(100),
  phone: phoneSchema,
  address: z.string().trim().min(10).max(300),
  operatingLatitude: lat.nullable().optional(),
  operatingLongitude: lng.nullable().optional(),
  operatingRadius: z.number().min(1).max(100),
});

export const ngoStatusSchema = z.object({ isAccepting: z.boolean() });

export const adminDecisionSchema = z.object({ reason: z.string().trim().max(300).optional() });

export const chatMessageSchema = z.object({
  message: z.string().trim().min(1, "Message cannot be empty").max(1000, "Message is too long"),
  history: z
    .array(z.object({ role: z.enum(["user", "model"]), content: z.string().max(4000) }))
    .max(30)
    .default([]),
});

export const whatsappBotSchema = z.object({
  base64Image: z.string().min(100, "Image data is required").max(12_000_000),
  phone: z.string().trim().min(10),
  latitude: lat,
  longitude: lng,
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
