import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Report from "@/models/Report";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { pusherServer } from "@/lib/pusher";
import { sendWhatsAppAlert } from "@/lib/twilio";
import type { ReportSeverity } from "@/types";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const expectedToken = `Bearer ${process.env.BOT_SECRET_KEY}`;
    if (!authHeader || authHeader !== expectedToken) {
      console.error(`🚨 AUTH MISMATCH! Got: [${authHeader}]`);
      return NextResponse.json({ error: "Unauthorized Bot" }, { status: 401 });
    }

    const body = await req.json();
    const { base64Image, phone, latitude, longitude } = body;

    // Input validation
    if (!base64Image || !phone || latitude == null || longitude == null) {
      return NextResponse.json(
        { error: "Missing required fields: base64Image, phone, latitude, longitude" },
        { status: 400 }
      );
    }
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return NextResponse.json(
        { error: "latitude and longitude must be numbers" },
        { status: 400 }
      );
    }

    // Upload to Cloudinary
    const formData = new FormData();
    formData.append("file", `data:image/jpeg;base64,${base64Image}`);
    formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);

    const cloudRes = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
      { method: "POST", body: formData }
    );
    if (!cloudRes.ok) return NextResponse.json({ error: "Image upload failed" }, { status: 500 });
    const { secure_url: imageUrl } = await cloudRes.json();

    // Gemini: verify + assess severity
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `Analyze this image:
1. Is cattle visible? true or false
2. Severity: "critical" (bleeding/collapsed/trapped), "moderate" (limping/wounded), "routine" (healthy stray)
JSON only: {"isCattle": true, "severity": "moderate"}`;

    let severity: ReportSeverity = "routine";
    try {
      const result = await model.generateContent([
        prompt,
        { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
      ]);
      const parsed = JSON.parse(result.response.text().trim().replace(/```json|```/g, ""));
      if (!parsed.isCattle) {
        return NextResponse.json({ error: "No cattle detected by AI." }, { status: 400 });
      }
      if (["critical", "moderate", "routine"].includes(parsed.severity)) {
        severity = parsed.severity;
      }
    } catch (e) {
      console.error("AI check failed, allowing through as routine:", e);
    }

    await connectDB();
    const pastReports = await Report.countDocuments({ reporterPhone: phone, status: "resolved" });

    const newReport = await Report.create({
      reporterId: `whatsapp-${phone}`,
      reporterName: "WhatsApp Citizen",
      reporterPhone: phone,
      reporterHistory: pastReports,
      imageUrl,
      description: "🚨 Emergency reported via WhatsApp Bot.",
      severity,
      location: { type: "Point", coordinates: [longitude, latitude] },
      status: "pending",
    });

    await Promise.allSettled([
      pusherServer.trigger("cowscue-alerts", "new-report", newReport),
      sendWhatsAppAlert(newReport.description, severity, latitude, longitude),
    ]);

    return NextResponse.json({ success: true, report: newReport }, { status: 201 });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}