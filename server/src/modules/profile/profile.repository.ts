import { prisma } from "../../db/prisma";

export function findUserWithProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      passwordHash: true,
      profile: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          profilePictureUrl: true,
        },
      },
    },
  });
}

export function upsertUserProfile(userId: string, data: {
  name?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string | null;
}) {
  const { name, firstName, lastName, phoneNumber } = data;
  return prisma.$transaction(async (tx) => {
    if (name !== undefined) {
      await tx.user.update({ where: { id: userId }, data: { name } });
    }
    if (firstName !== undefined || lastName !== undefined || phoneNumber !== undefined) {
      const existing = await tx.userProfile.findUnique({ where: { userId } });
      if (existing) {
        await tx.userProfile.update({
          where: { userId },
          data: {
            ...(firstName !== undefined ? { firstName } : {}),
            ...(lastName !== undefined ? { lastName } : {}),
            ...(phoneNumber !== undefined ? { phoneNumber } : {}),
          },
        });
      } else {
        await tx.userProfile.create({
          data: {
            userId,
            firstName: firstName ?? "",
            lastName: lastName ?? "",
            phoneNumber: phoneNumber ?? null,
          },
        });
      }
    }
    return tx.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        profile: {
          select: { id: true, firstName: true, lastName: true, phoneNumber: true, profilePictureUrl: true },
        },
      },
    });
  });
}

export function updateUserPassword(userId: string, passwordHash: string) {
  return prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

export function updateProfilePicture(userId: string, profilePictureUrl: string) {
  return prisma.userProfile.upsert({
    where: { userId },
    create: { userId, firstName: "", lastName: "", profilePictureUrl },
    update: { profilePictureUrl },
  });
}
