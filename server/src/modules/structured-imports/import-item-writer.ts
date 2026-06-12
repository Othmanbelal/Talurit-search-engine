import type { Prisma } from "@prisma/client";
import {
  attributeEntries,
  identifierEntries,
  itemName,
  normalizeIdentifier,
} from "./mapped-data-access";
import { normalizeKey } from "./structured-import.normalizers";
import type { MappedImportData } from "./structured-import.types";

export async function createInventoryItemFromImport(args: {
  tx: Prisma.TransactionClient;
  data: MappedImportData;
  manufacturerId?: string | null;
  categoryId?: string | null;
  grade?: string | null;
}) {
  const name = itemName(args.data) || "Unnamed item";
  const item = await args.tx.inventoryItem.create({
    data: {
      name,
      normalizedName: normalizeKey(name),
      manufacturerId: args.manufacturerId,
      categoryId: args.categoryId,
      grade: args.grade,
      rawExamples: args.data as Prisma.InputJsonValue,
    },
  });

  await createIdentifiers(args.tx, item.id, args.data);
  await createAttributes(args.tx, item.id, args.data);
  return item;
}

async function createIdentifiers(tx: Prisma.TransactionClient, itemId: string, data: MappedImportData) {
  for (const identifier of identifierEntries(data)) {
    await tx.itemIdentifier.create({
      data: {
        itemId,
        type: identifier.type,
        value: identifier.value,
        normalizedValue: normalizeIdentifier(identifier.value),
      },
    });
  }
}

async function createAttributes(tx: Prisma.TransactionClient, itemId: string, data: MappedImportData) {
  for (const attribute of attributeEntries(data)) {
    await tx.itemAttribute.create({
      data: {
        itemId,
        name: attribute.name,
        rawValue: attribute.rawValue,
        numericValue: attribute.numericValue,
        unit: attribute.unit,
        sourceColumn: attribute.sourceColumn,
      },
    });
  }
}
