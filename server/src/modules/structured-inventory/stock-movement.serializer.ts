import type { Prisma } from "@prisma/client";
import { normalizeColumnSettings } from "./column-settings";
import { serializeStockRow } from "./structured-inventory.serializer";

type TakenItemRecord = Prisma.TakenStockItemGetPayload<{
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
  };
}>;

export function serializeTakenItem(item: TakenItemRecord) {
  return {
    id: item.id,
    quantity: toNumber(item.quantity),
    notes: item.notes,
    createdAt: item.createdAt,
    sourceTable: {
      id: item.sourceInventoryTable.id,
      name: item.sourceInventoryTable.name,
      columnSettings: normalizeColumnSettings(item.sourceInventoryTable.columnSettings),
    },
    sourceRow: serializeStockRow(item.sourceStockBalance),
  };
}

function toNumber(value: { toNumber?: () => number } | number) {
  return typeof value === "number" ? value : value.toNumber?.() ?? Number(value);
}
