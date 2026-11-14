import { GoogleGenerativeAI } from "@google/generative-ai";
import { route } from "@/server/http/route";
import { RateLimits } from "@/server/lib/rateLimit";
import { Errors } from "@/server/lib/errors";
import { chatMessageSchema } from "@/lib/validations";

const SYSTEM = `You are Nandi, the Cowscue support assistant. Cowscue connects citizens who find injured
stray cattle in India with verified rescue NGOs (gaushalas). Be brief (2-4 sentences), warm and practical.
- To report: tap "Report a rescue", take a clear photo, allow location, add a short note.
- Reports are AI-triaged (critical / moderate / routine) and sent to NGOs whose coverage area includes the spot;
  if nobody accepts in time the search widens automatically.
- Citizens can follow the ambulance live from the tracking link and earn karma for successful rescues.
- NGOs can apply to partner from the "For NGOs" page.
For immediate danger to people, tell them to call 112. Never give medication or dosage advice for animals.
Use plain text, no markdown.`;

export const POST = route({ access: "user", rateLimit: RateLimits.chat }, async (ctx) => {
  const { message, history } = await ctx.body(chatMessageSchema);
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw Errors.unavailable("The assistant is offline right now.");

  const model = new GoogleGenerativeAI(key).getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    systemInstruction: SYSTEM,
    generationConfig: { maxOutputTokens: 400, temperature: 0.6 },
  });
  const chat = model.startChat({
    history: history.map((m) => ({ role: m.role, parts: [{ text: m.content }] })),
  });
  const result = await chat.sendMessage(message);
  return { reply: result.response.text().trim() };
});
