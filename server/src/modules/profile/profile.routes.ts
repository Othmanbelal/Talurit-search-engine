import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { imageMemoryUpload } from "../uploads/upload-images";
import {
  changePasswordController,
  getProfileController,
  updateProfileController,
  uploadProfilePictureController,
} from "./profile.controller";

export const profileRoutes = Router();

profileRoutes.use(requireAuth);
profileRoutes.get("/", asyncHandler(getProfileController));
profileRoutes.patch("/", asyncHandler(updateProfileController));
profileRoutes.patch("/password", asyncHandler(changePasswordController));
profileRoutes.post("/picture", imageMemoryUpload.single("file"), asyncHandler(uploadProfilePictureController));
