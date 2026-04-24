import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Report from "@/models/Report";
import WhatsAppSession from "@/models/WhatsAppSession";
import { runAITriage } from "@/lib/aiTriage";
import { pusherServer } from "@/lib/pusher";
import { sendWhatsAppAlert, sendWhatsAppMessage, validateTwilioSignature } from "@/lib/twilio";

/**
 * Twilio WhatsApp Webhook
 *
 * This replaces the old cowscue-bot (whatsapp-web.js + Puppeteer).
 * Twilio sends incoming WhatsApp messages here as form-encoded POST requests.
 *
 * Flow:
 * 1. User sends a photo → bot saves image URL, asks for location
 * 2. User sends location → bot runs AI triage, creates report, dispatches NGOs
 */
export async function POST(req: Request) {
  try {
    // 1. Parse Twilio's form-encoded body
    const formData = await req.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    // 2. Validate Twilio signature (prevent spoofed requests)
    const signature = req.headers.get("x-twilio-signature") || "";
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://cowscue.vercel.app"}/api/webhook/twilio`;

    if (process.env.NODE_ENV === "production") {
      const isValid = validateTwilioSignature(signature, webhookUrl, params);
      if (!isValid) {
        console.error("🚨 Invalid Twilio signature — possible spoofed request");
        return twimlResponse("❌ Unauthorized request.");
      }
    }

    // 3. Extract message data
    const from = params.From || "";           // "whatsapp:+919876543210"
    const body = params.Body || "";
    const numMedia = parseInt(params.NumMedia || "0");
    const mediaUrl = params.MediaUrl0 || "";
    const mediaType = params.MediaContentType0 || "";
    const latitude = params.Latitude;
    const longitude = params.Longitude;

    // Normalize phone number (remove "whatsapp:" prefix)
    const phone = from.replace("whatsapp:", "");

    await connectDB();

    // Get or create conversation state for this user
    let session = await WhatsAppSession.findOne({ phone });
    if (!session) {
      session = await WhatsAppSession.create({ phone, step: "awaiting_photo" });
    }

    // ─── STEP 1: Handle incoming image ──────────────────────────────
    if (numMedia > 0 && mediaType.startsWith("image/")) {
      // Twilio hosts the image — upload it to Cloudinary
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
      const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

      const cloudFormData = new FormData();
      cloudFormData.append("file", mediaUrl);
      cloudFormData.append("upload_preset", uploadPreset!);

      const cloudRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: cloudFormData }
      );
      const cloudData = await cloudRes.json();

      if (!cloudData.secure_url) {
        return twimlResponse("❌ Failed to save your image. Please try again.");
      }

      // Save image URL and advance to next step
      session.imageUrl = cloudData.secure_url;
      session.step = "awaiting_location";
      await session.save();

      return twimlResponse(
        "📸 Photo received! Now please share your *location*:\n\n" +
        "Tap the 📎 attachment icon → Location → Send your current location."
      );
    }

    // ─── STEP 2: Handle incoming location ───────────────────────────
    if (latitude && longitude) {
      if (!session.imageUrl || session.step !== "awaiting_location") {
        return twimlResponse("❌ Please send a photo of the injured cow first!");
      }

      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);

      // Run AI triage on the saved image
      let severity = "ROUTINE";
      let injuryType = "Unspecified";

      try {
        // Download image from Cloudinary for AI analysis
        const imageResp = await fetch(session.imageUrl);
        const arrayBuffer = await imageResp.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString("base64");

        const triage = await runAITriage(base64Data);

        if (triage) {
          if (!triage.isCow) {
            // Reset session so they can try again
            session.imageUrl = null;
            session.step = "awaiting_photo";
            await session.save();

            return twimlResponse(
              "❌ *AI Verification Failed*\n\n" +
              "Our AI couldn't detect a cow in your photo. Please send a clearer image."
            );
          }
          severity = triage.severity;
          injuryType = triage.injuryType;
        }
      } catch (aiError) {
        console.error("AI triage failed, proceeding with defaults:", aiError);
      }

      // Count past successful reports from this phone
      const phoneDigits = phone.replace("+", "");
      const pastReports = await Report.countDocuments({
        reporterPhone: phoneDigits,
        status: "resolved",
      });

      // Create the report
      const newReport = await Report.create({
        reporterId: `whatsapp-${phoneDigits}`,
        reporterName: "WhatsApp Citizen",
        reporterPhone: phoneDigits,
        reporterHistory: pastReports,
        imageUrl: session.imageUrl,
        description: "🚨 Emergency reported via WhatsApp.",
        severity,
        injuryType,
        location: {
          type: "Point",
          coordinates: [lng, lat],
        },
        status: "pending",
      });

      // Trigger real-time dashboard
      try {
        await pusherServer.trigger("cowscue-alerts", "new-report", newReport);
      } catch (e) {
        console.error("Pusher error:", e);
      }

      // Send alert to NGOs
      sendWhatsAppAlert(newReport.description, lat, lng).catch((err) =>
        console.error("NGO WhatsApp alert failed:", err)
      );

      // Clean up the session
      await WhatsAppSession.deleteOne({ phone });

      return twimlResponse(
        "✅ *Emergency Reported Successfully!*\n\n" +
        "Our AI has verified the image and dispatched nearby NGOs.\n" +
        `📊 Severity: *${severity}*\n` +
        `🏥 Condition: ${injuryType}\n\n` +
        "You'll receive updates when an NGO accepts the rescue."
      );
    }

    // ─── STEP 3: Handle text messages (help / default) ──────────────
    if (session.step === "awaiting_location" && session.imageUrl) {
      return twimlResponse(
        "📍 I already have your photo! Please send your *location* now:\n\n" +
        "Tap 📎 → Location → Send current location"
      );
    }

    return twimlResponse(
      "🚑 *Cowscue Emergency Bot*\n\n" +
      "To report an injured cow:\n" +
      "1️⃣ Send a *photo* of the cow\n" +
      "2️⃣ Share your *location*\n\n" +
      "Our AI will verify the image and dispatch the nearest NGO automatically."
    );
  } catch (error) {
    console.error("Twilio Webhook Error:", error);
    return twimlResponse("❌ Something went wrong. Please try again.");
  }
}

/**
 * Returns a TwiML response (Twilio Markup Language).
 * Twilio expects this XML format as the response to webhook requests.
 */
function twimlResponse(message: string) {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`;

  return new Response(twiml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

/**
 * Escapes special XML characters to prevent injection.
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
