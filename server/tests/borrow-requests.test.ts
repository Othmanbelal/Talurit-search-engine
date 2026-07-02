import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/modules/low-stock/low-stock.service", () => ({
  evaluateLowStock: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "../src/db/prisma";
import { borrowStockItem } from "../src/modules/structured-inventory/stock-movement.service";
import {
  acceptRequest,
  cancelRequest,
  declineRequest,
  requestBorrow,
} from "../src/modules/borrow-requests/borrow-requests.service";
import { createTableWithStock, createUser, expectAppError, resetDb } from "./helpers";

beforeEach(resetDb);

async function setupBorrow(quantity = 5, stock = 10) {
  const holder = await createUser("employee");
  const { tableId, rowId } = await createTableWithStock(stock);
  await borrowStockItem(tableId, rowId, { quantity }, holder.id);
  const record = await prisma.borrowRecord.findFirstOrThrow({ where: { sourceStockBalanceId: rowId } });
  return { holder, tableId, rowId, record };
}

describe("requestBorrow", () => {
  it("rejects a request by the current holder with AppError 400", async () => {
    const { holder, record } = await setupBorrow();
    await expectAppError(requestBorrow(record.id, holder.id), 400);
  });

  it("rejects a second request while one is already pending", async () => {
    const { record } = await setupBorrow();
    const requesterA = await createUser("employee");
    const requesterB = await createUser("employee");

    await requestBorrow(record.id, requesterA.id);
    await expectAppError(requestBorrow(record.id, requesterB.id), 400);
  });
});

describe("acceptRequest", () => {
  it("transfers custody: old record transferred, new active record linked, request accepted", async () => {
    const { holder, record } = await setupBorrow(5);
    const requester = await createUser("employee");
    const request = await requestBorrow(record.id, requester.id);

    const newRecord = await acceptRequest(request.id, holder.id, "employee");

    const oldRecord = await prisma.borrowRecord.findUniqueOrThrow({ where: { id: record.id } });
    expect(oldRecord.status).toBe("transferred");
    expect(oldRecord.closedAt).not.toBeNull();

    expect(newRecord.status).toBe("active");
    expect(newRecord.previousBorrowRecordId).toBe(record.id);
    expect(newRecord.currentHolderId).toBe(requester.id);

    const updatedRequest = await prisma.borrowRequest.findUniqueOrThrow({ where: { id: request.id } });
    expect(updatedRequest.status).toBe("accepted");
    expect(updatedRequest.resolvedById).toBe(holder.id);
  });

  it("rejects accept by an unrelated employee (not holder, not manager, not admin) with 403", async () => {
    const { record } = await setupBorrow();
    const requester = await createUser("employee");
    const request = await requestBorrow(record.id, requester.id);
    const stranger = await createUser("employee");

    await expectAppError(acceptRequest(request.id, stranger.id, "employee"), 403);
  });

  it("rejects accept by a manager who does not manage the table with 403", async () => {
    const { record } = await setupBorrow();
    const requester = await createUser("employee");
    const request = await requestBorrow(record.id, requester.id);
    const manager = await createUser("manager");

    await expectAppError(acceptRequest(request.id, manager.id, "manager"), 403);
  });

  it("allows accept by a manager who does manage the table", async () => {
    const { record, tableId } = await setupBorrow();
    const requester = await createUser("employee");
    const request = await requestBorrow(record.id, requester.id);
    const manager = await createUser("manager");
    await prisma.resourceManager.create({
      data: { userId: manager.id, resourceType: "inventory_table", resourceId: tableId },
    });

    const newRecord = await acceptRequest(request.id, manager.id, "manager");
    expect(newRecord.currentHolderId).toBe(requester.id);
  });
});

describe("declineRequest", () => {
  it("sets status declined, and the same requester can request again afterward", async () => {
    const { holder, record } = await setupBorrow();
    const requester = await createUser("employee");
    const request = await requestBorrow(record.id, requester.id);

    await declineRequest(request.id, holder.id, "employee");

    const updated = await prisma.borrowRequest.findUniqueOrThrow({ where: { id: request.id } });
    expect(updated.status).toBe("declined");

    const secondRequest = await requestBorrow(record.id, requester.id);
    expect(secondRequest.status).toBe("pending");
  });
});

describe("cancelRequest", () => {
  it("rejects cancel by a non-requester with 403", async () => {
    const { record } = await setupBorrow();
    const requester = await createUser("employee");
    const request = await requestBorrow(record.id, requester.id);
    const stranger = await createUser("employee");

    await expectAppError(cancelRequest(request.id, stranger.id), 403);
  });

  it("succeeds for the actual requester, setting status cancelled", async () => {
    const { record } = await setupBorrow();
    const requester = await createUser("employee");
    const request = await requestBorrow(record.id, requester.id);

    await cancelRequest(request.id, requester.id);

    const updated = await prisma.borrowRequest.findUniqueOrThrow({ where: { id: request.id } });
    expect(updated.status).toBe("cancelled");
  });
});

describe("requestBorrow — concurrency", () => {
  it("allows exactly one of two concurrent duplicate requests to win (P2002 via partial index)", async () => {
    const { record } = await setupBorrow();
    const requesterA = await createUser("employee");
    const requesterB = await createUser("employee");

    const results = await Promise.allSettled([
      requestBorrow(record.id, requesterA.id),
      requestBorrow(record.id, requesterB.id),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({ statusCode: 400 });

    const pendingRequests = await prisma.borrowRequest.findMany({
      where: { borrowRecordId: record.id, status: "pending" },
    });
    expect(pendingRequests).toHaveLength(1);
  });
});

describe("acceptRequest vs declineRequest — concurrency", () => {
  it("allows exactly one of concurrent accept/decline on the same request to succeed", async () => {
    const { holder, record } = await setupBorrow();
    const requester = await createUser("employee");
    const request = await requestBorrow(record.id, requester.id);

    const results = await Promise.allSettled([
      acceptRequest(request.id, holder.id, "employee"),
      declineRequest(request.id, holder.id, "employee"),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({ statusCode: 409 });
  });
});
