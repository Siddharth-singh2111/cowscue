import twilio from "twilio";

// Strict fallbacks to keep TypeScript happy
const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
const authToken = process.env.TWILIO_AUTH_TOKEN || "";
const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER || "";
const targetNumber = process.env.NGO_WHATSAPP_NUMBER || "";

// Initialize only if keys exist (prevents crashes if you forget them)
const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export async function sendWhatsAppAlert(description: string, lat: number, lng: number) {
  if (!client) {
    console.warn("⚠️ Twilio credentials missing. Skipping WhatsApp alert.");
    return;
  }

  if (!targetNumber) {
    console.warn("⚠️ No NGO target number configured.");
    return;
  }

  // Generate a Google Maps deep link for the exact location
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  
  // Format the message nicely with emojis
  const message = `🚨 *Cowscue Emergency Alert* 🚨\n\n*Situation:* ${description}\n\n📍 *Location:* ${mapsLink}\n\nPlease check the Suraksha Command Center to accept this rescue mission.`;

  try {
    await client.messages.create({
      from: twilioNumber,
      to: targetNumber,
      body: message,
    });
    console.log("✅ WhatsApp alert sent to NGO successfully.");
  } catch (error) {
    console.error("❌ Failed to send WhatsApp alert:", error);
  }
}