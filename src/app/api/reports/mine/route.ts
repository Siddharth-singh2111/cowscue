import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Report from "@/models/Report";
import { currentUser } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const reports = await Report.find({ reporterId: user.id }).sort({ createdAt: -1 }).lean();

    const resolvedReports = reports.filter((r) => r.status === "resolved");
    const criticalRescues = resolvedReports.filter((r) => r.severity === "critical").length;
    const totalKarma = resolvedReports.length * 50 + criticalRescues * 50;

    return NextResponse.json(
      {
        reports,
        stats: {
          karmaPoints: totalKarma,
          rescuedCows: resolvedReports.length,
          criticalRescues,
          totalReported: reports.length,
          pendingReports: reports.filter((r) => r.status === "pending").length,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching my reports:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}