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

    // 🔍 FILTER: Only find reports where reporterId matches the logged-in user
    const reports = await Report.find({ reporterId: user.id }).sort({ createdAt: -1 });

    return NextResponse.json({ reports }, { status: 200 });
  } catch (error) {
    console.error("Error fetching my reports:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}