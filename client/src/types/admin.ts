import type { UserRole } from "./auth";

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  profile: UserProfile | null;
  createdAt: string;
  updatedAt: string;
};

export type UserProfile = {
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  profilePictureUrl: string | null;
};

export type InvitationStatus = "pending" | "expired" | "accepted";

export type UserInvitation = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  invitedByUserId: string | null;
  acceptedAt: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  status: InvitationStatus;
  invitedByUser?: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export type AdminUsersOverview = {
  users: AdminUser[];
  invitations: UserInvitation[];
};

export type EmailStatus = {
  configured: boolean;
  warning: string | null;
  from: string | null;
  host: string | null;
  port: number;
  secure: boolean;
  user: string | null;
  passwordConfigured: boolean;
};

export type AdminSettings = {
  email: EmailStatus;
  smtp: {
    smtpHost: string;
    smtpPort: number;
    smtpUser: string;
    smtpFrom: string;
    smtpSecure: boolean;
    smtpPasswordConfigured: boolean;
  };
  weeklySummaryEmail: string;
};

export type InviteUserPayload = {
  email: string;
  name?: string;
  role: UserRole;
};

export type UpdateUserPayload = {
  role?: UserRole;
  isActive?: boolean;
  profile?: Partial<UserProfile>;
};

export type AdminSettingsPayload = {
  weeklySummaryEmail: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass?: string;
  smtpFrom: string;
  smtpSecure: boolean;
};

export type BackupSettings = {
  enabled: boolean;
  intervalHours: number;
  directory: string;
  storageRoot: string;
};

export type BackupLogRecord = {
  id: string;
  operation: "backup" | "restore";
  trigger: "manual" | "automatic" | "pre_restore";
  fileName?: string | null;
  filePath?: string | null;
  status: "PENDING" | "SUCCESS" | "FAILED";
  message?: string | null;
  createdByUserName?: string | null;
  completedAt?: string | null;
  createdAt: string;
};

export type BackupFile = {
  fileName: string;
  kind: "full" | "database_only_legacy";
  sizeBytes: number;
  modifiedAt: string;
};

export type BackupOverview = {
  settings: BackupSettings;
  files: BackupFile[];
  logs: BackupLogRecord[];
  lastBackup: BackupLogRecord | null;
  lastRestore: BackupLogRecord | null;
  nextAutomaticBackupAt: string | null;
  activeOperation: {
    kind: "backup" | "restore";
    startedAt: string;
  } | null;
};
