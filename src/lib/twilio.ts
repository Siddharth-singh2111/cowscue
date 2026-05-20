import twilio from "twilio";
import NgoApplication from "@/models/NgoApplication";

// Strict fallbacks to keep TypeScript happy
const accountSid = process.env.TWILIO_ACCOUNT_SID || "";
const authToken = process.env.TWILIO_AUTH_TOKEN || "";
const twilioNumber = process.env.TWILIO_WHATSAPP_NUMBER || "";
const targetNumber = process.env.NGO_WHATSAPP_NUMBER || "";

// Initialize only if keys exist (prevents crashes if you forget them)
const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

// Helper to format number for Twilio WhatsApp
function formatWhatsAppNumber(phone: string): string {
  if (phone.startsWith("whatsapp:")) return phone;
  const digitsOnly = phone.trim();
  if (digitsOnly.startsWith("+")) {
    return `whatsapp:${digitsOnly}`;
  }
  if (digitsOnly.length === 10) {
    return `whatsapp:+91${digitsOnly}`;
  }
  return `whatsapp:+${digitsOnly}`;
}

// Haversine formula to compute distance in km
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Send proactive WhatsApp alerts to NGOs whose geofence matches the report coordinates.
 */
export async function sendWhatsAppAlert(
  description: string,
  lat: number,
  lng: number,
  specificNgoPhone?: string
) {
  if (!client) {
    console.warn("⚠️ Twilio credentials missing. Skipping WhatsApp alert.");
    return;
  }

  let targetPhones: string[] = [];

  if (specificNgoPhone) {
    targetPhones = [specificNgoPhone];
  } else {
    try {
      const activeNgos = await NgoApplication.find({ status: "approved" });
      
      for (const ngo of activeNgos) {
        if (ngo.phone) {
          // If geofence is defined, check proximity
          if (ngo.operatingLatitude != null && ngo.operatingLongitude != null) {
            const distance = getDistanceKm(lat, lng, ngo.operatingLatitude, ngo.operatingLongitude);
            const radius = ngo.operatingRadius || 15;
            if (distance <= radius) {
              targetPhones.push(ngo.phone);
            }
          } else {
            // Fallback: If they don't have operating coordinates set, alert them as general fallback
            targetPhones.push(ngo.phone);
          }
        }
      }
    } catch (dbErr) {
      console.error("Failed to query active NGOs for WhatsApp alert:", dbErr);
    }
  }

  // Fallback to default NGO target number if no matching active NGO found
  if (targetPhones.length === 0 && targetNumber) {
    targetPhones = [targetNumber];
  }

  if (targetPhones.length === 0) {
    console.warn("⚠️ No NGO target numbers found to alert.");
    return;
  }

  // Generate a Google Maps deep link for the exact location
  const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
  
  // Format the message nicely with emojis
  const message = `🚨 *Cowscue Emergency Alert* 🚨\n\n*Situation:* ${description}\n\n📍 *Location:* ${mapsLink}\n\nPlease check the Suraksha Command Center to accept this rescue mission.`;

  // Send the message to all targets
  for (const phone of targetPhones) {
    try {
      const formattedTo = formatWhatsAppNumber(phone);
      await client.messages.create({
        from: twilioNumber,
        to: formattedTo,
        body: message,
      });
      console.log(`✅ WhatsApp alert sent to NGO (${formattedTo}) successfully.`);
    } catch (error) {
      console.error(`❌ Failed to send WhatsApp alert to ${phone}:`, error);
    }
  }
}

/**
 * Send a WhatsApp message to a specific user (used for bot replies and status updates).
 */
export async function sendWhatsAppMessage(to: string, body: string) {
  if (!client) {
    console.warn("⚠️ Twilio credentials missing. Skipping WhatsApp message.");
    return;
  }

  try {
    await client.messages.create({
      from: twilioNumber,
      to: `whatsapp:${to.startsWith("+") ? to : `+${to}`}`,
      body,
    });
  } catch (error) {
    console.error(`❌ Failed to send WhatsApp message to ${to}:`, error);
  }
}

/**
 * Validate that an incoming request actually comes from Twilio.
 * Uses Twilio's request signature validation to prevent spoofed webhooks.
 */
export function validateTwilioSignature(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  if (!authToken) return false;
  return twilio.validateRequest(authToken, signature, url, params);
}