// src/app/api/reports/[id]/route.ts
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Report from "@/models/Report";
import { currentUser } from "@clerk/nextjs/server";
import { checkIsAdmin } from "@/lib/utils";

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  // 🟢 FIX 1: Await the params object (Required in Next.js 15+)
  const params = await props.params;


  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 🔒 SECURITY CHECK
    const email = user.emailAddresses[0]?.emailAddress;
    if (!checkIsAdmin(email)) {
       return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    await connectDB();

    // 2. Get the new status from the request body
    const { status } = await req.json();

    // 3. Find the report by ID and update it
    const updatedReport = await Report.findByIdAndUpdate(
      params.id,
      { status: status }, 
      { returnDocument: 'after' } // 🟢 FIX 2: Use modern Mongoose syntax instead of { new: true }
    );

    if (!updatedReport) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({ report: updatedReport }, { status: 200 });

  } catch (error) {
    console.error("Error updating report:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}