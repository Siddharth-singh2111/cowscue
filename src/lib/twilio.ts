import twilio from "twilio";
import type { ReportSeverity } from "@/types";

const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
const authToken = process.env.TWILIO_AUTH_TOKEN || "";
const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER || "";
const targetNumber = process.env.NGO_WHATSAPP_NUMBER || "";

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

const SEVERITY_LABELS: Record<ReportSeverity, string> = {
  critical: "🔴 *CRITICAL* — Immediate response required",
  moderate: "🟡 *MODERATE* — Urgent but stable",
  routine: "🟢 *ROUTINE* — Standard rescue request",
};

export async function sendWhatsAppAlert(
  description: string,
  severity: ReportSeverity = "routine",
  lat: number,
  lng: number
) {
  if (!client) {
    console.warn("⚠️ Twilio credentials missing. Skipping WhatsApp alert.");
    return;
  }
  if (!targetNumber) {
    console.warn("⚠️ No NGO target number configured.");
    return;
  }

  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const prefix = severity === "critical" ? "🚨🚨 " : "🚨 ";

  const message =
    `${prefix}*Cowscue Emergency Alert*\n\n` +
    `*Severity:* ${SEVERITY_LABELS[severity]}\n` +
    `*Situation:* ${description}\n\n` +
    `📍 *Location:* ${mapsLink}\n\n` +
    `Open the Suraksha Command Center to accept this rescue.`;

  try {
    await client.messages.create({ from: twilioNumber, to: targetNumber, body: message });
    console.log(`✅ WhatsApp alert sent (severity: ${severity}).`);
  } catch (error) {
    console.error("❌ Failed to send WhatsApp alert:", error);
    throw error;
  }
}