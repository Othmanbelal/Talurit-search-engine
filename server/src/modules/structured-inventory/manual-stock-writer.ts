import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { normalizeIdentifier } from "../structured-imports/mapped-data-access";
import { parseLocation } from "../structured-imports/location-parser";
import { normalizeKey, toNullableString } from "../structured-imports/structured-import.normalizers";
import type { AddStockRowInput, CreateInventoryTableInput } from "./structured-inventory.schemas";

export function createGroupRecord(data: { name: string; description?: string | null }) {
  return prisma.inventoryGroup.create({ data });
}

export function createTableRecord(input: CreateInventoryTableInput) {
  return prisma.inventoryTable.create({
    data: {
      groupId: input.groupId || null,
      name: input.name,
      tableType: input.tableType,
    },
    include: { group: true, _count: { select: { stockBalances: true } } },
  });
}

export function addManualStockRow(tableId: string, input: AddStockRowInput, userId?: string) {
  return prisma.$transaction(async (tx) => {
    const manufacturer = await upsertManufacturer(tx, input.manufacturerName);
    const category = await upsertCategory(tx, input.categoryName);
    const item = await createItem(tx, input, manufacturer?.id, category?.id);
    const location = await upsertLocation(tx, input.locationCode, input.locationType);
    const balance = await createBalance(tx, tableId, input, item.id, location?.id ?? null);
    await createAttributes(tx, item.id, input.attributes);

    await tx.stockMovement.create({
      data: {
        itemId: item.id,
        locationId: location?.id,
        stockBalanceId: balance.id,
        movementType: "manual_add",
        quantityChange: input.quantity,
        quantityBefore: null,
        quantityAfter: balance.quantity,
        reason: "Manual inventory table entry",
        createdByUserId: userId,
      },
    });

    return balance;
  });
}

export async function upsertManufacturer(tx: Prisma.TransactionClient, name?: string | null) {
  const cleanName = toNullableString(name);
  if (!cleanName) return null;
  const normalizedName = normalizeKey(cleanName);
  const existing = await tx.manufacturer.findFirst({ where: { OR: [{ name: cleanName }, { normalizedName }] } });
  return existing ?? tx.manufacturer.create({ data: { name: cleanName, normalizedName } });
}

export async function upsertCategory(tx: Prisma.TransactionClient, name?: string | null) {
  const cleanName = toNullableString(name);
  if (!cleanName) return null;
  const normalizedName = normalizeKey(cleanName);
  return tx.toolCategory.upsert({ where: { normalizedName }, create: { name: cleanName, normalizedName }, update: { name: cleanName } });
}

async function createItem(
  tx: Prisma.TransactionClient,
  input: AddStockRowInput,
  manufacturerId?: string | null,
  categoryId?: string | null,
) {
  const normalizedName = normalizeKey(input.itemName);
  const item = await tx.inventoryItem.create({
    data: {
      name: input.itemName,
      normalizedName,
      manufacturerId,
      categoryId,
      grade: input.grade,
      imageUrl: input.imageUrl,
      qrCodeImageUrl: input.qrCodeImageUrl,
    },
  });

  await createIdentifier(tx, item.id, "manufacturer_article", input.articleNumber);
  await createIdentifier(tx, item.id, "alternative_article", input.alternativeArticleNumber);
  return item;
}

export async function createAttributes(
  tx: Prisma.TransactionClient,
  itemId: string,
  attributes?: AddStockRowInput["attributes"],
) {
  const rows = (attributes ?? []).flatMap((attribute) => {
    const name = toNullableString(attribute.name);
    const rawValue = toNullableString(attribute.rawValue);
    if (!name || !rawValue) return [];
    return { itemId, name: normalizeKey(name), rawValue, numericValue: numericValue(rawValue), unit: toNullableString(attribute.unit) };
  });
  if (rows.length > 0) await tx.itemAttribute.createMany({ data: rows });
}

export async function createIdentifier(tx: Prisma.TransactionClient, itemId: string, type: string, value?: string | null) {
  const cleanValue = toNullableString(value);
  if (!cleanValue) return;
  await tx.itemIdentifier.create({
    data: { itemId, type, value: cleanValue, normalizedValue: normalizeIdentifier(cleanValue) },
  });
}

export async function upsertLocation(tx: Prisma.TransactionClient, code?: string | null, locationType = "stockroom_position") {
  const cleanCode = toNullableString(code);
  if (!cleanCode) return null;
  const parsed = locationType === "stockroom_position" ? parseLocation(cleanCode) : null;
  const normalizedCode = parsed?.normalizedCode ?? `${locationType}_${normalizeKey(cleanCode)}`;
  const displayName = parsed?.displayName ?? `${locationLabel(locationType)} / ${cleanCode}`;

  return tx.storageLocation.upsert({
    where: { normalizedCode },
    create: { code: parsed?.code ?? cleanCode, normalizedCode, locationType, displayName },
    update: { code: parsed?.code ?? cleanCode, locationType, displayName, isActive: true },
  });
}

async function createBalance(tx: Prisma.TransactionClient, tableId: string, input: AddStockRowInput, itemId: string, locationId: string | null) {
  return tx.stockBalance.create({ data: balanceData(tableId, input, itemId, locationId, input.quantity) });
}

function balanceData(tableId: string, input: AddStockRowInput, itemId: string, locationId: string | null, quantity: number) {
  return {
    inventoryTableId: tableId,
    itemId,
    locationId,
    compartment: input.compartment || null,
    quantity,
    unit: input.unit,
    unitPrice: input.unitPrice,
    currency: input.currency,
    notes: input.notes,
  };
}

function locationLabel(type: string) {
  if (type === "used_in") return "Used in";
  if (type === "location_in") return "Location in";
  return "Storage";
}

function numericValue(value: string) {
  const normalized = value.replace(",", ".");
  return /^-?\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : null;
}
