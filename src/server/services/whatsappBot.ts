import { connectDB } from "../db/connect";
import { WhatsAppSession } from "../models/WhatsAppSession";
import { AppError } from "../lib/errors";
import { logger } from "../lib/logger";
import { sendWhatsApp } from "./whatsappClient";
import { uploadImage } from "./media";
import { triageImage } from "./triage";
import { createReport } from "./reports";

const HELP =
  "🐄 *Cowscue emergency line*\n\n" +
  "To report an injured cow:\n" +
  "1️⃣ Send a *photo* of the animal\n" +
  "2️⃣ Share your *location* (📎 → Location)\n\n" +
  "Our AI checks the photo and alerts the nearest rescue team instantly.";

/**
 * Twilio WhatsApp conversation state machine: photo → location → report.
 *
 * Runs in the worker (the webhook only enqueues), so slow steps — downloading media, uploading to
 * Cloudinary, multi-second AI triage — never hit Twilio's 15s webhook timeout. Replies are sent via
 * the REST API instead of TwiML.
 */
export async function processInboundWhatsApp(params: Record<string, string>) {
  const phone = (params.From || "").replace("whatsapp:", "");
  if (!phone) return;
  const reply = (text: string) => sendWhatsApp(phone, text);

  await connectDB();
  const session =
    (await WhatsAppSession.findOne({ phone })) ?? (await WhatsAppSession.create({ phone, step: "awaiting_photo" }));

  const numMedia = Number(params.NumMedia || 0);
  const mediaType = params.MediaContentType0 || "";

  if (numMedia > 0 && mediaType.startsWith("image/")) {
    const imageUrl = await uploadImage(params.MediaUrl0!);
    session.imageUrl = imageUrl;
    session.step = "awaiting_location";
    await session.save();
    await reply("📸 Got the photo! Now share your *location* so we can send help:\n\nTap 📎 → Location → Send your current location.");
    return;
  }

  if (params.Latitude && params.Longitude) {
    if (!session.imageUrl || session.step !== "awaiting_location") {
      await reply("Please send a *photo* of the injured animal first, then your location.");
      return;
    }
    const lat = Number(params.Latitude);
    const lng = Number(params.Longitude);
    const triage = await triageImage({ imageUrl: session.imageUrl });

    if (!triage.isCattle) {
      session.imageUrl = null;
      session.step = "awaiting_photo";
      await session.save();
      await reply("❌ Our AI couldn't see a cow in that photo. Please send a clearer picture of the animal.");
      return;
    }

    const digits = phone.replace(/^\+/, "");
    try {
      const { report, duplicate } = await createReport({
        reporterId: `whatsapp-${digits}`,
        reporterName: "WhatsApp citizen",
        reporterPhone: digits,
        channel: "whatsapp",
        imageUrl: session.imageUrl,
        description: params.Body?.trim() || "Emergency reported via WhatsApp.",
        latitude: lat,
        longitude: lng,
        triage,
      });
      await WhatsAppSession.deleteOne({ phone });
      const track = `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? ""}/track/${report.id}`;
      await reply(
        `✅ *Emergency reported*\n\n📊 Severity: *${triage.severity}*\n🩺 ${triage.injuryType}\n\n` +
          (duplicate ? "Someone already reported this animal — responders are on it.\n\n" : "Nearby rescue teams have been alerted.\n\n") +
          `*While you wait:*\n${triage.firstAid.map((s) => `• ${s}`).join("\n")}\n\n📍 Track live: ${track}`
      );
    } catch (err) {
      if (err instanceof AppError) {
        await reply(`❌ ${err.message}`);
        return;
      }
      throw err;
    }
    return;
  }

  if (session.step === "awaiting_location" && session.imageUrl) {
    await reply("📍 I have your photo — please share your *location* now (📎 → Location).");
    return;
  }
  logger.debug({ step: session.step }, "whatsapp help message");
  await reply(HELP);
}
