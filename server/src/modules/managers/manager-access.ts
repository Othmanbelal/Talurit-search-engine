import { prisma } from "../../db/prisma";

/**
 * Resolve every inventory table a user manages: tables they manage directly plus
 * all tables inside any group they manage.
 */
export async function resolveManagerTableIds(userId: string): Promise<string[]> {
  const managers = await prisma.resourceManager.findMany({
    where: { userId },
    select: { resourceType: true, resourceId: true },
  });
  const directTableIds = managers
    .filter((m) => m.resourceType === "inventory_table")
    .map((m) => m.resourceId);
  const groupIds = managers
    .filter((m) => m.resourceType === "inventory_group")
    .map((m) => m.resourceId);

  let inheritedTableIds: string[] = [];
  if (groupIds.length > 0) {
    const tables = await prisma.inventoryTable.findMany({
      where: { groupId: { in: groupIds } },
      select: { id: true },
    });
    inheritedTableIds = tables.map((t) => t.id);
  }
  return [...new Set([...directTableIds, ...inheritedTableIds])];
}

/** Whether a user manages a specific table (directly or via its group). */
export async function isTableManager(userId: string, tableId: string): Promise<boolean> {
  const tableIds = await resolveManagerTableIds(userId);
  return tableIds.includes(tableId);
}

/**
 * Unique active email addresses of all managers responsible for a table:
 * direct table managers + parent group managers.
 */
export async function getManagerEmails(tableId: string): Promise<string[]> {
  const table = await prisma.inventoryTable.findUnique({
    where: { id: tableId },
    select: { groupId: true },
  });

  const resources: { resourceType: "inventory_table" | "inventory_group"; resourceId: string }[] = [
    { resourceType: "inventory_table", resourceId: tableId },
  ];
  if (table?.groupId) {
    resources.push({ resourceType: "inventory_group", resourceId: table.groupId });
  }

  const managers = await prisma.resourceManager.findMany({
    where: { OR: resources.map((r) => ({ resourceType: r.resourceType, resourceId: r.resourceId })) },
    include: { user: { select: { email: true, isActive: true } } },
  });

  return [...new Set(managers.filter((m) => m.user.isActive).map((m) => m.user.email))];
}
