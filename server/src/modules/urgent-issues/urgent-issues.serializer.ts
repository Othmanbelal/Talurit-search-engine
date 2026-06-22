type IssueRow = {
  id: string;
  tableId: string;
  stockBalanceId: string;
  senderId: string | null;
  resolvedById: string | null;
  message: string;
  itemSnapshot: unknown;
  status: string;
  resolvedAt: Date | null;
  senderAcknowledgedAt: Date | null;
  createdAt: Date;
  sender: {
    id: string;
    name: string;
    role: string;
    profile: { profilePictureUrl: string | null } | null;
  } | null;
  resolvedBy: { id: string; name: string } | null;
  table: { id: string; name: string };
};

export function serializeIssue(issue: IssueRow) {
  // Unread = resolved but not yet acknowledged by the reporter for THIS resolution.
  // Comparing against resolvedAt re-marks a re-resolved issue as unread.
  const unread =
    issue.status === "resolved" &&
    issue.resolvedAt != null &&
    (issue.senderAcknowledgedAt == null || issue.senderAcknowledgedAt < issue.resolvedAt);

  return {
    id: issue.id,
    tableId: issue.tableId,
    tableName: issue.table.name,
    stockBalanceId: issue.stockBalanceId,
    message: issue.message,
    itemSnapshot: issue.itemSnapshot as Record<string, unknown>,
    status: issue.status as "open" | "resolved",
    resolvedAt: issue.resolvedAt?.toISOString() ?? null,
    unread,
    createdAt: issue.createdAt.toISOString(),
    sender: issue.sender
      ? {
          id: issue.sender.id,
          name: issue.sender.name,
          role: issue.sender.role,
          pictureUrl: issue.sender.profile?.profilePictureUrl ?? null,
        }
      : null,
    resolvedBy: issue.resolvedBy
      ? { id: issue.resolvedBy.id, name: issue.resolvedBy.name }
      : null,
  };
}
