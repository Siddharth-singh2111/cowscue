import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Report from "@/models/Report";
import { currentUser } from "@clerk/nextjs/server";

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { status } = await req.json(); // e.g., 'assigned' or 'resolved'
    
    await connectDB();

    // SCENARIO 1: NGO Trying to Accept a Case
    if (status === 'assigned') {
      // atomic update: Only update IF current status is 'pending'
      const updatedReport = await Report.findOneAndUpdate(
        { _id: params.id, status: 'pending' }, 
        { 
          status: 'assigned',
          // We can optionally add an 'assignedTo' field here later to track WHICH NGO took it
        },
        { new: true }
      );

      if (!updatedReport) {
        return NextResponse.json(
          { error: "This case has already been accepted by another NGO." }, 
          { status: 409 } // 409 Conflict
        );
      }
      
      return NextResponse.json({ report: updatedReport }, { status: 200 });
    }

    // SCENARIO 2: Marking as Resolved (Only allowed if it was already assigned)
    if (status === 'resolved') {
       const updatedReport = await Report.findOneAndUpdate(
        { _id: params.id }, 
        { status: 'resolved' },
        { new: true }
      );
      return NextResponse.json({ report: updatedReport }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid status transition" }, { status: 400 });

  } catch (error) {
    console.error("Update Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}