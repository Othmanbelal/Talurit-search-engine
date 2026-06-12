import multer from "multer";
import { AppError } from "../../utils/AppError";

const allowedMimeTypes = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

export const imageMemoryUpload = multer({
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  storage: multer.memoryStorage(),
  fileFilter: (_request, file, callback) => {
    callback(null, allowedMimeTypes.has(file.mimetype));
  },
});

export function validateImageFile(file?: Express.Multer.File) {
  if (!file || !allowedMimeTypes.has(file.mimetype) || !file.buffer?.length) {
    throw new AppError("Upload a PNG, JPG, WEBP, or GIF image.", 400);
  }
  return file;
}

export function imageExtension(mimeType: string) {
  return allowedMimeTypes.get(mimeType) ?? ".bin";
}
