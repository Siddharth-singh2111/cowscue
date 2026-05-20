import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Report from "@/models/Report";
import { pusherServer } from "@/lib/pusher";

/**
 * POST /api/reports/[id]/driver-location
 * Updates the current GPS coordinates of the assigned driver and broadcasts it.
 */
export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const body = await req.json();
    const { latitude, longitude } = body;

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json(
        { error: "Invalid coordinates. Latitude and longitude must be numbers." },
        { status: 400 }
      );
    }

    await connectDB();

    const updatedReport = await Report.findByIdAndUpdate(
      params.id,
      {
        driverLatitude: latitude,
        driverLongitude: longitude,
      },
      { new: true }
    );

    if (!updatedReport) {
      return NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    // Broadcast the coordinates in real-time to the citizen's tracking page
    try {
      await pusherServer.trigger(`report-${params.id}`, "driver-moved", {
        latitude,
        longitude,
      });
      // Also broadcast to general updates for NGO command center maps
      await pusherServer.trigger("cowscue-alerts", "status-update", updatedReport);
    } catch (pusherErr) {
      console.error("Failed to broadcast driver location via Pusher:", pusherErr);
    }

    return NextResponse.json(
      { message: "Location updated successfully.", report: updatedReport },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating driver location:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
