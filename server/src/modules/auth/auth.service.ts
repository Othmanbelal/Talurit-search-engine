import { compare, hash } from "bcryptjs";
import { env } from "../../config/env";
import { sendEmail } from "../email/email.service";
import { AppError } from "../../utils/AppError";
import type {
  AcceptInviteInput,
  ForgotPasswordInput,
  LoginInput,
  ResetPasswordInput,
} from "./auth.schemas";
import {
  acceptInvitationWithSession,
  createSession,
  deleteSessionByTokenHash,
  findInvitationByTokenHash,
  findPasswordResetToken,
  findSessionByTokenHash,
  findUserForLogin,
  replacePasswordResetToken,
  resetPasswordAndSessions,
  updateLastLogin,
} from "./auth.repository";
import {
  createInvitationToken,
  createPasswordResetToken,
  createSessionToken,
  hashInvitationToken,
  hashPasswordResetToken,
  hashSessionToken,
} from "./auth.tokens";
import { resolveLandingPath } from "../profile/landing";
import type { LoginResult, PublicUser } from "./auth.types";

type RawUserRecord = Omit<PublicUser, "profile" | "landingResolvedPath"> & {
  profile?:
    | (NonNullable<PublicUser["profile"]> & {
        landingType: string | null;
        landingPath: string | null;
        landingTargetId: string | null;
      })
    | null;
};

async function toPublicUser(user: RawUserRecord): Promise<PublicUser> {
  const { path } = await resolveLandingPath({
    landingType: user.profile?.landingType ?? null,
    landingPath: user.profile?.landingPath ?? null,
    landingTargetId: user.profile?.landingTargetId ?? null,
  });
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    // Landing fields stay server-side; only the resolved route is exposed here.
    profile: user.profile
      ? {
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          phoneNumber: user.profile.phoneNumber,
          profilePictureUrl: user.profile.profilePictureUrl,
          language: user.profile.language,
        }
      : null,
    landingResolvedPath: path,
  };
}

function sessionExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.SESSION_DAYS);
  return expiresAt;
}

const resetRequestMessage =
  "If an active account exists for that email, a password reset link has been sent.";

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
    user: await toPublicUser(user),
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


export async function requestPasswordReset(input: ForgotPasswordInput) {
  const user = await findUserForLogin(input.email);
  if (!user?.isActive) return { message: resetRequestMessage };

  const rawToken = createPasswordResetToken();
  const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_MINUTES * 60_000);
  await replacePasswordResetToken(user.id, hashPasswordResetToken(rawToken), expiresAt);

  const link = `${env.APP_PUBLIC_URL}/reset-password?token=${encodeURIComponent(rawToken)}`;
  try {
    await sendEmail({
      to: user.email,
      subject: "Reset your Tool Inventory password",
      text: [
        "A password reset was requested for your Tool Inventory account.",
        `Open this link within ${env.PASSWORD_RESET_MINUTES} minutes:`,
        link,
        "If you did not request this, you can ignore this email.",
      ].join("\n\n"),
      html: [
        "<p>A password reset was requested for your Tool Inventory account.</p>",
        `<p><a href="${link}">Reset your password</a></p>`,
        `<p>This link expires in ${env.PASSWORD_RESET_MINUTES} minutes.</p>`,
        "<p>If you did not request this, you can ignore this email.</p>",
      ].join(""),
    });
  } catch {
    // Keep the public response generic so account existence and SMTP state are not exposed.
    console.error("[password-reset] Reset email could not be sent.");
  }

  return { message: resetRequestMessage };
}

export async function resetPassword(input: ResetPasswordInput) {
  const token = await findPasswordResetToken(hashPasswordResetToken(input.token));
  if (!token || token.usedAt || token.expiresAt <= new Date() || !token.user.isActive) {
    throw new AppError("Password reset link is invalid or expired.", 400);
  }

  await resetPasswordAndSessions({
    tokenId: token.id,
    userId: token.userId,
    passwordHash: await hash(input.password, 12),
  });
  return { message: "Password updated. You can now sign in." };
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
    user: await toPublicUser(user),
    sessionToken,
    expiresAt,
  };
}

function normalizeOptional(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}
