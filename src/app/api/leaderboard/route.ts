// src/app/api/leaderboard/route.ts
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Report from "@/models/Report";

export async function GET() {
  try {
    await connectDB();

    // MongoDB Aggregation: Find resolved cases, group by user, count them, and sort top 10
    const leaders = await Report.aggregate([
      { $match: { status: "resolved" } },
      { 
        $group: {
          _id: "$reporterId",
          name: { $first: "$reporterName" },
          rescues: { $sum: 1 }
        } 
      },
      { $sort: { rescues: -1 } },
      { $limit: 10 }
    ]);

    // Format the response and calculate Karma (50 points per rescue)
    const formattedLeaders = leaders.map((leader, index) => ({
      rank: index + 1,
      id: leader._id,
      name: leader.name || "Anonymous Citizen",
      rescues: leader.rescues,
      karma: leader.rescues * 50,
    }));

    return NextResponse.json({ leaders: formattedLeaders }, { status: 200 });
  } catch (error) {
    console.error("Leaderboard Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}