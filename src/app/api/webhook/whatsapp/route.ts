import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Report from "@/models/Report";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { pusherServer } from "@/lib/pusher";
import { sendWhatsAppAlert } from "@/lib/twilio";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    // 1. Secret Key Auth (Only our Node.js bot knows this password)
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.BOT_SECRET_KEY}`) {
      return NextResponse.json({ error: "Unauthorized Bot" }, { status: 401 });
    }

    const { base64Image, phone, latitude, longitude } = await req.json();

    // 2. Upload Base64 Image directly to Cloudinary via REST API
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    
    const formData = new FormData();
    formData.append("file", `data:image/jpeg;base64,${base64Image}`);
    formData.append("upload_preset", uploadPreset!);

    const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });
    const cloudData = await cloudRes.json();
    const imageUrl = cloudData.secure_url;

    // 3. Gemini AI Verification
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = "Analyze this image. Is there a cow, calf, bull, or cattle clearly visible in it? Answer strictly with the word 'true' or 'false'.";
    
    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
    ]);

    const aiText = result.response.text().trim().toLowerCase();
    if (!aiText.includes("true")) {
      return NextResponse.json({ error: "No cattle detected by AI." }, { status: 400 });
    }

    // 4. Save to Database
    await connectDB();
    const pastReports = await Report.countDocuments({ reporterPhone: phone, status: 'resolved' });

    const newReport = await Report.create({
      reporterId: `whatsapp-${phone}`, // Mark as WhatsApp user
      reporterName: "WhatsApp Citizen", 
      reporterPhone: phone,
      reporterHistory: pastReports,
      imageUrl,
      description: "🚨 Emergency reported automatically via WhatsApp Bot.",
      location: {
        type: "Point",
        coordinates: [longitude, latitude],
      },
      status: "pending",
    });

    // 5. Trigger Real-Time Dashboard & Twilio Alerts
    try { await pusherServer.trigger("cowscue-alerts", "new-report", newReport); } catch (e) {}
    sendWhatsAppAlert(newReport.description, latitude, longitude);

    return NextResponse.json({ success: true, report: newReport }, { status: 201 });

  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}