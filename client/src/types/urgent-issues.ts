export type IssueItemSnapshot = {
  itemName: string;
  articleNumber: string | null;
  tableName: string;
  location: string | null;
  quantity: number;
  unit: string;
};

export type IssueSender = {
  id: string;
  name: string;
  role: string;
  pictureUrl: string | null;
};

export type UrgentIssue = {
  id: string;
  tableId: string;
  tableName: string;
  stockBalanceId: string;
  message: string;
  itemSnapshot: IssueItemSnapshot;
  status: "open" | "resolved";
  resolvedAt: string | null;
  createdAt: string;
  sender: IssueSender | null;
  resolvedBy: { id: string; name: string } | null;
};
