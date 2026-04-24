import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import NgoApplication from "@/models/NgoApplication";
import { requireAuth, isAuthError } from "@/lib/auth";

export async function GET() {
  try {
    const auth = await requireAuth("superadmin");
    if (isAuthError(auth)) return auth;

    await connectDB();

    // Fetch all applications, newest first
    const applications = await NgoApplication.find({}).sort({ createdAt: -1 });

    return NextResponse.json({ applications }, { status: 200 });
  } catch (error) {
    console.error("Admin Fetch Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}