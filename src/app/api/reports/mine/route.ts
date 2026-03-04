// src/app/api/reports/mine/route.ts
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Report from "@/models/Report";
import { currentUser } from "@clerk/nextjs/server";

export async function GET(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // 1. Fetch all reports for this user
    const reports = await Report.find({ reporterId: user.id }).sort({ createdAt: -1 });

    // 2. 🏆 Calculate Karma Points (50 points per rescued cow)
    const resolvedCount = reports.filter(r => r.status === 'resolved').length;
    const karmaPoints = resolvedCount * 50;

    // Return both the reports and the user's stats
    return NextResponse.json({ 
      reports, 
      stats: {
        karmaPoints,
        rescuedCows: resolvedCount,
        totalReported: reports.length
      }
    }, { status: 200 });

  } catch (error) {
    console.error("Error fetching my reports:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}