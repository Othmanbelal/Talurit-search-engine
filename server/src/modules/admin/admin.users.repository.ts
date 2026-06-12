import type { Prisma, UserRole } from "@prisma/client";
import { prisma } from "../../db/prisma";

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  profile: {
    select: {
      firstName: true,
      lastName: true,
      phoneNumber: true,
      profilePictureUrl: true,
    },
  },
  createdAt: true,
  updatedAt: true,
};

const invitationSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  invitedByUserId: true,
  acceptedAt: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
  invitedByUser: {
    select: { id: true, name: true, email: true },
  },
};

export function listAdminUsers() {
  return prisma.user.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: userSelect,
  });
}

export function findAdminUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: userSelect,
  });
}

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, isActive: true },
  });
}

export function countActiveAdmins() {
  return prisma.user.count({
    where: { role: "admin", isActive: true },
  });
}

export function updateAdminUser(id: string, data: Prisma.UserUpdateInput) {
  return prisma.user.update({
    where: { id },
    data,
    select: userSelect,
  });
}

export function deleteUserSessions(userId: string) {
  return prisma.session.deleteMany({ where: { userId } });
}

export function findFirstActiveAdminEmail() {
  return prisma.user.findFirst({
    where: { role: "admin", isActive: true },
    orderBy: { createdAt: "asc" },
    select: { email: true },
  });
}

export async function listInvitations() {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await prisma.userInvitation.deleteMany({
    where: { acceptedAt: null, expiresAt: { lt: cutoff } },
  });
  return prisma.userInvitation.findMany({
    where: { acceptedAt: null },
    orderBy: [{ expiresAt: "asc" }, { createdAt: "desc" }],
    select: invitationSelect,
  });
}

export function findInvitationById(id: string) {
  return prisma.userInvitation.findUnique({
    where: { id },
    select: {
      ...invitationSelect,
      tokenHash: true,
    },
  });
}

export function findPendingInvitationByEmail(email: string) {
  return prisma.userInvitation.findFirst({
    where: {
      email,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      ...invitationSelect,
      tokenHash: true,
    },
  });
}

export function createInvitation(data: {
  email: string;
  name?: string | null;
  role: UserRole;
  tokenHash: string;
  invitedByUserId: string;
  expiresAt: Date;
}) {
  return prisma.userInvitation.create({
    data,
    select: {
      ...invitationSelect,
      tokenHash: true,
    },
  });
}

export function updateInvitationToken(
  id: string,
  data: { tokenHash: string; expiresAt: Date },
) {
  return prisma.userInvitation.update({
    where: { id },
    data,
    select: {
      ...invitationSelect,
      tokenHash: true,
    },
  });
}

export function expireInvitation(id: string) {
  return prisma.userInvitation.update({
    where: { id },
    data: { expiresAt: new Date() },
    select: invitationSelect,
  });
}

export function getSetting(key: string) {
  return prisma.appSetting.findUnique({
    where: { key },
    select: { value: true },
  });
}

export function setSetting(key: string, value: string) {
  return prisma.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
    select: { key: true, value: true },
  });
}
