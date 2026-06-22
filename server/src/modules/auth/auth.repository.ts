import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/AppError";
import type { UserRole } from "@prisma/client";

export function findUserForLogin(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      passwordHash: true,
      role: true,
      isActive: true,
      profile: { select: profileSelect },
    },
  });
}

export function createSession(userId: string, tokenHash: string, expiresAt: Date) {
  return prisma.session.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });
}

export function updateLastLogin(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });
}

export function findSessionByTokenHash(tokenHash: string) {
  return prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          profile: { select: profileSelect },
        },
      },
    },
  });
}

export function deleteSessionByTokenHash(tokenHash: string) {
  return prisma.session.deleteMany({
    where: { tokenHash },
  });
}

export function replacePasswordResetToken(userId: string, tokenHash: string, expiresAt: Date) {
  return prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
    return tx.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  });
}

export function findPasswordResetToken(tokenHash: string) {
  return prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
      user: { select: { isActive: true } },
    },
  });
}

export function resetPasswordAndSessions(args: {
  tokenId: string;
  userId: string;
  passwordHash: string;
}) {
  return prisma.$transaction(async (tx) => {
    const consumed = await tx.passwordResetToken.updateMany({
      where: {
        id: args.tokenId,
        userId: args.userId,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    });
    if (consumed.count !== 1) {
      throw new AppError("Password reset link is invalid or expired.", 400);
    }
    await tx.user.update({
      where: { id: args.userId },
      data: { passwordHash: args.passwordHash },
    });
    await tx.session.deleteMany({ where: { userId: args.userId } });
    await tx.passwordResetToken.updateMany({
      where: { userId: args.userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  });
}

export function findInvitationByTokenHash(tokenHash: string) {
  return prisma.userInvitation.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      acceptedAt: true,
      expiresAt: true,
    },
  });
}

export function acceptInvitationWithSession(args: {
  invitationId: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  profilePictureUrl?: string | null;
  role: UserRole;
  passwordHash: string;
  invalidatedTokenHash: string;
  sessionTokenHash: string;
  sessionExpiresAt: Date;
}) {
  return prisma.$transaction(async (tx) => {
    // Accepting an invite updates the user, consumes the token, and creates a session atomically.
    const existingUser = await tx.user.findUnique({
      where: { email: args.email },
      select: { id: true, isActive: true },
    });

    if (existingUser?.isActive) {
      throw new AppError("A user with this email is already active.", 409);
    }

    const user = existingUser
      ? await tx.user.update({
          where: { id: existingUser.id },
          data: {
            name: args.name,
            role: args.role,
            passwordHash: args.passwordHash,
            isActive: true,
            lastLoginAt: new Date(),
            profile: {
              upsert: {
                create: profileData(args),
                update: profileData(args),
              },
            },
          },
          select: publicUserSelect,
        })
      : await tx.user.create({
          data: {
            email: args.email,
            name: args.name,
            role: args.role,
            passwordHash: args.passwordHash,
            lastLoginAt: new Date(),
            profile: {
              create: profileData(args),
            },
          },
          select: publicUserSelect,
        });

    await tx.userInvitation.update({
      where: { id: args.invitationId },
      data: {
        acceptedAt: new Date(),
        tokenHash: args.invalidatedTokenHash,
      },
    });

    await tx.session.create({
      data: {
        userId: user.id,
        tokenHash: args.sessionTokenHash,
        expiresAt: args.sessionExpiresAt,
      },
    });

    return user;
  });
}

const profileSelect = {
  firstName: true,
  lastName: true,
  phoneNumber: true,
  profilePictureUrl: true,
  landingType: true,
  landingPath: true,
  landingTargetId: true,
};

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  profile: { select: profileSelect },
};

function profileData(args: {
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  profilePictureUrl?: string | null;
}) {
  return {
    firstName: args.firstName,
    lastName: args.lastName,
    phoneNumber: args.phoneNumber ?? null,
    profilePictureUrl: args.profilePictureUrl ?? null,
  };
}
