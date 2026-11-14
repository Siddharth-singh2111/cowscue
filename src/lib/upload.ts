/**
 * Client-side image upload to Cloudinary (unsigned preset).
 *
 * Photos from modern phones are 4–12 MB; on a 3G connection at the roadside that's the difference
 * between a report arriving in seconds or not at all. We downscale to ≤1600px and re-encode as
 * JPEG (~200–400 KB) in the browser before uploading, and report progress for the UI.
 */
const MAX_DIMENSION = 1600;
const QUALITY = 0.82;

export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}

export function uploadImage(file: File, onProgress?: (pct: number) => void): Promise<string> {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
  if (!cloud || !preset) return Promise.reject(new Error("Image uploads are not configured."));

  return compressImage(file).then(
    (blob) =>
      new Promise<string>((resolve, reject) => {
        const form = new FormData();
        form.append("file", blob, "photo.jpg");
        form.append("upload_preset", preset);
        form.append("folder", "cowscue/reports");

        const xhr = new XMLHttpRequest();
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloud}/image/upload`);
        xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
        xhr.onload = () => {
          try {
            const data = JSON.parse(xhr.responseText);
            if (xhr.status < 300 && data.secure_url) resolve(data.secure_url);
            else reject(new Error(data.error?.message || "Photo upload failed."));
          } catch {
            reject(new Error("Photo upload failed."));
          }
        };
        xhr.onerror = () => reject(new Error("Network error while uploading the photo."));
        xhr.send(form);
      })
  );
}
