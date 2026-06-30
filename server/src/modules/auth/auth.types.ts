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
    language: string;
  } | null;
  // Resolved landing route for this user (defaults to /dashboard).
  landingResolvedPath: string;
};

/** Profile fields needed to resolve a landing route (not all returned to the client). */
export type LandingProfileFields = {
  landingType: string | null;
  landingPath: string | null;
  landingTargetId: string | null;
};

export type LoginResult = {
  user: PublicUser;
  sessionToken: string;
  expiresAt: Date;
};

export type SessionUserRecord = PublicUser & {
  isActive: boolean;
};
