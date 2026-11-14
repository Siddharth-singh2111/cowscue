import { route } from "@/server/http/route";
import { RateLimits } from "@/server/lib/rateLimit";
import { Errors } from "@/server/lib/errors";
import { enqueue } from "@/server/queue";
import { validateTwilioSignature } from "@/server/services/whatsappClient";

const EMPTY_TWIML = `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;

/**
 * Twilio WhatsApp webhook. Verifies the signature, enqueues the message and acks immediately;
 * the worker does the slow work and replies via the REST API (see services/whatsappBot.ts).
 */
export const POST = route({ rateLimit: RateLimits.webhook, rateLimitBy: "ip" }, async ({ req, log }) => {
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((v, k) => (params[k] = String(v)));

  if (process.env.NODE_ENV === "production") {
    const url = `${(process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "")}/api/webhook/twilio`;
    if (!validateTwilioSignature(req.headers.get("x-twilio-signature") || "", url, params)) {
      log.warn("rejected twilio webhook with invalid signature");
      throw Errors.forbidden("Invalid signature.");
    }
  }

  await enqueue("whatsapp.inbound", { params }, params.MessageSid ? { jobId: `wa:${params.MessageSid}` } : {});
  return new Response(EMPTY_TWIML, { headers: { "content-type": "text/xml" } });
});
