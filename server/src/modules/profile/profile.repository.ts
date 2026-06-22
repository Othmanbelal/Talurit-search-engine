import { prisma } from "../../db/prisma";

const profileFieldSelect = {
  id: true,
  firstName: true,
  lastName: true,
  phoneNumber: true,
  profilePictureUrl: true,
  landingType: true,
  landingPath: true,
  landingTargetId: true,
} as const;

export function findUserWithProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      passwordHash: true,
      profile: { select: profileFieldSelect },
    },
  });
}

export type ProfileWriteData = {
  name?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string | null;
  landingType?: string | null;
  landingPath?: string | null;
  landingTargetId?: string | null;
};

export function upsertUserProfile(userId: string, data: ProfileWriteData) {
  const { name, ...profileFields } = data;
  const profileData = pickDefined(profileFields);
  return prisma.$transaction(async (tx) => {
    if (name !== undefined) {
      await tx.user.update({ where: { id: userId }, data: { name } });
    }
    if (Object.keys(profileData).length > 0) {
      const existing = await tx.userProfile.findUnique({ where: { userId } });
      if (existing) {
        await tx.userProfile.update({ where: { userId }, data: profileData });
      } else {
        await tx.userProfile.create({
          data: {
            userId,
            firstName: profileFields.firstName ?? "",
            lastName: profileFields.lastName ?? "",
            phoneNumber: profileFields.phoneNumber ?? null,
            landingType: profileFields.landingType ?? null,
            landingPath: profileFields.landingPath ?? null,
            landingTargetId: profileFields.landingTargetId ?? null,
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
        profile: { select: profileFieldSelect },
      },
    });
  });
}

/** Clear a landing preference whose group/table target no longer exists. */
export function clearLandingPreference(userId: string) {
  return prisma.userProfile.updateMany({
    where: { userId },
    data: { landingType: null, landingPath: null, landingTargetId: null },
  });
}

function pickDefined<T extends Record<string, unknown>>(input: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(input) as (keyof T)[]) {
    if (input[key] !== undefined) result[key] = input[key];
  }
  return result;
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
