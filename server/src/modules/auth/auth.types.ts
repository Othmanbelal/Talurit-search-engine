import type { UserRole } from "@prisma/client";

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  profile?: {
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
    profilePictureUrl: string | null;
  } | null;
};

export type LoginResult = {
  user: PublicUser;
  sessionToken: string;
  expiresAt: Date;
};

export type SessionUserRecord = PublicUser & {
  isActive: boolean;
};
