import type { AuthUser, LoginResponse } from "../types/auth";
import { apiRequest } from "./http";

export function loginRequest(email: string, password: string) {
  return apiRequest<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logoutRequest() {
  return apiRequest<{ loggedOut: boolean }>("/api/auth/logout", {
    method: "POST",
  });
}

export function currentUserRequest() {
  return apiRequest<{ user: AuthUser }>("/api/auth/me");
}

export function forgotPasswordRequest(email: string) {
  return apiRequest<{ message: string }>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function resetPasswordRequest(token: string, password: string) {
  return apiRequest<{ message: string }>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

export function acceptInviteRequest(input: {
  token: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
  password: string;
}) {
  return apiRequest<LoginResponse>("/api/auth/accept-invite", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
