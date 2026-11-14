import { timingSafeEqual } from "node:crypto";
import { route } from "@/server/http/route";
import { RateLimits } from "@/server/lib/rateLimit";
import { Errors } from "@/server/lib/errors";
import { whatsappBotSchema } from "@/lib/validations";
import { uploadImage } from "@/server/services/media";
import { triageImage } from "@/server/services/triage";
import { createReport } from "@/server/services/reports";

/** Legacy endpoint for the self-hosted whatsapp-web.js bot (cowscue-bot/). Bearer-secret protected. */
export const POST = route({ rateLimit: RateLimits.webhook, rateLimitBy: "ip" }, async (ctx) => {
  const secret = process.env.BOT_SECRET_KEY;
  const given = (ctx.req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    throw Errors.unauthorized("Unauthorized bot.");
  }

  const { base64Image, phone, latitude, longitude } = await ctx.body(whatsappBotSchema);
  const triage = await triageImage({ base64: base64Image });
  if (!triage.isCattle) throw Errors.unprocessable("No cattle detected in the image.");
  const imageUrl = await uploadImage(`data:image/jpeg;base64,${base64Image}`);
  const digits = phone.replace(/\D/g, "");

  const result = await createReport({
    reporterId: `whatsapp-${digits}`,
    reporterName: "WhatsApp citizen",
    reporterPhone: digits,
    channel: "whatsapp",
    imageUrl,
    description: "Emergency reported via the WhatsApp bot.",
    latitude,
    longitude,
    triage,
  });
  return Response.json(result, { status: 201 });
});
