import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/role.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { successResponse } from "../../utils/api-response";
import { imageFileToDataUrl, imageMemoryUpload } from "./upload-images";

export const uploadRoutes = Router();
const canUploadImages = requireRoles(UserRole.admin, UserRole.manager, UserRole.employee);

uploadRoutes.use(requireAuth);

uploadRoutes.post("/images", canUploadImages, imageMemoryUpload.single("file"), asyncHandler(async (request, response) => {
  const url = imageFileToDataUrl(request.file);
  return response.status(201).json(successResponse({ upload: { url } }));
}));
