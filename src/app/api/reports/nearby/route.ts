import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Report from "@/models/Report";
import { requireAuth, isAuthError } from "@/lib/auth";
import { nearbyQuerySchema } from "@/lib/validations";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;

    // Parse and validate query params with Zod (auto-coerces strings to numbers)
    const { searchParams } = new URL(req.url);
    const parsed = nearbyQuerySchema.safeParse({
      lat: searchParams.get("lat"),
      lng: searchParams.get("lng"),
      radius: searchParams.get("radius"),
    });

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid query parameters";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { lat, lng, radius } = parsed.data;

    await connectDB();

    const reports = await Report.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
          $maxDistance: radius * 1000,
        },
      },
    }).sort({ createdAt: -1 });

    return NextResponse.json({ reports }, { status: 200 });
  } catch (error) {
    console.error("Geo Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
