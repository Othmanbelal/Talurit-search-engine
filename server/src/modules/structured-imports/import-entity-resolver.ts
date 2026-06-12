import type { Prisma } from "@prisma/client";
import { normalizeIdentifier, identifierEntries } from "./mapped-data-access";
import { parseLocation } from "./location-parser";
import { normalizeKey, toNullableString } from "./structured-import.normalizers";
import type { MappedImportData } from "./structured-import.types";

export async function upsertManufacturer(tx: Prisma.TransactionClient, name: string | null) {
  if (!name) return null;
  const normalizedName = normalizeKey(name);
  const existing = await tx.manufacturer.findFirst({ where: { OR: [{ normalizedName }, { name }] } });
  if (existing) return existing;
  return tx.manufacturer.create({ data: { name, normalizedName } });
}

export async function upsertCategory(tx: Prisma.TransactionClient, name: string | null) {
  if (!name) return null;
  const normalizedName = normalizeKey(name);
  return tx.toolCategory.upsert({
    where: { normalizedName },
    create: { name, normalizedName },
    update: { name },
  });
}

export async function upsertLocation(tx: Prisma.TransactionClient, code: string | null) {
  const parsed = parseLocation(code);
  if (!parsed) return null;

  const alias = await tx.locationAlias.findUnique({
    where: { normalizedAlias: parsed.normalizedCode },
    include: { location: true },
  });
  if (alias) return alias.location;

  return tx.storageLocation.upsert({
    where: { normalizedCode: parsed.normalizedCode },
    create: { ...parsed, room: "Verktygsrum" },
    update: { code: parsed.code, displayName: parsed.displayName, isActive: true },
  });
}

export async function findExistingItem(tx: Prisma.TransactionClient, data: MappedImportData, manufacturerId?: string | null) {
  const identifiers = identifierEntries(data);
  for (const identifier of identifiers) {
    const match = await tx.itemIdentifier.findFirst({
      where: { type: identifier.type, normalizedValue: normalizeIdentifier(identifier.value) },
      include: { item: true },
    });
    if (match) return match.item;
  }

  // If the row has article identifiers, a missing exact identifier match means this is a new item.
  // Falling back to product/manufacturer would merge different articles like many "Skär" rows.
  if (identifiers.length > 0) return null;

  const name = toNullableString(data.item.name);
  const normalizedName = name ? normalizeKey(name) : null;
  if (!normalizedName) return null;
  return tx.inventoryItem.findFirst({ where: { normalizedName, manufacturerId: manufacturerId || undefined } });
}
