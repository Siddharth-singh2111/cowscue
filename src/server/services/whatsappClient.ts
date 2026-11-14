import twilio from "twilio";
import { features } from "../config/env";
import { logger } from "../lib/logger";

let client: ReturnType<typeof twilio> | null | undefined;

function getClient() {
  if (client !== undefined) return client;
  client = features.twilio() ? twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!) : null;
  return client;
}

/** Normalises Indian/E.164 numbers to Twilio's `whatsapp:+<digits>` format. */
export function toWhatsAppAddress(phone: string): string {
  if (phone.startsWith("whatsapp:")) return phone;
  const trimmed = phone.replace(/[\s-]/g, "");
  if (trimmed.startsWith("+")) return `whatsapp:${trimmed}`;
  if (/^\d{10}$/.test(trimmed)) return `whatsapp:+91${trimmed}`;
  return `whatsapp:+${trimmed}`;
}

/**
 * Sends a WhatsApp message. Throws on provider errors so the queue can retry with backoff;
 * returns false (no throw) when Twilio simply isn't configured.
 */
export async function sendWhatsApp(to: string, body: string): Promise<boolean> {
  const c = getClient();
  if (!c) {
    logger.info({ to: "[redacted]", preview: body.slice(0, 60) }, "twilio not configured; whatsapp message skipped");
    return false;
  }
  await c.messages.create({ from: process.env.TWILIO_WHATSAPP_NUMBER, to: toWhatsAppAddress(to), body });
  return true;
}

export function validateTwilioSignature(signature: string, url: string, params: Record<string, string>): boolean {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return false;
  return twilio.validateRequest(token, signature, url, params);
}
