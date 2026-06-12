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
