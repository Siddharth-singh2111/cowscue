import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import NgoApplication from "@/models/NgoApplication";
import { currentUser } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const user = await currentUser();

    // 🔒 THE BOUNCER: Check if they are logged in AND have the superadmin role
    if (!user || user.publicMetadata?.role !== "superadmin") {
      return NextResponse.json(
        { error: "Forbidden. Super Admin access required." }, 
        { status: 403 }
      );
    }

    await connectDB();
    
    // Fetch all applications, newest first
    const applications = await NgoApplication.find({}).sort({ createdAt: -1 });
    
    return NextResponse.json({ applications }, { status: 200 });
  } catch (error) {
    console.error("Admin Fetch Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}