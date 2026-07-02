import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/modules/low-stock/low-stock.service", () => ({
  evaluateLowStock: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "../src/db/prisma";
import {
  borrowStockItem,
  consumeStockItem,
  getBorrowedItems,
} from "../src/modules/structured-inventory/stock-movement.service";
import { createTableWithStock, createUser, expectAppError, resetDb } from "./helpers";

beforeEach(resetDb);

describe("consumeStockItem", () => {
  it("decrements stock and creates a ConsumedStockItem row", async () => {
    const user = await createUser("employee");
    const { tableId, rowId } = await createTableWithStock(10);

    await consumeStockItem(tableId, rowId, { quantity: 4, notes: "used up" }, user.id);

    const stock = await prisma.stockBalance.findUniqueOrThrow({ where: { id: rowId } });
    expect(stock.quantity.toNumber()).toBe(6);

    const consumed = await prisma.consumedStockItem.findMany({ where: { sourceStockBalanceId: rowId } });
    expect(consumed).toHaveLength(1);
    expect(consumed[0].quantity.toNumber()).toBe(4);
    expect(consumed[0].sourceStockBalanceId).toBe(rowId);
  });

  it("rejects quantity greater than available with AppError 400", async () => {
    const user = await createUser("employee");
    const { tableId, rowId } = await createTableWithStock(3);

    await expectAppError(consumeStockItem(tableId, rowId, { quantity: 5 }, user.id), 400);
  });

  it("leaves no returnable artifact (no BorrowRecord created)", async () => {
    const user = await createUser("employee");
    const { tableId, rowId } = await createTableWithStock(10);

    await consumeStockItem(tableId, rowId, { quantity: 2 }, user.id);

    const records = await prisma.borrowRecord.findMany({ where: { sourceStockBalanceId: rowId } });
    expect(records).toHaveLength(0);
  });
});

describe("borrowStockItem", () => {
  it("creates an active BorrowRecord with currentHolderId and decrements stock", async () => {
    const user = await createUser("employee");
    const { tableId, rowId } = await createTableWithStock(10);

    await borrowStockItem(tableId, rowId, { quantity: 3 }, user.id);

    const stock = await prisma.stockBalance.findUniqueOrThrow({ where: { id: rowId } });
    expect(stock.quantity.toNumber()).toBe(7);

    const records = await prisma.borrowRecord.findMany({ where: { sourceStockBalanceId: rowId } });
    expect(records).toHaveLength(1);
    expect(records[0].status).toBe("active");
    expect(records[0].currentHolderId).toBe(user.id);
    expect(records[0].quantity.toNumber()).toBe(3);
  });

  it("handles two different users borrowing the same row concurrently without lost updates", async () => {
    const userA = await createUser("employee");
    const userB = await createUser("employee");
    const { tableId, rowId } = await createTableWithStock(20);

    await Promise.all([
      borrowStockItem(tableId, rowId, { quantity: 5 }, userA.id),
      borrowStockItem(tableId, rowId, { quantity: 7 }, userB.id),
    ]);

    const stock = await prisma.stockBalance.findUniqueOrThrow({ where: { id: rowId } });
    expect(stock.quantity.toNumber()).toBe(20 - 5 - 7);

    const records = await prisma.borrowRecord.findMany({ where: { sourceStockBalanceId: rowId } });
    expect(records).toHaveLength(2);
  });
});

describe("getBorrowedItems", () => {
  it("returns viewerCanResolve true for the holder, false for an unrelated employee, true for admin", async () => {
    const holder = await createUser("employee");
    const stranger = await createUser("employee");
    const admin = await createUser("admin");
    const { tableId, rowId } = await createTableWithStock(10);

    await borrowStockItem(tableId, rowId, { quantity: 2 }, holder.id);

    const asHolder = await getBorrowedItems(holder.id, "employee");
    expect(asHolder).toHaveLength(1);
    expect(asHolder[0].viewerCanResolve).toBe(true);
    expect(asHolder[0].currentHolder?.id).toBe(holder.id);
    expect(asHolder[0].quantity).toBe(2);

    const asStranger = await getBorrowedItems(stranger.id, "employee");
    expect(asStranger[0].viewerCanResolve).toBe(false);

    const asAdmin = await getBorrowedItems(admin.id, "admin");
    expect(asAdmin[0].viewerCanResolve).toBe(true);
  });
});
