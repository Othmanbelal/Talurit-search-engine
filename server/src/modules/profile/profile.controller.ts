import type { Request, Response } from "express";
import { successResponse } from "../../utils/api-response";
import { imageFileToDataUrl } from "../uploads/upload-images";
import { changePasswordSchema, updateProfileSchema } from "./profile.schemas";
import { changePassword, getProfile, updateProfile, uploadProfilePicture } from "./profile.service";

export async function getProfileController(request: Request, response: Response) {
  const profile = await getProfile(request.user!.id);
  return response.json(successResponse({ profile }));
}

export async function updateProfileController(request: Request, response: Response) {
  const input = updateProfileSchema.parse(request.body);
  const profile = await updateProfile(request.user!.id, input);
  return response.json(successResponse({ profile }));
}

export async function changePasswordController(request: Request, response: Response) {
  const input = changePasswordSchema.parse(request.body);
  await changePassword(request.user!.id, input);
  return response.json(successResponse({ message: "Password changed successfully." }));
}

export async function uploadProfilePictureController(request: Request, response: Response) {
  const imageUrl = imageFileToDataUrl(request.file);
  const result = await uploadProfilePicture(request.user!.id, imageUrl);
  return response.json(successResponse(result));
}
