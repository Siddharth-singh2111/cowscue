import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface AITriageResult {
  isCow: boolean;
  severity: "CRITICAL" | "MODERATE" | "ROUTINE";
  injuryType: string;
}

const TRIAGE_PROMPT = `Analyze this image. 
1. Is there a cow, calf, bull, or cattle clearly visible? (true/false)
2. Assess the medical severity: 'CRITICAL' (bleeding, unable to stand, severe trauma), 'MODERATE' (limping, visible wounds but stable), or 'ROUTINE' (starving, stray, minor issues).
3. Provide a very brief 3-5 word description of the visible injury/condition.

Return EXACTLY and ONLY a valid JSON object in this format: 
{"isCow": true, "severity": "CRITICAL", "injuryType": "severe leg wound"}`;

/**
 * Runs Gemini AI triage on a base64-encoded image.
 * Returns structured triage data or null if AI fails (caller decides how to handle).
 */
export async function runAITriage(
  base64Data: string,
  mimeType: string = "image/jpeg"
): Promise<AITriageResult | null> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent([
      TRIAGE_PROMPT,
      { inlineData: { data: base64Data, mimeType } },
    ]);

    let aiText = result.response.text().trim();

    // Clean up markdown formatting if Gemini adds it (```json ... ```)
    if (aiText.startsWith("```json")) {
      aiText = aiText.replace(/```json/g, "").replace(/```/g, "").trim();
    } else if (aiText.startsWith("```")) {
      aiText = aiText.replace(/```/g, "").trim();
    }

    const aiData = JSON.parse(aiText) as AITriageResult;
    console.log("🤖 AI Triage Result:", aiData);

    return aiData;
  } catch (error) {
    console.error("AI Triage failed:", error);
    return null;
  }
}
