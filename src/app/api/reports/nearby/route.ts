import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Report from "@/models/Report";
import { currentUser } from "@clerk/nextjs/server";

const SEVERITY_ORDER: Record<string, number> = { critical: 0, moderate: 1, routine: 2 };

export async function GET(req: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const latStr = searchParams.get("lat");
    const lngStr = searchParams.get("lng");
    const radiusKm = searchParams.get("radius") || "10";
    const statusFilter = searchParams.get("status");

    if (!latStr || !lngStr) {
      return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
    }

    // FIX: Convert strings to numbers before passing to MongoDB
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);
    const radiusMeters = parseFloat(radiusKm) * 1000;

    if (isNaN(lat) || isNaN(lng) || isNaN(radiusMeters)) {
      return NextResponse.json({ error: "Invalid coordinates or radius" }, { status: 400 });
    }

    await connectDB();

    const query: Record<string, unknown> = {
      location: {
        $near: {
          $geometry: { type: "Point", coordinates: [lng, lat] },
          $maxDistance: radiusMeters,
        },
      },
    };

    if (statusFilter) query.status = statusFilter;

    const reports = await Report.find(query).lean();

    const sorted = reports.sort((a, b) => {
      const severityDiff =
        (SEVERITY_ORDER[a.severity] ?? 2) - (SEVERITY_ORDER[b.severity] ?? 2);
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({ reports: sorted }, { status: 200 });
  } catch (error) {
    console.error("Nearby query error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}