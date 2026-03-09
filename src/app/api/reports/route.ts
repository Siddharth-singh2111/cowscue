// src/app/api/reports/route.ts
import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Report from "@/models/Report";
import { currentUser } from "@clerk/nextjs/server";
import { checkIsAdmin } from "@/lib/utils";
import { GoogleGenerativeAI } from "@google/generative-ai"; 
import { pusherServer } from "@/lib/pusher";
import { sendWhatsAppAlert } from "@/lib/twilio";

// Initialize Gemini with your API Key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { imageUrl, description, latitude, longitude,reporterPhone } = await req.json();

    if (!imageUrl || !description || !latitude || !longitude || !reporterPhone) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    let severity = "ROUTINE";
    let injuryType = "Unspecified";

    try {
      const imageResp = await fetch(imageUrl);
      const arrayBuffer = await imageResp.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString('base64');

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      // 🟢 The Upgraded Prompt
      const prompt = `Analyze this image. 
      1. Is there a cow, calf, bull, or cattle clearly visible? (true/false)
      2. Assess the medical severity: 'CRITICAL' (bleeding, unable to stand, severe trauma), 'MODERATE' (limping, visible wounds but stable), or 'ROUTINE' (starving, stray, minor issues).
      3. Provide a very brief 3-5 word description of the visible injury/condition.
      
      Return EXACTLY and ONLY a valid JSON object in this format: 
      {"isCow": true, "severity": "CRITICAL", "injuryType": "severe leg wound"}`;
      
      const result = await model.generateContent([
        prompt,
        { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
      ]);

      let aiText = result.response.text().trim();
      
      // Clean up markdown formatting if Gemini adds it (```json ... ```)
      if (aiText.startsWith("```json")) aiText = aiText.replace(/```json/g, "").replace(/```/g, "").trim();
      else if (aiText.startsWith("```")) aiText = aiText.replace(/```/g, "").trim();

      const aiData = JSON.parse(aiText);
      console.log("🤖 AI Triage Result:", aiData);

      if (!aiData.isCow) {
        return NextResponse.json(
          { error: "AI Verification Failed: We couldn't detect a cow/cattle in this image. Please upload a clearer photo to prevent spam." },
          { status: 400 }
        );
      }

      severity = aiData.severity || "ROUTINE";
      injuryType = aiData.injuryType || "Not clearly visible";

    } catch (aiError) {
      console.error("AI Check failed, proceeding with default ROUTINE severity:", aiError);
    }
    // ==========================================

    const reporterName = user.firstName 
      ? `${user.firstName} ${user.lastName || ""}`.trim() 
      : "Anonymous Citizen";

    const pastSuccessfulReports = await Report.countDocuments({ 
      reporterId: user.id, 
      status: 'resolved' 
    });

    const newReport = await Report.create({
      reporterId: user.id,
      reporterName: reporterName,
      reporterPhone: reporterPhone, 
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
    sendWhatsAppAlert(description, latitude, longitude);

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
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 🟢 Read Role from Clerk Metadata
    const role = user.publicMetadata?.role;
    if (role !== "ngo") {
       return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    await connectDB();
    const reports = await Report.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ reports }, { status: 200 });
  } catch (error) {
     return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}