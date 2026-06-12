import multer from "multer";
import { AppError } from "../../utils/AppError";

const allowedMimeTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export const imageMemoryUpload = multer({
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  storage: multer.memoryStorage(),
  fileFilter: (_request, file, callback) => {
    callback(null, allowedMimeTypes.has(file.mimetype));
  },
});

export function imageFileToDataUrl(file?: Express.Multer.File) {
  if (!file || !allowedMimeTypes.has(file.mimetype) || !file.buffer?.length) {
    throw new AppError("Upload a PNG, JPG, WEBP, or GIF image.", 400);
  }
  return `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
}
