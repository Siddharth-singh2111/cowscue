import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Report from "@/models/Report";
import { currentUser } from "@clerk/nextjs/server";
import { checkIsAdmin } from "@/lib/utils";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { pusherServer } from "@/lib/pusher";
import { sendWhatsAppAlert } from "@/lib/twilio";
import type { ReportSeverity } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function verifyAndAssessSeverity(
  imageUrl: string
): Promise<{ isCattle: boolean; severity: ReportSeverity }> {
  try {
    const imageResp = await fetch(imageUrl);
    const arrayBuffer = await imageResp.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `Analyze this image and answer TWO questions:
1. Is there a cow, calf, bull, or cattle clearly visible? Answer: true or false
2. Assess severity:
   - "critical": bleeding, collapsed, broken limb, trapped
   - "moderate": limping, wound, distressed but mobile
   - "routine": healthy stray, minor/precautionary

Respond ONLY in this exact JSON format:
{"isCattle": true, "severity": "moderate"}`;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
    ]);

    const raw = result.response.text().trim().replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(raw);

    return {
      isCattle: parsed.isCattle === true,
      severity: (["critical", "moderate", "routine"].includes(parsed.severity)
        ? parsed.severity
        : "routine") as ReportSeverity,
    };
  } catch (err) {
    console.error("AI assessment failed, defaulting:", err);
    return { isCattle: true, severity: "routine" };
  }
}

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();
    const body = await req.json();
    const { imageUrl, description, latitude, longitude, reporterPhone } = body;

    if (!imageUrl || !description || !latitude || !longitude || !reporterPhone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const phoneRegex = /^\+?[\d\s\-]{10,15}$/;
    if (!phoneRegex.test(reporterPhone)) {
      return NextResponse.json({ error: "Invalid phone number format." }, { status: 400 });
    }

    const { isCattle, severity } = await verifyAndAssessSeverity(imageUrl);
    if (!isCattle) {
      return NextResponse.json(
        { error: "AI Verification Failed: No cow or cattle detected. Please upload a clearer photo." },
        { status: 400 }
      );
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
      location: { type: "Point", coordinates: [longitude, latitude] },
      status: "pending",
    });

    await Promise.allSettled([
      pusherServer
        .trigger("cowscue-alerts", "new-report", newReport)
        .catch((e) => console.error("Pusher failed:", e)),
      sendWhatsAppAlert(description, severity, latitude, longitude).catch((e) =>
        console.error("Twilio failed:", e)
      ),
    ]);

    return NextResponse.json(
      { message: "Report submitted successfully", report: newReport },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error submitting report:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const email = user.emailAddresses[0]?.emailAddress;
    if (!checkIsAdmin(email)) {
      return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    await connectDB();
    const reports = await Report.find({}).sort({ severity: 1, createdAt: -1 }).lean();
    return NextResponse.json({ reports }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}