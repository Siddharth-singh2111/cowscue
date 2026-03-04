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

    // ==========================================
    // 🤖 AI SPAM PREVENTION VERIFICATION
    // ==========================================
    try {
      const imageResp = await fetch(imageUrl);
      const arrayBuffer = await imageResp.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString('base64');

      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const prompt = "Analyze this image. Is there a cow, calf, bull, or cattle clearly visible in it? Answer strictly with the word 'true' or 'false'.";
      
      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: "image/jpeg", 
          },
        },
      ]);

      const aiText = result.response.text().trim().toLowerCase();
      console.log("AI Verdict:", aiText);

      if (!aiText.includes("true")) {
        return NextResponse.json(
          { error: "AI Verification Failed: We couldn't detect a cow/cattle in this image. Please upload a clearer photo to prevent spam." },
          { status: 400 }
        );
      }
    } catch (aiError) {
      console.error("AI Check failed, proceeding anyway to avoid blocking real reports:", aiError);
    }
    // ==========================================
const reporterName = user.firstName 
      ? `${user.firstName} ${user.lastName || ""}`.trim() 
      : "Anonymous Citizen";

    // 2. Calculate their "Trust Score" (Karma) on the fly
    const pastSuccessfulReports = await Report.countDocuments({ 
      reporterId: user.id, 
      status: 'resolved' 
    });
    // 5. Create the new Report in MongoDB
   const newReport = await Report.create({
      reporterId: user.id,
      reporterName: reporterName,
      reporterPhone: reporterPhone, // We will send this from the frontend
      reporterHistory: pastSuccessfulReports,
      imageUrl,
      description,
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
    
  } catch (error) { // 🟢 THIS IS WHAT WAS MISSING! 
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

    const email = user.emailAddresses[0]?.emailAddress;
    if (!checkIsAdmin(email)) {
       return NextResponse.json({ error: "Forbidden: Admins only" }, { status: 403 });
    }

    await connectDB();
    const reports = await Report.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ reports }, { status: 200 });
  } catch (error) {
     return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}