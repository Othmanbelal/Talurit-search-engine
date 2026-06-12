import type {
  AdminSettings,
  AdminSettingsPayload,
  AdminUser,
  AdminUsersOverview,
  InviteUserPayload,
  UpdateUserPayload,
  UserInvitation,
} from "../types/admin";
import { apiRequest } from "./http";

export function getAdminUsersRequest() {
  return apiRequest<AdminUsersOverview>("/api/admin/users");
}

export function inviteUserRequest(payload: InviteUserPayload) {
  return apiRequest<{ invitation: UserInvitation }>("/api/admin/invitations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function resendInvitationRequest(id: string) {
  return apiRequest<{ invitation: UserInvitation }>(`/api/admin/invitations/${id}/resend`, {
    method: "POST",
  });
}

export function cancelInvitationRequest(id: string) {
  return apiRequest<{ invitation: UserInvitation }>(`/api/admin/invitations/${id}/cancel`, {
    method: "POST",
  });
}

export function updateAdminUserRequest(id: string, payload: UpdateUserPayload) {
  return apiRequest<{ user: AdminUser }>(`/api/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function getAdminSettingsRequest() {
  return apiRequest<{ settings: AdminSettings }>("/api/admin/settings");
}

export function updateAdminSettingsRequest(payload: AdminSettingsPayload) {
  return apiRequest<{ settings: AdminSettings }>("/api/admin/settings", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function sendTestEmailRequest(email?: string) {
  return apiRequest<{ sentTo: string }>("/api/admin/email/send-test", {
    method: "POST",
    body: JSON.stringify({ email: email || undefined }),
  });
}
