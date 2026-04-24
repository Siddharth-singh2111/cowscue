import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Report from "@/models/Report";
import { runAITriage } from "@/lib/aiTriage";
import { whatsappWebhookSchema } from "@/lib/validations";
import { pusherServer } from "@/lib/pusher";
import { sendWhatsAppAlert } from "@/lib/twilio";

export async function POST(req: Request) {
  try {
    // 1. Secret Key Auth (Only our Node.js bot knows this password)
    const authHeader = req.headers.get("authorization");
    const expectedToken = `Bearer ${process.env.BOT_SECRET_KEY}`;

    if (!authHeader || authHeader !== expectedToken) {
      console.error(
        `🚨 AUTH MISMATCH! Received: [${authHeader}] | Expected: [${expectedToken}]`
      );
      return NextResponse.json({ error: "Unauthorized Bot" }, { status: 401 });
    }

    // 2. Validate input
    const body = await req.json();
    const parsed = whatsappWebhookSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid input";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { base64Image, phone, latitude, longitude } = parsed.data;

    // 3. Upload Base64 Image to Cloudinary
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    const formData = new FormData();
    formData.append("file", `data:image/jpeg;base64,${base64Image}`);
    formData.append("upload_preset", uploadPreset!);

    const cloudRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: formData }
    );
    const cloudData = await cloudRes.json();
    const imageUrl = cloudData.secure_url;

    // 4. Gemini AI Verification + Triage (now uses shared utility)
    const triage = await runAITriage(base64Image);

    if (!triage || !triage.isCow) {
      return NextResponse.json({ error: "No cattle detected by AI." }, { status: 400 });
    }

    // 5. Save to Database
    await connectDB();
    const pastReports = await Report.countDocuments({
      reporterPhone: phone,
      status: "resolved",
    });

    const newReport = await Report.create({
      reporterId: `whatsapp-${phone}`,
      reporterName: "WhatsApp Citizen",
      reporterPhone: phone,
      reporterHistory: pastReports,
      imageUrl,
      description: "🚨 Emergency reported automatically via WhatsApp Bot.",
      severity: triage.severity,
      injuryType: triage.injuryType,
      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
      status: "pending",
    });

    // 6. Trigger Real-Time Dashboard & Twilio Alerts
    try {
      await pusherServer.trigger("cowscue-alerts", "new-report", newReport);
    } catch (e) {
      console.error("Pusher error:", e);
    }

    sendWhatsAppAlert(newReport.description, latitude, longitude).catch((err) =>
      console.error("WhatsApp alert failed:", err)
    );

    return NextResponse.json({ success: true, report: newReport }, { status: 201 });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}