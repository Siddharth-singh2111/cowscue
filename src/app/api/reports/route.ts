// src/app/api/reports/route.ts
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Report from "@/models/Report";
import { requireAuth, isAuthError } from "@/lib/auth";
import { createReportSchema } from "@/lib/validations";
import { runAITriage } from "@/lib/aiTriage";
import { pusherServer } from "@/lib/pusher";
import { sendWhatsAppAlert } from "@/lib/twilio";

export async function POST(req: Request) {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;
    const { user } = auth;

    // Validate request body
    const body = await req.json();
    const parsed = createReportSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid input";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { imageUrl, description, latitude, longitude, reporterPhone } = parsed.data;

    await connectDB();

    // AI Triage
    let severity = "ROUTINE";
    let injuryType = "Unspecified";

    try {
      const imageResp = await fetch(imageUrl);
      const arrayBuffer = await imageResp.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString("base64");

      const triage = await runAITriage(base64Data);

      if (triage) {
        if (!triage.isCow) {
          return NextResponse.json(
            {
              error:
                "AI Verification Failed: We couldn't detect a cow/cattle in this image. Please upload a clearer photo to prevent spam.",
            },
            { status: 400 }
          );
        }
        severity = triage.severity || "ROUTINE";
        injuryType = triage.injuryType || "Not clearly visible";
      }
    } catch (aiError) {
      console.error("AI Check failed, proceeding with default ROUTINE severity:", aiError);
    }

    const reporterName = user.firstName
      ? `${user.firstName} ${user.lastName || ""}`.trim()
      : "Anonymous Citizen";

    const pastSuccessfulReports = await Report.countDocuments({
      reporterId: user.id,
      status: "resolved",
    });

    const newReport = await Report.create({
      reporterId: user.id,
      reporterName,
      reporterPhone,
      reporterHistory: pastSuccessfulReports,
      imageUrl,
      description,
      severity,
      injuryType,
      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
      status: "pending",
    });

    // Trigger Pusher
    try {
      await pusherServer.trigger("cowscue-alerts", "new-report", newReport);
    } catch (pusherError) {
      console.error("Failed to trigger Pusher:", pusherError);
    }

    // Send WhatsApp alert (non-blocking but logged)
    sendWhatsAppAlert(description, latitude, longitude).catch((err) =>
      console.error("WhatsApp alert failed:", err)
    );

    return NextResponse.json(
      { message: "Report submitted successfully", report: newReport },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error submitting report:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const auth = await requireAuth("ngo");
    if (isAuthError(auth)) return auth;

    await connectDB();
    const reports = await Report.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ reports }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}