import type { Prisma } from "@prisma/client";
import { normalizeColumnSettings } from "./column-settings";
import { serializeStockRow } from "./structured-inventory.serializer";

type BorrowRecordWithRelations = Prisma.BorrowRecordGetPayload<{
  include: {
    sourceStockBalance: {
      include: {
        item: { include: { manufacturer: true; category: true; identifiers: true; attributes: true } };
        location: true;
        inventoryTable: true;
        usedInAssignments: { include: { card: true } };
      };
    };
    sourceInventoryTable: true;
    item: { include: { manufacturer: true; category: true; identifiers: true; attributes: true } };
    currentHolder: { select: { id: true; name: true } };
    requests: { include: { requester: { select: { id: true; name: true } } } };
  };
}>;

export function serializeBorrowRecord(record: BorrowRecordWithRelations) {
  const pendingRequest = record.requests[0];
  return {
    id: record.id,
    quantity: toNumber(record.quantity),
    notes: record.notes,
    createdAt: record.createdAt,
    currentHolder: record.currentHolder,
    sourceTable: {
      id: record.sourceInventoryTable.id,
      name: record.sourceInventoryTable.name,
      columnSettings: normalizeColumnSettings(record.sourceInventoryTable.columnSettings),
    },
    sourceRow: serializeStockRow(record.sourceStockBalance),
    pendingRequest: pendingRequest
      ? {
          id: pendingRequest.id,
          requesterId: pendingRequest.requesterId,
          requesterName: pendingRequest.requester.name,
          createdAt: pendingRequest.createdAt,
        }
      : null,
  };
}

function toNumber(value: { toNumber?: () => number } | number) {
  return typeof value === "number" ? value : value.toNumber?.() ?? Number(value);
}
