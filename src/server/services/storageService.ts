import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// Local filesystem storage for MVP. Replace with Vercel Blob in production.
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const ALLOWED_MIME_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Audio
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  // Video
  "video/mp4",
  "video/webm",
  "video/ogg",
  // Documents / Code
  "application/pdf",
  "text/plain",
  "text/csv",
  "text/html",
  "application/json",
  "text/markdown",
]);

export class StorageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageValidationError";
  }
}

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export function validateFile(size: number, mimeType: string) {
  if (size > MAX_FILE_SIZE) {
    throw new StorageValidationError(
      `File size ${(size / 1024 / 1024).toFixed(1)}MB exceeds maximum ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    );
  }
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new StorageValidationError(
      `MIME type "${mimeType}" is not allowed`,
    );
  }
}

export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<{ url: string; size: number }> {
  validateFile(buffer.length, mimeType);
  await ensureUploadDir();

  const ext = path.extname(fileName) || "";
  const uniqueName = `${crypto.randomUUID()}${ext}`;
  const filePath = path.join(UPLOAD_DIR, uniqueName);

  await fs.writeFile(filePath, buffer);

  return {
    url: `/uploads/${uniqueName}`,
    size: buffer.length,
  };
}

export async function deleteFile(url: string): Promise<void> {
  if (!url.startsWith("/uploads/")) return;

  const fileName = path.basename(url);
  const filePath = path.join(UPLOAD_DIR, fileName);

  try {
    await fs.unlink(filePath);
  } catch {
    // File may already be deleted — non-critical
  }
}
