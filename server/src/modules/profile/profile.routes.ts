import { randomUUID } from "node:crypto";
import { Router } from "express";
import multer from "multer";
import { extname } from "node:path";
import { requireAuth } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { AppError } from "../../utils/AppError";
import { imageUploadDirectory } from "../uploads/upload-paths";
import {
  changePasswordController,
  getProfileController,
  updateProfileController,
  uploadProfilePictureController,
} from "./profile.controller";

const allowedMimeTypes = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
  ["image/gif", ".gif"],
]);

const upload = multer({
  limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, imageUploadDirectory()),
    filename: (_req, file, cb) => {
      const ext = allowedMimeTypes.get(file.mimetype) ?? extname(file.originalname).toLowerCase();
      cb(null, `${randomUUID()}${ext}`);
    },
  }),
  fileFilter: (_req, file, cb) => cb(null, allowedMimeTypes.has(file.mimetype)),
});

export const profileRoutes = Router();

profileRoutes.use(requireAuth);
profileRoutes.get("/", asyncHandler(getProfileController));
profileRoutes.patch("/", asyncHandler(updateProfileController));
profileRoutes.patch("/password", asyncHandler(changePasswordController));
profileRoutes.post("/picture", upload.single("file"), asyncHandler(uploadProfilePictureController));
