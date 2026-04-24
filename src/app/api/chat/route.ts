import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireAuth, isAuthError } from "@/lib/auth";
import { chatMessageSchema } from "@/lib/validations";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    // Authenticate — prevent anonymous users from burning Gemini API quota
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;

    const body = await req.json();
    const parsed = chatMessageSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid input";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { message, history } = parsed.data;

    // Initialize the model
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction:
        "You are the official Cowscue Support Assistant. Cowscue is a platform in Sri City, India that helps citizens report injured stray cattle to nearby NGOs. Keep your answers brief, empathetic, and helpful. If they ask how to report, tell them to click the 'Report Emergency' button, upload a photo, and share their location. If they ask about NGOs, explain we route requests to verified partners using smart mapping. Do not use formatting like bolding or lists unless necessary.",
    });

    // Format the history for Gemini
    const formattedHistory = history.map((msg) => ({
      role: msg.role === "user" ? "user" : ("model" as const),
      parts: [{ text: msg.content }],
    }));

    // Start chat with history
    const chat = model.startChat({ history: formattedHistory });

    // Send the new message
    const result = await chat.sendMessage(message);
    const responseText = result.response.text();

    return NextResponse.json({ reply: responseText }, { status: 200 });
  } catch (error) {
    console.error("Chatbot Error:", error);
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
  }
}