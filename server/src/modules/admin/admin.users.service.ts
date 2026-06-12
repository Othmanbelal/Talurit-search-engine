import { UserRole } from "@prisma/client";
import { env } from "../../config/env";
import { createInvitationToken, hashInvitationToken } from "../auth/auth.tokens";
import { sendEmail } from "../email/email.service";
import { emailNotConfiguredMessage } from "../email/email.types";
import { AppError } from "../../utils/AppError";
import type {
  InviteUserInput,
  UpdateUserInput,
} from "./admin.schemas";
import {
  countActiveAdmins,
  createInvitation,
  deleteUserSessions,
  expireInvitation,
  findAdminUserById,
  findInvitationById,
  findPendingInvitationByEmail,
  findUserByEmail,
  listAdminUsers,
  listInvitations,
  updateAdminUser,
  updateInvitationToken,
} from "./admin.users.repository";
import type { AdminInvitationRow, AdminInvitationView } from "./admin.users.types";

const invitationDays = 7;

export async function getAdminUsersOverview() {
  const [users, invitations] = await Promise.all([listAdminUsers(), listInvitations()]);

  return {
    users,
    invitations: invitations.map(toInvitationView),
  };
}

export async function getAdminInvitations() {
  const invitations = await listInvitations();

  return invitations.map(toInvitationView);
}

export async function inviteUser(input: InviteUserInput, invitedByUserId: string) {
  const existingUser = await findUserByEmail(input.email);

  if (existingUser?.isActive) {
    throw new AppError("An active user already exists with this email.", 409);
  }

  const existingInvite = await findPendingInvitationByEmail(input.email);

  if (existingInvite) {
    throw new AppError("A pending invitation already exists for this email.", 409);
  }

  const rawToken = createInvitationToken();
  const invitation = await createInvitation({
    email: input.email,
    name: normalizeOptional(input.name),
    role: input.role,
    tokenHash: hashInvitationToken(rawToken),
    invitedByUserId,
    expiresAt: invitationExpiryDate(),
  });

  try {
    await sendInvitationEmail(invitation, rawToken);
  } catch (error) {
    throw invitationEmailError(error);
  }

  return toInvitationView(invitation);
}

export async function resendInvitation(id: string) {
  const invitation = await findInvitationById(id);

  if (!invitation) {
    throw new AppError("Invitation not found.", 404);
  }

  if (invitation.acceptedAt) {
    throw new AppError("Accepted invitations cannot be resent.", 409);
  }

  const rawToken = createInvitationToken();
  const updated = await updateInvitationToken(id, {
    tokenHash: hashInvitationToken(rawToken),
    expiresAt: invitationExpiryDate(),
  });

  try {
    await sendInvitationEmail(updated, rawToken);
  } catch (error) {
    throw invitationEmailError(error);
  }

  return toInvitationView(updated);
}

export async function cancelInvitation(id: string) {
  const invitation = await findInvitationById(id);

  if (!invitation) {
    throw new AppError("Invitation not found.", 404);
  }

  if (invitation.acceptedAt) {
    throw new AppError("Accepted invitations cannot be cancelled.", 409);
  }

  return toInvitationView(await expireInvitation(id));
}

export async function updateUserByAdmin(
  id: string,
  input: UpdateUserInput,
  actingUserId: string,
) {
  const existing = await findAdminUserById(id);

  if (!existing) {
    throw new AppError("User not found.", 404);
  }

  await protectLastAdmin(existing.role, existing.isActive, input);

  if (id === actingUserId && input.isActive === false) {
    throw new AppError("You cannot deactivate your own account.", 400);
  }

  if (id === actingUserId && input.role && input.role !== UserRole.admin) {
    throw new AppError("You cannot remove your own admin role.", 400);
  }

  const profileUpdate = buildProfileUpdate(input, existing.profile);
  const updated = await updateAdminUser(id, {
    role: input.role,
    isActive: input.isActive,
    name: profileUpdate.displayName,
    profile: profileUpdate.profileData
      ? {
          upsert: {
            create: profileUpdate.profileData,
            update: profileUpdate.profileData,
          },
        }
      : undefined,
  });

  if (input.isActive === false) {
    await deleteUserSessions(id);
  }

  return updated;
}

async function protectLastAdmin(
  currentRole: UserRole,
  currentActive: boolean,
  input: UpdateUserInput,
) {
  const wouldRemoveAdmin =
    currentRole === UserRole.admin &&
    currentActive &&
    (input.isActive === false || (input.role && input.role !== UserRole.admin));

  if (wouldRemoveAdmin && (await countActiveAdmins()) <= 1) {
    throw new AppError("At least one active admin must remain.", 400);
  }
}

async function sendInvitationEmail(invitation: AdminInvitationRow, rawToken: string) {
  const link = `${env.APP_PUBLIC_URL}/accept-invite?token=${encodeURIComponent(rawToken)}`;

  await sendEmail({
    to: invitation.email,
    subject: "You're invited to Tool Inventory",
    text: buildInvitationText(invitation, link),
    html: buildInvitationHtml(invitation, link),
  });
}

function buildInvitationText(invitation: AdminInvitationRow, link: string) {
  return [
    `You have been invited to Tool Inventory as ${invitation.role}.`,
    "Open the secure link below and set your password:",
    link,
    `This invitation expires ${invitation.expiresAt.toISOString()}.`,
  ].join("\n\n");
}

function buildInvitationHtml(invitation: AdminInvitationRow, link: string) {
  return [
    `<p>You have been invited to Tool Inventory as <strong>${invitation.role}</strong>.</p>`,
    `<p><a href="${link}">Accept invitation</a></p>`,
    `<p>This invitation expires ${invitation.expiresAt.toISOString()}.</p>`,
  ].join("");
}

function invitationExpiryDate() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + invitationDays);
  return expiresAt;
}

function toInvitationView(invitation: AdminInvitationRow): AdminInvitationView {
  const { tokenHash: _tokenHash, ...safeInvitation } = invitation as AdminInvitationRow & {
    tokenHash?: string;
  };

  return {
    ...safeInvitation,
    status: invitation.acceptedAt
      ? "accepted"
      : invitation.expiresAt <= new Date()
        ? "expired"
        : "pending",
  };
}

function normalizeOptional(value?: string) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function buildProfileUpdate(
  input: UpdateUserInput,
  currentProfile: {
    firstName: string;
    lastName: string;
    phoneNumber: string | null;
    profilePictureUrl: string | null;
  } | null,
) {
  if (!input.profile) {
    return { displayName: undefined, profileData: undefined };
  }

  const next = {
    firstName: input.profile.firstName ?? currentProfile?.firstName ?? "User",
    lastName: input.profile.lastName ?? currentProfile?.lastName ?? "-",
    phoneNumber:
      input.profile.phoneNumber !== undefined
        ? normalizeOptional(input.profile.phoneNumber)
        : currentProfile?.phoneNumber ?? null,
    profilePictureUrl:
      input.profile.profilePictureUrl !== undefined
        ? normalizeOptional(input.profile.profilePictureUrl)
        : currentProfile?.profilePictureUrl ?? null,
  };

  return {
    displayName: `${next.firstName} ${next.lastName}`.trim(),
    profileData: next,
  };
}

function invitationEmailError(error: unknown) {
  if (error instanceof AppError && error.message === emailNotConfiguredMessage) {
    return error;
  }

  return new AppError(
    "Invitation was saved, but the email could not be sent. Fix SMTP and resend the invitation.",
    502,
  );
}
