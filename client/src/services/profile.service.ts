import { apiRequest } from "./http";

export type ProfileData = {
  id: string;
  email: string;
  name: string;
  role: string;
  profile: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
    profilePictureUrl: string | null;
  } | null;
};

export function getProfileRequest() {
  return apiRequest<{ profile: ProfileData }>("/api/profile");
}

export function updateProfileRequest(input: {
  name?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string | null;
}) {
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
