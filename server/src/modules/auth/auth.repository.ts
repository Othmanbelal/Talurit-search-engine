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

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  profile: {
    select: {
      firstName: true,
      lastName: true,
      phoneNumber: true,
      profilePictureUrl: true,
    },
  },
};

const profileSelect = {
  firstName: true,
  lastName: true,
  phoneNumber: true,
  profilePictureUrl: true,
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
