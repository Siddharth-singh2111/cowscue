import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Report from "@/models/Report";
import { currentUser } from "@clerk/nextjs/server";
import { pusherServer } from "@/lib/pusher"; 

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
// ✅ Read the body once and extract everything:
const body = await req.json();
const status = body.status;
const resolvedImageUrl = body.resolvedImageUrl;
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    
    
    await connectDB();

    // SCENARIO 1: NGO Trying to Accept a Case
    if (status === 'assigned') {
      const { ngoName, driverName, driverPhone } = body;
      const updatedReport = await Report.findOneAndUpdate(
        { _id: params.id, status: 'pending' }, 
        { status: 'assigned',ngoName,driverName,driverPhone },
        { new: true }
      );

      if (!updatedReport) {
        return NextResponse.json(
          { error: "This case has already been accepted by another NGO or doesn't exist." }, 
          { status: 409 } 
        );
      }
      
      try {
        await pusherServer.trigger("cowscue-alerts", "status-update", updatedReport);
      } catch (e) { console.error("Pusher error:", e); }

      return NextResponse.json({ report: updatedReport }, { status: 200 });
    }
    if (status === 'resolved') {
     
       const updatedReport = await Report.findOneAndUpdate(
        { _id: params.id }, 
        { status: 'resolved',resolvedImageUrl },
        { new: true }
      );

      if (!updatedReport) {
        return NextResponse.json({ error: "Report not found." }, { status: 404 });
      }

     
      try {
        await pusherServer.trigger("cowscue-alerts", "status-update", updatedReport);
      } catch (e) { console.error("Pusher error:", e); }

      return NextResponse.json({ report: updatedReport }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid status transition" }, { status: 400 });

  } catch (error) {
    console.error("Update Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}