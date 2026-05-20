import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Report from "@/models/Report";
import { requireAuth, isAuthError } from "@/lib/auth";
import { updateReportStatusSchema } from "@/lib/validations";
import { pusherServer } from "@/lib/pusher";
import { sendWhatsAppMessage } from "@/lib/twilio";

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    await connectDB();
    const report = await Report.findById(params.id);
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    return NextResponse.json({ report }, { status: 200 });
  } catch (error: unknown) {
    console.error("GET Report Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    // Only NGOs can update report status
    const auth = await requireAuth("ngo");
    if (isAuthError(auth)) return auth;

    const params = await props.params;
    const body = await req.json();

    await connectDB();

    // SCENARIO 3: NGO updating fundraising settings
    if ("isFundraising" in body) {
      const updatedReport = await Report.findOneAndUpdate(
        { _id: params.id },
        {
          isFundraising: body.isFundraising,
          fundraisingTitle: body.fundraisingTitle,
          fundraisingDescription: body.fundraisingDescription,
          fundraisingGoal: body.fundraisingGoal,
        },
        { new: true }
      );

      if (!updatedReport) {
        return NextResponse.json({ error: "Report not found." }, { status: 404 });
      }

      try {
        await pusherServer.trigger("cowscue-alerts", "status-update", updatedReport);
      } catch (e: unknown) {
        console.error("Pusher error:", e);
      }

      return NextResponse.json({ report: updatedReport }, { status: 200 });
    }

    // Validate the status transition
    const parsed = updateReportStatusSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid input";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const data = parsed.data;

    // SCENARIO 1: NGO Trying to Accept a Case
    if (data.status === "assigned") {
      const updatedReport = await Report.findOneAndUpdate(
        { _id: params.id, status: "pending" },
        {
          status: "assigned",
          ngoName: data.ngoName,
          driverName: data.driverName,
          driverPhone: data.driverPhone,
        },
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
      } catch (e: unknown) {
        console.error("Pusher error:", e);
      }

      // Notify WhatsApp users about their rescue being accepted with a live tracking link
      if (updatedReport.reporterId?.startsWith("whatsapp-") && updatedReport.reporterPhone) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://cowscue.vercel.app";
        const trackingUrl = `${appUrl}/track/${updatedReport._id}`;
        
        sendWhatsAppMessage(
          updatedReport.reporterPhone,
          "🚑 *Rescue Update!*\n\n" +
            `An NGO has accepted your rescue request. Driver *${updatedReport.driverName || "Team"}* is on the way.\n\n` +
            `📍 Track the ambulance live: ${trackingUrl}`
        ).catch((err: unknown) => console.error("WhatsApp notification failed:", err));
      }

      return NextResponse.json({ report: updatedReport }, { status: 200 });
    }

    // SCENARIO 2: NGO Resolving a Case
    if (data.status === "resolved") {
      const updatedReport = await Report.findOneAndUpdate(
        { _id: params.id },
        { status: "resolved", resolvedImageUrl: data.resolvedImageUrl },
        { new: true }
      );

      if (!updatedReport) {
        return NextResponse.json({ error: "Report not found." }, { status: 404 });
      }

      try {
        await pusherServer.trigger("cowscue-alerts", "status-update", updatedReport);
      } catch (e: unknown) {
        console.error("Pusher error:", e);
      }

      // Notify WhatsApp users about their rescue being completed
      if (updatedReport.reporterId?.startsWith("whatsapp-") && updatedReport.reporterPhone) {
        const rescueCount = (updatedReport.reporterHistory || 0) + 1;
        sendWhatsAppMessage(
          updatedReport.reporterPhone,
          "✅ *Rescue Successful!*\n\n" +
            "The cow has been safely rescued by the NGO.\n\n" +
            `⭐ *Karma Points:* You now have ${rescueCount} successful rescues!\n\n` +
            "Thank you for giving a voice to the voiceless. 🐄"
        ).catch((err: unknown) => console.error("WhatsApp notification failed:", err));
      }

      return NextResponse.json({ report: updatedReport }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid status transition" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Update Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}