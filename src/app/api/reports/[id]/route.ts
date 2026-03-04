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

  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { status, ngoNotes } = body;

    if (!status) return NextResponse.json({ error: "Status is required" }, { status: 400 });

    await connectDB();

    if (status === "assigned") {
      const ngoName = user.firstName
        ? `${user.firstName} ${user.lastName || ""}`.trim()
        : user.emailAddresses[0]?.emailAddress || "Unknown NGO";

      const updatedReport = await Report.findOneAndUpdate(
        { _id: params.id, status: "pending" },
        { status: "assigned", assignedTo: ngoName, ...(ngoNotes ? { ngoNotes } : {}) },
        { new: true }
      );

      if (!updatedReport) {
        return NextResponse.json(
          { error: "Case already accepted by another NGO or doesn't exist." },
          { status: 409 }
        );
      }

      await pusherServer
        .trigger("cowscue-alerts", "status-update", updatedReport)
        .catch((e) => console.error("Pusher error:", e));

      return NextResponse.json({ report: updatedReport }, { status: 200 });
    }

    if (status === "resolved") {
      const updatedReport = await Report.findByIdAndUpdate(
        params.id,
        { status: "resolved", ...(ngoNotes ? { ngoNotes } : {}) },
        { new: true }
      );

      if (!updatedReport) {
        return NextResponse.json({ error: "Report not found." }, { status: 404 });
      }

      await pusherServer
        .trigger("cowscue-alerts", "status-update", updatedReport)
        .catch((e) => console.error("Pusher error:", e));

      return NextResponse.json({ report: updatedReport }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid status." }, { status: 400 });
  } catch (error) {
    console.error("Update Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}