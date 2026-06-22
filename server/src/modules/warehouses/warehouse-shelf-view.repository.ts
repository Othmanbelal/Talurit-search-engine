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
        select: slotSelect(),
      },
    },
    orderBy: [{ sortOrder: "asc" }],
  });

  const withFlags = shelves.map((shelf) => ({
    ...shelf,
    slots: shelf.slots.map((slot) => ({
      ...slot,
      palletWidth: slot.palletWidth ?? 1.2,
      palletDepth: slot.palletDepth ?? 0.8,
      locationAssigned: Boolean(slot.storageLocationId) && !slot.code.startsWith("UNASSIGNED:"),
    })),
  }));

  if (tableIds.length === 0) {
    return withFlags.map((shelf) => ({
      ...shelf,
      slots: shelf.slots.map((slot) => ({ ...slot, items: [] as ShelfViewItem[] })),
    }));
  }

  const assignments = await prisma.warehouseSlotAssignment.findMany({
    where: {
      warehouseId,
      unassignedAt: null,
      inventoryTableId: { in: tableIds },
      stockBalance: { archivedAt: null, status: "active" },
    },
    select: {
      id: true,
      slotId: true,
      containerType: true,
      stockBalance: {
        select: {
          id: true,
          quantity: true,
          unit: true,
          compartment: true,
          location: { select: { code: true } },
          item: { select: { name: true, imageUrl: true, manufacturer: { select: { name: true } } } },
          inventoryTable: { select: { id: true, name: true } },
        },
      },
    },
  });

  // Warehouse occupancy is explicit: assigned stock rows create pallets, not location-code guesses.
  const assignmentsBySlot = new Map<string, typeof assignments>();
  for (const assignment of assignments) {
    const list = assignmentsBySlot.get(assignment.slotId) ?? [];
    list.push(assignment);
    assignmentsBySlot.set(assignment.slotId, list);
  }

  return withFlags.map((shelf) => ({
    ...shelf,
    slots: shelf.slots.map((slot) => ({
      ...slot,
      items: (assignmentsBySlot.get(slot.id) ?? []).map(({ id, containerType, stockBalance }) => ({
        id: stockBalance.id,
        assignmentId: id,
        containerType: (containerType === "box" ? "box" : "pallet") as "pallet" | "box",
        itemName: stockBalance.item.name,
        imageUrl: stockBalance.item.imageUrl ?? null,
        manufacturer: stockBalance.item.manufacturer?.name ?? null,
        quantity: Number(stockBalance.quantity),
        unit: stockBalance.unit,
        compartment: stockBalance.compartment,
        locationCode: stockBalance.location?.code ?? null,
        tableId: stockBalance.inventoryTable?.id ?? "",
        tableName: stockBalance.inventoryTable?.name ?? "",
      })),
    })),
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
  return [...new Set(locations.map((location) => location.code))];
}

function slotSelect() {
  return {
    id: true,
    code: true,
    normalizedCode: true,
    compartment: true,
    displayName: true,
    slotIndex: true,
    storageLocationId: true,
    palletWidth: true,
    palletDepth: true,
  } as const;
}

type ShelfViewItem = {
  id: string;
  assignmentId: string;
  containerType: "pallet" | "box";
  itemName: string;
  imageUrl: string | null;
  manufacturer: string | null;
  quantity: number;
  unit: string;
  compartment: string | null;
  locationCode: string | null;
  tableId: string;
  tableName: string;
};
