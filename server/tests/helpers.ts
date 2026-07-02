import { randomUUID } from "node:crypto";
import { expect } from "vitest";
import { prisma } from "../src/db/prisma";

type Role = "admin" | "manager" | "employee" | "viewer";

/** Truncates every table touched by the borrow/consume state machine in one atomic
 * statement. CASCADE covers FK dependents; RESTART IDENTITY is harmless since all
 * ids are cuid strings, not sequences. */
export async function resetDb() {
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "borrow_requests","borrow_records","consumed_stock_items","item_interaction_logs","stock_movements","stock_balances","inventory_items","inventory_tables","inventory_groups","resource_managers","users" RESTART IDENTITY CASCADE;`,
  );
}

export async function createUser(role: Role, opts?: { name?: string }) {
  const suffix = randomUUID().slice(0, 8);
  return prisma.user.create({
    data: {
      email: `${role}-${suffix}@example.test`,
      name: opts?.name ?? `${role[0].toUpperCase()}${role.slice(1)} ${suffix}`,
      passwordHash: "test-hash",
      role,
    },
  });
}

export async function createTableWithStock(quantity: number, opts?: { groupId?: string; unit?: string }) {
  const suffix = randomUUID().slice(0, 8);

  const group = opts?.groupId
    ? null
    : await prisma.inventoryGroup.create({ data: { name: `Test Group ${suffix}` } });
  const groupId = opts?.groupId ?? group?.id;

  const table = await prisma.inventoryTable.create({
    data: {
      name: `Test Table ${suffix}`,
      tableType: "general",
      groupId,
    },
  });

  const itemName = `Test Item ${suffix}`;
  const item = await prisma.inventoryItem.create({
    data: {
      name: itemName,
      normalizedName: itemName.toLowerCase(),
    },
  });

  const stockBalance = await prisma.stockBalance.create({
    data: {
      inventoryTableId: table.id,
      itemId: item.id,
      quantity,
      unit: opts?.unit ?? "pcs",
    },
  });

  return {
    tableId: table.id,
    rowId: stockBalance.id,
    itemId: item.id,
    groupId,
  };
}

/** Awaits `promise`, asserts it rejects with an AppError-shaped error carrying the
 * expected statusCode. Fails explicitly if the promise resolves instead. */
export async function expectAppError(promise: Promise<unknown>, statusCode: number) {
  try {
    await promise;
  } catch (error) {
    expect((error as { statusCode?: number }).statusCode).toBe(statusCode);
    return;
  }
  expect.fail(`Expected promise to reject with AppError statusCode ${statusCode}, but it resolved.`);
}
