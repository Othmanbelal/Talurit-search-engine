import { prisma } from "../../db/prisma";
import type { UrgentIssueStatus } from "@prisma/client";

const INCLUDE_FULL = {
  sender: {
    select: {
      id: true,
      name: true,
      role: true,
      profile: { select: { profilePictureUrl: true } },
    },
  },
  resolvedBy: { select: { id: true, name: true } },
  table: { select: { id: true, name: true } },
} as const;

type CreateIssueData = {
  tableId: string;
  stockBalanceId: string;
  senderId: string | null;
  message: string;
  itemSnapshot: object;
};

export async function createUrgentIssue(data: CreateIssueData) {
  return prisma.urgentIssue.create({
    data: {
      tableId: data.tableId,
      stockBalanceId: data.stockBalanceId,
      senderId: data.senderId,
      message: data.message,
      itemSnapshot: data.itemSnapshot,
    },
    include: INCLUDE_FULL,
  });
}

export async function findIssuesForTables(tableIds: string[], status: UrgentIssueStatus) {
  return prisma.urgentIssue.findMany({
    where: { tableId: { in: tableIds }, status },
    include: INCLUDE_FULL,
    orderBy: { createdAt: "desc" },
  });
}

export async function findAllIssues(status: UrgentIssueStatus) {
  return prisma.urgentIssue.findMany({
    where: { status },
    include: INCLUDE_FULL,
    orderBy: { createdAt: "desc" },
  });
}

export async function findIssuesBySender(senderId: string) {
  return prisma.urgentIssue.findMany({
    where: { senderId },
    include: INCLUDE_FULL,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function findIssueById(id: string) {
  return prisma.urgentIssue.findUnique({ where: { id }, include: INCLUDE_FULL });
}

export async function resolveIssue(id: string, resolvedById: string) {
  return prisma.urgentIssue.update({
    where: { id },
    data: { status: "resolved", resolvedAt: new Date(), resolvedById },
    include: INCLUDE_FULL,
  });
}

export async function acknowledgeIssue(id: string) {
  return prisma.urgentIssue.update({
    where: { id },
    data: { senderAcknowledgedAt: new Date() },
    include: INCLUDE_FULL,
  });
}

export async function unresolveIssue(id: string) {
  return prisma.urgentIssue.update({
    where: { id },
    data: { status: "open", resolvedAt: null, resolvedById: null },
    include: INCLUDE_FULL,
  });
}

export async function deleteExpiredResolvedIssues() {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await prisma.urgentIssue.deleteMany({
    where: { status: "resolved", resolvedAt: { lt: cutoff } },
  });
}
