import type { LandingType } from "../constants/landing";
import { apiRequest } from "./http";

export type ProfileData = {
  id: string;
  email: string;
  name: string;
  role: string;
  landingResolvedPath: string;
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
    profilePictureUrl: string | null;
    landingType: LandingType | null;
    landingPath: string | null;
    landingTargetId: string | null;
    language: string;
  } | null;
};

export function getProfileRequest() {
  return apiRequest<{ profile: ProfileData }>("/api/profile");
}

export type ProfileUpdateInput = {
  name?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string | null;
  landingType?: LandingType | null;
  landingPath?: string | null;
  landingTargetId?: string | null;
  language?: "sv" | "en";
};

export function updateProfileRequest(input: ProfileUpdateInput) {
  return apiRequest<{ profile: ProfileData }>("/api/profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function changePasswordRequest(input: { currentPassword: string; newPassword: string }) {
  return apiRequest<{ message: string }>("/api/profile/password", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function uploadProfilePictureRequest(file: File) {
  const form = new FormData();
  form.append("file", file);
  return apiRequest<{ profilePictureUrl: string }>("/api/profile/picture", {
    method: "POST",
    body: form,
  });
}
