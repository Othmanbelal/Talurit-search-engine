import type {
  AdminSettings,
  AdminSettingsPayload,
  BackupOverview,
  BackupSettings,
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

export function getBackupOverviewRequest() {
  return apiRequest<{ backups: BackupOverview }>("/api/admin/backups");
}

export function updateBackupSettingsRequest(settings: Omit<BackupSettings, "storageRoot">) {
  return apiRequest<{ settings: BackupSettings }>("/api/admin/backups/settings", {
    method: "PATCH",
    body: JSON.stringify(settings),
  });
}

export function testBackupDirectoryRequest(directory: string) {
  return apiRequest<{ directory: string }>("/api/admin/backups/test-directory", {
    method: "POST",
    body: JSON.stringify({ directory }),
  });
}

export function runBackupRequest() {
  return apiRequest<{ backup: BackupOverview["lastBackup"] }>("/api/admin/backups/run", {
    method: "POST",
  });
}

export function restoreBackupRequest(fileName: string, confirmation: string) {
  return apiRequest<{ restore: BackupOverview["lastRestore"] }>("/api/admin/backups/restore", {
    method: "POST",
    body: JSON.stringify({ fileName, confirmation }),
  });
}
