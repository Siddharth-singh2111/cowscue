import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Report from "@/models/Report";
import { currentUser } from "@clerk/nextjs/server";

export async function GET(req: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. Get Lat/Lng from URL Query Params
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const radiusKm = searchParams.get("radius") || "10"; // Default 10km

    if (!lat || !lng) {
      return NextResponse.json({ error: "Location required" }, { status: 400 });
    }

    await connectDB();

    // 2. The MongoDB Geospatial Query
    // $near requires a 2dsphere index (which we added in your Schema)
    const reports = await Report.find({
      status: "pending", // Only show active cases
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(lng), parseFloat(lat)], // [Lng, Lat] order is crucial
          },
          $maxDistance: parseInt(radiusKm) * 1000, // Convert km to meters
        },
      },
    });

    return NextResponse.json({ reports }, { status: 200 });
  } catch (error) {
    console.error("Geo Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}