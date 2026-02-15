// src/app/api/reports/route.ts
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Report from "@/models/Report";
import { currentUser } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    // 1. Check if user is logged in
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Connect to Database
    await connectDB();

    // 3. Parse the incoming data
    const { imageUrl, description, latitude, longitude } = await req.json();

    // 4. Validate data
    if (!imageUrl || !description || !latitude || !longitude) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 5. Create the new Report
    const newReport = await Report.create({
      reporterId: user.id,
      imageUrl,
      description,
      location: {
        type: "Point",
        coordinates: [longitude, latitude], // MongoDB expects [Lng, Lat]
      },
      status: "pending",
    });

    return NextResponse.json(
      { message: "Report submitted successfully", report: newReport },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error submitting report:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}