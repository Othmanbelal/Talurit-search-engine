import type { UserRole } from "@prisma/client";

export type AdminUserRow = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  profile: {
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
    profilePictureUrl: string | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AdminInvitationRow = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  invitedByUserId: string | null;
  acceptedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  invitedByUser?: {
    id: string;
    name: string;
    email: string;
  } | null;
};

export type InvitationStatus = "pending" | "expired" | "accepted";

export type AdminInvitationView = Omit<AdminInvitationRow, "tokenHash"> & {
  status: InvitationStatus;
};
