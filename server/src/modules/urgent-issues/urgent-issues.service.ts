import { AppError } from "../../utils/AppError";
import { prisma } from "../../db/prisma";
import {
  acknowledgeIssue,
  createUrgentIssue,
  deleteExpiredResolvedIssues,
  findAllIssues,
  findIssueById,
  findIssuesBySender,
  findIssuesForTables,
  resolveIssue,
  unresolveIssue,
} from "./urgent-issues.repository";
import { serializeIssue } from "./urgent-issues.serializer";
import { sendUrgentIssueEmail } from "./urgent-issues.email";
import { resolveManagerTableIds } from "../managers/manager-access";
import type { UrgentIssueStatus } from "@prisma/client";

async function buildItemSnapshot(stockBalanceId: string) {
  const row = await prisma.stockBalance.findUnique({
    where: { id: stockBalanceId },
    include: {
      item: { select: { name: true, identifiers: { select: { type: true, value: true } } } },
      location: { select: { code: true } },
      inventoryTable: { select: { name: true } },
    },
  });
  if (!row) throw new AppError("Stock row not found", 404);
  const articleNumber =
    row.item.identifiers.find((id) => id.type === "manufacturer_article")?.value ?? null;
  return {
    itemName: row.item.name,
    articleNumber,
    tableName: row.inventoryTable?.name ?? "Unknown table",
    location: row.location?.code ?? null,
    quantity: Number(row.quantity),
    unit: row.unit,
  };
}

export async function reportUrgentIssue(
  tableId: string,
  stockBalanceId: string,
  senderId: string,
  message: string
) {
  const itemSnapshot = await buildItemSnapshot(stockBalanceId);
  const issue = await createUrgentIssue({ tableId, stockBalanceId, senderId, message, itemSnapshot });

  // Fire-and-forget email — never blocks the response
  prisma.user
    .findUnique({ where: { id: senderId }, select: { name: true, email: true, role: true } })
    .then((sender) => {
      if (!sender) return;
      void sendUrgentIssueEmail({
        tableId,
        itemName: itemSnapshot.itemName,
        articleNumber: itemSnapshot.articleNumber,
        tableName: itemSnapshot.tableName,
        location: itemSnapshot.location,
        quantity: itemSnapshot.quantity,
        unit: itemSnapshot.unit,
        message,
        senderName: sender.name,
        senderRole: sender.role,
        senderEmail: sender.email,
      });
    })
    .catch(() => null);

  return serializeIssue(issue);
}

export async function listUrgentIssues(
  userId: string,
  userRole: string,
  status: UrgentIssueStatus
) {
  await deleteExpiredResolvedIssues();
  if (userRole === "admin") {
    return (await findAllIssues(status)).map(serializeIssue);
  }
  const tableIds = await resolveManagerTableIds(userId);
  return (await findIssuesForTables(tableIds, status)).map(serializeIssue);
}

export async function listMyReportedIssues(senderId: string) {
  await deleteExpiredResolvedIssues();
  return (await findIssuesBySender(senderId)).map(serializeIssue);
}

export async function acknowledgeResolution(issueId: string, userId: string) {
  const issue = await findIssueById(issueId);
  if (!issue) throw new AppError("Issue not found", 404);
  // Only the reporter may acknowledge their own issue's resolution.
  if (issue.senderId !== userId) {
    throw new AppError("Only the reporter can acknowledge this issue", 403);
  }
  return serializeIssue(await acknowledgeIssue(issueId));
}

export async function markResolved(issueId: string, userId: string, userRole: string) {
  const issue = await findIssueById(issueId);
  if (!issue) throw new AppError("Issue not found", 404);
  if (userRole !== "admin" && userRole !== "manager") {
    throw new AppError("Only managers and admins can resolve issues", 403);
  }
  return serializeIssue(await resolveIssue(issueId, userId));
}

export async function markUnresolved(issueId: string, userId: string, userRole: string) {
  const issue = await findIssueById(issueId);
  if (!issue) throw new AppError("Issue not found", 404);
  if (userRole !== "admin" && userRole !== "manager") {
    throw new AppError("Only managers and admins can unresolve issues", 403);
  }
  if (issue.status !== "resolved") throw new AppError("Issue is not resolved", 400);
  return serializeIssue(await unresolveIssue(issueId));
}
