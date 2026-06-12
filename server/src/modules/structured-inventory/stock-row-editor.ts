import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { AppError } from "../../utils/AppError";
import { normalizeIdentifier } from "../structured-imports/mapped-data-access";
import { normalizeKey, toNullableString } from "../structured-imports/structured-import.normalizers";
import type { UpdateStockRowInput } from "./structured-inventory.schemas";
import { createAttributes, createIdentifier, upsertCategory, upsertLocation, upsertManufacturer } from "./manual-stock-writer";

export function updateStockRowRecord(tableId: string, rowId: string, input: UpdateStockRowInput, userId?: string) {
  return prisma.$transaction(async (tx) => {
    const row = await tx.stockBalance.findFirst({ where: { id: rowId, inventoryTableId: tableId }, include: { item: true } });
    if (!row) throw new AppError("Inventory row not found.", 404);

    const manufacturer = await upsertManufacturer(tx, input.manufacturerName);
    const category = await upsertCategory(tx, input.categoryName);
    const location = input.locationCode === undefined
      ? undefined
      : await upsertLocation(tx, input.locationCode, input.locationType);
    const quantityBefore = row.quantity;

    await tx.inventoryItem.update({
      where: { id: row.itemId },
      data: itemUpdateData(
        input,
        input.manufacturerName === undefined ? undefined : manufacturer?.id ?? null,
        input.categoryName === undefined ? undefined : category?.id ?? null,
      ),
    });
    await replaceIdentifiers(tx, row.itemId, input);
    await replaceAttributes(tx, row.itemId, input);

    const updated = await tx.stockBalance.update({
      where: { id: row.id },
      data: balanceUpdateData(input, location?.id),
    });

    if (input.quantity !== undefined && !quantityBefore.equals(updated.quantity)) {
      await tx.stockMovement.create({
        data: {
          itemId: row.itemId,
          locationId: updated.locationId,
          stockBalanceId: row.id,
          movementType: "manual_adjustment",
          quantityChange: updated.quantity.minus(quantityBefore),
          quantityBefore,
          quantityAfter: updated.quantity,
          reason: "Inventory row edited",
          createdByUserId: userId,
        },
      });
    }

    return updated;
  });
}

export function archiveStockRowRecord(tableId: string, rowId: string, userId?: string) {
  return prisma.stockBalance.updateMany({
    where: { id: rowId, inventoryTableId: tableId },
    data: { status: "archived", archivedAt: new Date(), archivedByUserId: userId },
  });
}

export function restoreStockRowRecord(tableId: string, rowId: string) {
  return prisma.stockBalance.updateMany({
    where: { id: rowId, inventoryTableId: tableId },
    data: { status: "active", archivedAt: null, archivedByUserId: null },
  });
}

export function deleteStockRowRecord(tableId: string, rowId: string) {
  return prisma.stockBalance.deleteMany({ where: { id: rowId, inventoryTableId: tableId } });
}

function itemUpdateData(input: UpdateStockRowInput, manufacturerId?: string | null, categoryId?: string | null) {
  const name = toNullableString(input.itemName);
  const qrCodeId = toNullableString(input.qrCodeId);
  const data: Prisma.InventoryItemUncheckedUpdateInput = {
    ...(name ? { name, normalizedName: normalizeKey(name) } : {}),
    manufacturerId,
    categoryId,
    grade: input.grade,
    imageUrl: input.imageUrl,
    qrCodeImageUrl: input.qrCodeImageUrl,
  };
  if (qrCodeId) data.qrCodeId = qrCodeId;
  return data;
}

async function replaceIdentifiers(
  tx: Prisma.TransactionClient,
  itemId: string,
  input: UpdateStockRowInput,
) {
  if (input.articleNumber === undefined && input.alternativeArticleNumber === undefined) return;
  await tx.itemIdentifier.deleteMany({ where: { itemId, type: { in: ["manufacturer_article", "alternative_article"] } } });
  await createIdentifier(tx, itemId, "manufacturer_article", input.articleNumber);
  await createIdentifier(tx, itemId, "alternative_article", input.alternativeArticleNumber);
}

async function replaceAttributes(tx: Prisma.TransactionClient, itemId: string, input: UpdateStockRowInput) {
  if (input.attributes === undefined) return;
  await tx.itemAttribute.deleteMany({ where: { itemId } });
  await createAttributes(tx, itemId, input.attributes);
}

function balanceUpdateData(input: UpdateStockRowInput, locationId: string | null | undefined) {
  return {
    locationId,
    compartment: input.compartment,
    quantity: input.quantity,
    unit: input.unit,
    unitPrice: input.unitPrice,
    currency: input.currency,
    notes: input.notes,
    status: input.status,
  };
}
