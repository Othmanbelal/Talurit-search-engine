import { compare, hash } from "bcryptjs";
import { env } from "../../config/env";
import { AppError } from "../../utils/AppError";
import type { AcceptInviteInput, LoginInput } from "./auth.schemas";
import {
  acceptInvitationWithSession,
  createSession,
  deleteSessionByTokenHash,
  findInvitationByTokenHash,
  findSessionByTokenHash,
  findUserForLogin,
  updateLastLogin,
} from "./auth.repository";
import {
  createInvitationToken,
  createSessionToken,
  hashInvitationToken,
  hashSessionToken,
} from "./auth.tokens";
import type { LoginResult, PublicUser } from "./auth.types";

function toPublicUser(user: PublicUser): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    profile: user.profile ?? null,
  };
}

function sessionExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.SESSION_DAYS);
  return expiresAt;
}

export async function login(input: LoginInput): Promise<LoginResult> {
  const user = await findUserForLogin(input.email);

  if (!user || !user.isActive) {
    throw new AppError("Invalid email or password", 401);
  }

  const passwordMatches = await compare(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError("Invalid email or password", 401);
  }

  const sessionToken = createSessionToken();
  const expiresAt = sessionExpiryDate();

  await createSession(user.id, hashSessionToken(sessionToken), expiresAt);
  await updateLastLogin(user.id);

  return {
    user: toPublicUser(user),
    sessionToken,
    expiresAt,
  };
}

export async function logout(sessionToken?: string) {
  if (!sessionToken) {
    return;
  }

  await deleteSessionByTokenHash(hashSessionToken(sessionToken));
}

export async function getCurrentUser(sessionToken?: string): Promise<PublicUser> {
  if (!sessionToken) {
    throw new AppError("Authentication required", 401);
  }

  const tokenHash = hashSessionToken(sessionToken);
  const session = await findSessionByTokenHash(tokenHash);

  if (!session || !session.user.isActive) {
    throw new AppError("Authentication required", 401);
  }

  if (session.expiresAt <= new Date()) {
    // Expired sessions are removed on access to keep authorization checks simple.
    await deleteSessionByTokenHash(tokenHash);
    throw new AppError("Session expired", 401);
  }

  return toPublicUser(session.user);
}

export async function acceptInvitation(input: AcceptInviteInput): Promise<LoginResult> {
  const invitation = await findInvitationByTokenHash(hashInvitationToken(input.token));

  if (!invitation || invitation.acceptedAt || invitation.expiresAt <= new Date()) {
    throw new AppError("Invitation link is invalid or expired.", 400);
  }

  const sessionToken = createSessionToken();
  const expiresAt = sessionExpiryDate();

  const user = await acceptInvitationWithSession({
    invitationId: invitation.id,
    email: invitation.email,
    name: `${input.firstName} ${input.lastName}`.trim(),
    firstName: input.firstName,
    lastName: input.lastName,
    phoneNumber: normalizeOptional(input.phoneNumber),
    profilePictureUrl: normalizeOptional(input.profilePictureUrl),
    role: invitation.role,
    passwordHash: await hash(input.password, 12),
    invalidatedTokenHash: hashInvitationToken(createInvitationToken()),
    sessionTokenHash: hashSessionToken(sessionToken),
    sessionExpiresAt: expiresAt,
  });

  return {
    user: toPublicUser(user),
    sessionToken,
    expiresAt,
  };
}

function normalizeOptional(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
