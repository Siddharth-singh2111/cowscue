import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Report from "@/models/Report";

export const revalidate = 60;

export async function GET() {
  try {
    await connectDB();

    const [
      totalReports,
      resolvedReports,
      pendingReports,
      assignedReports,
      criticalCases,
      uniqueReporters,
    ] = await Promise.all([
      Report.countDocuments({}),
      Report.countDocuments({ status: "resolved" }),
      Report.countDocuments({ status: "pending" }),
      Report.countDocuments({ status: "assigned" }),
      Report.countDocuments({ severity: "critical" }),
      Report.distinct("reporterId").then((ids) => ids.length),
    ]);

    const recentRescues = await Report.find({ status: "resolved" })
      .sort({ updatedAt: -1 })
      .limit(10)
      .select("reporterName imageUrl description createdAt severity")
      .lean();

    return NextResponse.json(
      {
        stats: {
          totalReports,
          resolvedReports,
          pendingReports,
          assignedReports,
          criticalCases,
          totalCitizenReporters: uniqueReporters,
          successRate:
            totalReports > 0
              ? Math.round((resolvedReports / totalReports) * 100)
              : 0,
        },
        recentRescues,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}