export type UserRole = "admin" | "manager" | "employee" | "viewer";

export type AuthUser = {
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
  landingResolvedPath?: string;
};

export type LoginResponse = {
  user: AuthUser;
  expiresAt: string;
};
