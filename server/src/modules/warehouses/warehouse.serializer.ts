import type { WarehouseRecord } from "./warehouse.repository";

export function serializeWarehouse(warehouse: WarehouseRecord) {
  return {
    id: warehouse.id,
    name: warehouse.name,
    description: warehouse.description,
    layoutData: warehouse.layoutData,
    version: warehouse.version,
    isArchived: warehouse.isArchived,
    createdByUser: warehouse.createdByUser
      ? {
          id: warehouse.createdByUser.id,
          name: warehouse.createdByUser.name,
          email: warehouse.createdByUser.email,
        }
      : null,
    counts: {
      assignments: warehouse._count.assignments,
      groupLinks: warehouse._count.groupLinks,
      objects: warehouse._count.objects,
      shelves: warehouse._count.shelves,
      slots: warehouse._count.slots,
      tableLinks: warehouse._count.tableLinks,
    },
    createdAt: warehouse.createdAt,
    updatedAt: warehouse.updatedAt,
  };
}

export function serializeWarehouseSummary(warehouse: WarehouseRecord) {
  return {
    id: warehouse.id,
    name: warehouse.name,
    description: warehouse.description,
    version: warehouse.version,
    isArchived: warehouse.isArchived,
    counts: {
      assignments: warehouse._count.assignments,
      groupLinks: warehouse._count.groupLinks,
      objects: warehouse._count.objects,
      shelves: warehouse._count.shelves,
      slots: warehouse._count.slots,
      tableLinks: warehouse._count.tableLinks,
    },
    createdAt: warehouse.createdAt,
    updatedAt: warehouse.updatedAt,
  };
}
