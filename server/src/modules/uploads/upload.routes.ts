import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { Router } from "express";
import multer from "multer";
import { UserRole } from "@prisma/client";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/role.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { AppError } from "../../utils/AppError";
import { successResponse } from "../../utils/api-response";
import { imageUploadDirectory, publicUploadUrl } from "./upload-paths";

const allowedMimeTypes = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

const upload = multer({
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  storage: multer.diskStorage({
    destination: (_request, _file, callback) => callback(null, imageUploadDirectory()),
    filename: (_request, file, callback) => callback(null, safeFileName(file)),
  }),
  fileFilter: (_request, file, callback) => {
    callback(null, allowedMimeTypes.has(file.mimetype));
  },
});

export const uploadRoutes = Router();
const canUploadImages = requireRoles(UserRole.admin, UserRole.manager, UserRole.employee);

uploadRoutes.use(requireAuth);
uploadRoutes.post("/images", canUploadImages, upload.single("file"), asyncHandler(async (request, response) => {
  if (!request.file) throw new AppError("Upload a PNG, JPG, WEBP, or GIF image.", 400);
  return response.status(201).json(successResponse({ upload: { url: publicUploadUrl(request.file.filename) } }));
}));

function safeFileName(file: Express.Multer.File) {
  const extension = allowedMimeTypes.get(file.mimetype) ?? extname(file.originalname).toLowerCase();
  return `${randomUUID()}${extension}`;
}
