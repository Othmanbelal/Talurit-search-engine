import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/role.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { successResponse } from "../../utils/api-response";
import { imageMemoryUpload } from "./upload-images";
import { signedStorageUrl, uploadImageToStorage } from "./storage.service";

export const uploadRoutes = Router();
const canUploadImages = requireRoles(UserRole.admin, UserRole.manager, UserRole.employee);

// Public: img tags cannot send credentials cross-origin. The ref is a
// non-guessable random path and the resulting signed URL expires in 1 hour.
uploadRoutes.get("/media", asyncHandler(async (request, response) => {
  const ref = typeof request.query.ref === "string" ? request.query.ref : "";
  const url = await signedStorageUrl(ref);
  return response.redirect(302, url);
}));

uploadRoutes.use(requireAuth);

uploadRoutes.post("/images", canUploadImages, imageMemoryUpload.single("file"), asyncHandler(async (request, response) => {
  const ref = await uploadImageToStorage(request.file, "inventory-images", request.user!.id);
  return response.status(201).json(successResponse({ upload: { url: ref } }));
}));
