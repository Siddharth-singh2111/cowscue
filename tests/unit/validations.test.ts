import { describe, expect, it } from "vitest";
import { createReportSchema, fundraiserSchema, phoneSchema } from "@/lib/validations";

const valid = {
  imageUrl: "https://res.cloudinary.com/demo/image/upload/cow.jpg",
  description: "Calf with an injured leg near the temple",
  latitude: 13.55,
  longitude: 79.99,
  reporterPhone: "+91 98765 43210",
};

describe("input validation", () => {
  it("normalises Indian phone numbers", () => {
    expect(phoneSchema.parse("+91 98765-43210")).toBe("+919876543210");
    expect(phoneSchema.parse("9876543210")).toBe("9876543210");
    expect(phoneSchema.safeParse("12345").success).toBe(false);
    expect(phoneSchema.safeParse("5876543210").success).toBe(false);
  });

  it("only accepts images hosted on Cloudinary (host check, not substring)", () => {
    expect(createReportSchema.safeParse(valid).success).toBe(true);
    expect(createReportSchema.safeParse({ ...valid, imageUrl: "https://evil.example/res.cloudinary.com/x.jpg" }).success).toBe(false);
    expect(createReportSchema.safeParse({ ...valid, imageUrl: "https://res.cloudinary.com.evil.io/x.jpg" }).success).toBe(false);
  });

  it("rejects out-of-range coordinates and short descriptions", () => {
    expect(createReportSchema.safeParse({ ...valid, latitude: 120 }).success).toBe(false);
    expect(createReportSchema.safeParse({ ...valid, description: "help" }).success).toBe(false);
  });

  it("requires complete details only when a fundraiser is active", () => {
    expect(fundraiserSchema.safeParse({ active: false }).success).toBe(true);
    expect(fundraiserSchema.safeParse({ active: true, title: "Help" }).success).toBe(false);
    expect(
      fundraiserSchema.safeParse({
        active: true,
        title: "Surgery for Gauri",
        description: "Gauri needs leg surgery and two weeks of post-op care.",
        goal: 15000,
      }).success
    ).toBe(true);
  });
});
