import type { InventoryItem, Prisma, StorageLocation } from "@prisma/client";
import { compartmentValue, quantityValue, unitPriceValue } from "./mapped-data-access";
import type { MappedImportData } from "./structured-import.types";

export async function upsertStockBalance(args: {
  tx: Prisma.TransactionClient;
  item: InventoryItem;
  location: StorageLocation | null;
  inventoryTableId: string;
  stagingRowId: string;
  data: MappedImportData;
  userId?: string;
}) {
  const compartment = compartmentValue(args.data);
  const quantity = quantityValue(args.data);
  const unitPrice = unitPriceValue(args.data);
  // Imported rows are intentionally created as independent table entries.
  // Possible duplicates are shown in preview instead of being merged here.
  const balance = await args.tx.stockBalance.create({
    data: {
      inventoryTableId: args.inventoryTableId,
      itemId: args.item.id,
      locationId: args.location?.id,
      compartment,
      quantity,
      unitPrice,
      sourceImportRowId: args.stagingRowId,
    },
  });

  await args.tx.stockMovement.create({
    data: {
      itemId: args.item.id,
      locationId: args.location?.id,
      stockBalanceId: balance.id,
      movementType: "import_initial_stock",
      quantityChange: quantity,
      quantityBefore: null,
      quantityAfter: quantity,
      reason: "Structured Excel import confirmation",
      createdByUserId: args.userId,
    },
  });

  return balance;
}
