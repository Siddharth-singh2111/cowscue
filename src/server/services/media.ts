import { Errors } from "../lib/errors";

/**
 * Server-side upload to Cloudinary using the unsigned preset. Accepts a remote URL (Twilio media)
 * or a data URI (WhatsApp bot base64 payloads). Returns the CDN URL.
 */
export async function uploadImage(file: string): Promise<string> {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloud || !preset) throw Errors.unavailable("Image storage is not configured.");

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", preset);
  form.append("folder", "cowscue/reports");

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: "POST", body: form });
  const data = (await res.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
  if (!res.ok || !data.secure_url) {
    throw Errors.unavailable(`Image upload failed${data.error?.message ? `: ${data.error.message}` : ""}`);
  }
  return data.secure_url;
}
