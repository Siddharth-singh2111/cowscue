import { GoogleGenerativeAI, SchemaType, type ResponseSchema } from "@google/generative-ai";
import type { Severity, Triage } from "@/types";
import { logger } from "../lib/logger";

const TRIAGE_TIMEOUT_MS = 15_000;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const PROMPT = `You are a veterinary triage assistant for a stray-cattle rescue service in India.
Look at the photo (and the optional citizen note) and respond with JSON only.
- isCattle: true only if a cow, bull, calf, buffalo or other bovine is clearly visible.
- severity: CRITICAL (heavy bleeding, cannot stand, hit by vehicle, trapped, unconscious, severe trauma),
  MODERATE (limping, open wounds but standing, eye injury, plastic ingestion signs),
  ROUTINE (weak, malnourished, stray, minor scrapes).
- injuryType: 2-6 words describing the visible condition.
- confidence: 0..1 for your severity call.
- firstAid: 2-4 short, safe instructions a bystander can follow while waiting for the ambulance
  (e.g. keep a safe distance, offer water, divert traffic). Never suggest medication.`;

const responseSchema: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    isCattle: { type: SchemaType.BOOLEAN },
    severity: { type: SchemaType.STRING, format: "enum", enum: ["CRITICAL", "MODERATE", "ROUTINE"] },
    injuryType: { type: SchemaType.STRING },
    confidence: { type: SchemaType.NUMBER },
    firstAid: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
  },
  required: ["isCattle", "severity", "injuryType", "confidence", "firstAid"],
};

const DEFAULT_FIRST_AID = [
  "Keep a safe distance — injured animals can kick when frightened.",
  "If it is on a road, safely alert traffic and keep the area clear.",
  "Offer clean water in a shallow container if the animal is conscious.",
];

/**
 * Runs AI triage on an image. Never throws: on timeout, quota or parse errors it degrades to a
 * keyword heuristic over the citizen's description so a report is never lost because the model
 * is unavailable. Callers can inspect `source` to tell the two apart.
 */
export async function triageImage(input: {
  imageUrl?: string;
  base64?: string;
  mimeType?: string;
  description?: string;
}): Promise<Triage> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return heuristicTriage(input.description);

  try {
    const image = input.base64
      ? { data: input.base64, mimeType: input.mimeType || "image/jpeg" }
      : await fetchImage(input.imageUrl!);

    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json", responseSchema, temperature: 0.2 },
    });

    const result = await withTimeout(
      model.generateContent([
        `${PROMPT}\n\nCitizen note: ${input.description?.slice(0, 500) || "(none)"}`,
        { inlineData: image },
      ]),
      TRIAGE_TIMEOUT_MS
    );
    const parsed = JSON.parse(result.response.text()) as Omit<Triage, "source">;
    const triage: Triage = {
      isCattle: Boolean(parsed.isCattle),
      severity: normaliseSeverity(parsed.severity),
      injuryType: (parsed.injuryType || "Condition unclear").slice(0, 80),
      confidence: clamp(Number(parsed.confidence) || 0.5, 0, 1),
      firstAid: (parsed.firstAid?.length ? parsed.firstAid : DEFAULT_FIRST_AID).slice(0, 4).map((s) => s.slice(0, 160)),
      source: "ai",
    };
    logger.debug({ severity: triage.severity, isCattle: triage.isCattle }, "ai triage complete");
    return triage;
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err }, "ai triage failed, using heuristic");
    return heuristicTriage(input.description);
  }
}

const CRITICAL_WORDS = /\b(bleed|blood|accident|hit|unconscious|can'?t stand|cannot stand|fracture|broken|trapped|drain|collapsed|dying|severe)\w*/i;
const MODERATE_WORDS = /\b(limp|wound|cut|injur|swollen|eye|plastic|stuck|weak)\w*/i;

export function heuristicTriage(description = ""): Triage {
  const severity: Severity = CRITICAL_WORDS.test(description)
    ? "CRITICAL"
    : MODERATE_WORDS.test(description)
      ? "MODERATE"
      : "ROUTINE";
  return {
    isCattle: true,
    severity,
    injuryType: "Awaiting responder assessment",
    confidence: 0.3,
    firstAid: DEFAULT_FIRST_AID,
    source: "fallback",
  };
}

async function fetchImage(url: string) {
  const res = await withTimeout(fetch(url), 8_000);
  if (!res.ok) throw new Error(`image fetch failed: ${res.status}`);
  const len = Number(res.headers.get("content-length") || 0);
  if (len > MAX_IMAGE_BYTES) throw new Error("image too large");
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength > MAX_IMAGE_BYTES) throw new Error("image too large");
  return { data: buf.toString("base64"), mimeType: res.headers.get("content-type") || "image/jpeg" };
}

function normaliseSeverity(s: unknown): Severity {
  return s === "CRITICAL" || s === "MODERATE" || s === "ROUTINE" ? s : "ROUTINE";
}

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}
