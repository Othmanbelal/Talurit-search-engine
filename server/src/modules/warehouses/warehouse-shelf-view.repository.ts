import { prisma } from "../../db/prisma";

export async function findLinkedTableIds(warehouseId: string): Promise<string[]> {
  const [groupLinks, tableLinks] = await Promise.all([
    prisma.warehouseInventoryGroupLink.findMany({
      where: { warehouseId },
      include: { inventoryGroup: { select: { tables: { select: { id: true } } } } },
    }),
    prisma.warehouseInventoryTableLink.findMany({
      where: { warehouseId },
      select: { inventoryTableId: true },
    }),
  ]);

  const ids = new Set<string>();
  for (const link of groupLinks) {
    for (const table of link.inventoryGroup.tables) ids.add(table.id);
  }
  for (const link of tableLinks) ids.add(link.inventoryTableId);
  return [...ids];
}

export async function findShelvesWithItems(warehouseId: string, tableIds: string[]) {
  const shelves = await prisma.warehouseShelf.findMany({
    where: { warehouseId },
    include: {
      warehouseObject: {
        select: {
          id: true,
          name: true,
          externalObjectId: true,
          positionX: true,
          positionY: true,
          elevation: true,
          rotation: true,
          width: true,
          depth: true,
          height: true,
        },
      },
      slots: {
        where: { isActive: true },
        orderBy: [{ slotIndex: "asc" }, { sortOrder: "asc" }],
        select: {
          id: true,
          code: true,
          normalizedCode: true,
          compartment: true,
          displayName: true,
          slotIndex: true,
          storageLocationId: true,
          palletWidth: true,
          palletDepth: true,
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }],
  });

  // locationAssigned is derived: has a storageLocationId and code is not a placeholder
  const withFlag = shelves.map((shelf) => ({
    ...shelf,
    slots: shelf.slots.map((slot) => ({
      ...slot,
      palletWidth: slot.palletWidth ?? 1.2,
      palletDepth: slot.palletDepth ?? 0.8,
      locationAssigned: Boolean(slot.storageLocationId) && !slot.code.startsWith("UNASSIGNED:"),
    })),
  }));

  if (tableIds.length === 0) {
    return withFlag.map((shelf) => ({
      ...shelf,
      slots: shelf.slots.map((slot) => ({ ...slot, items: [] })),
    }));
  }

  const locationCodes = [
    ...new Set(
      withFlag
        .flatMap((s) => s.slots)
        .filter((slot) => slot.locationAssigned && slot.normalizedCode)
        .map((slot) => slot.normalizedCode),
    ),
  ];

  if (locationCodes.length === 0) {
    return withFlag.map((shelf) => ({
      ...shelf,
      slots: shelf.slots.map((slot) => ({ ...slot, items: [] })),
    }));
  }

  const stockRows = await prisma.stockBalance.findMany({
    where: {
      archivedAt: null,
      status: "active",
      inventoryTableId: { in: tableIds },
      location: { normalizedCode: { in: locationCodes } },
    },
    select: {
      id: true,
      quantity: true,
      unit: true,
      compartment: true,
      location: { select: { normalizedCode: true } },
      item: { select: { name: true, manufacturer: { select: { name: true } } } },
      inventoryTable: { select: { id: true, name: true } },
    },
  });

  // Build lookup: bare location code → items, and location+compartment → items
  const itemsByKey = new Map<string, typeof stockRows>();
  for (const row of stockRows) {
    const locCode = row.location?.normalizedCode ?? "";
    if (!locCode) continue;
    const bareList = itemsByKey.get(locCode) ?? [];
    bareList.push(row);
    itemsByKey.set(locCode, bareList);
    if (row.compartment) {
      const fackKey = `${locCode}::${row.compartment}`;
      const fackList = itemsByKey.get(fackKey) ?? [];
      fackList.push(row);
      itemsByKey.set(fackKey, fackList);
    }
  }

  return withFlag.map((shelf) => ({
    ...shelf,
    slots: shelf.slots.map((slot) => {
      if (!slot.locationAssigned || !slot.normalizedCode) return { ...slot, items: [] };
      const key = slot.compartment
        ? `${slot.normalizedCode}::${slot.compartment}`
        : slot.normalizedCode;
      const items = (itemsByKey.get(key) ?? []).map((row) => ({
        id: row.id,
        itemName: row.item.name,
        manufacturer: row.item.manufacturer?.name ?? null,
        quantity: Number(row.quantity),
        unit: row.unit,
        compartment: row.compartment,
        tableId: row.inventoryTable?.id ?? "",
        tableName: row.inventoryTable?.name ?? "",
      }));
      return { ...slot, items };
    }),
  }));
}

export async function findAvailableLocationCodes(warehouseId: string, tableIds: string[]) {
  if (tableIds.length === 0) return [];
  const locations = await prisma.storageLocation.findMany({
    where: {
      stockBalances: {
        some: {
          archivedAt: null,
          status: "active",
          inventoryTableId: { in: tableIds },
        },
      },
    },
    select: { code: true },
    orderBy: { code: "asc" },
  });
  return [...new Set(locations.map((l) => l.code))];
}
