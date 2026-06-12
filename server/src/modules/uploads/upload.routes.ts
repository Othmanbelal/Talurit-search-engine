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

// Public: proxies the image from Supabase through this server so the browser
// never talks to Supabase directly. This avoids the Cross-Origin-Resource-Policy
// header Supabase sets on signed URLs, which blocks cross-origin img tag loads.
uploadRoutes.get("/media", asyncHandler(async (request, response) => {
  const ref = typeof request.query.ref === "string" ? request.query.ref : "";
  const signedUrl = await signedStorageUrl(ref);
  const upstream = await fetch(signedUrl);
  if (!upstream.ok) {
    response.status(404).json({ success: false, error: { message: "Image not found." } });
    return;
  }
  const contentType = upstream.headers.get("content-type") ?? "image/png";
  response.setHeader("Content-Type", contentType);
  response.setHeader("Cache-Control", "public, max-age=3600, immutable");
  response.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  const buffer = await upstream.arrayBuffer();
  response.send(Buffer.from(buffer));
}));

uploadRoutes.use(requireAuth);

uploadRoutes.post("/images", canUploadImages, imageMemoryUpload.single("file"), asyncHandler(async (request, response) => {
  const ref = await uploadImageToStorage(request.file, "inventory-images", request.user!.id);
  return response.status(201).json(successResponse({ upload: { url: ref } }));
}));
