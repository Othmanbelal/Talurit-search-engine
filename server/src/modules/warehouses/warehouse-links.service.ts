import { AppError } from "../../utils/AppError";
import {
  createGroupLink,
  createTableLink,
  deleteGroupLink,
  deleteTableLink,
  findAvailableGroups,
  findAvailableTables,
  findInventoryLinks,
} from "./warehouse-links.repository";
import { getWarehouse } from "./warehouse.service";

export async function getInventoryLinks(warehouseId: string) {
  await getWarehouse(warehouseId);
  const [groupLinks, tableLinks] = await findInventoryLinks(warehouseId);
  return {
    groupLinks: groupLinks.map((link) => ({
      id: link.id,
      groupId: link.inventoryGroupId,
      name: link.inventoryGroup.name,
      tableCount: link.inventoryGroup._count.tables,
    })),
    tableLinks: tableLinks.map((link) => ({
      id: link.id,
      tableId: link.inventoryTableId,
      name: link.inventoryTable.name,
      groupId: link.inventoryTable.groupId,
    })),
  };
}

export async function getAvailableInventory(warehouseId: string) {
  await getWarehouse(warehouseId);
  const [groups, tables] = await Promise.all([
    findAvailableGroups(warehouseId),
    findAvailableTables(warehouseId),
  ]);
  return { groups, tables };
}

export async function addGroupLink(warehouseId: string, groupId: string) {
  await getWarehouse(warehouseId);
  try {
    const link = await createGroupLink(warehouseId, groupId);
    return {
      id: link.id,
      groupId: link.inventoryGroupId,
      name: link.inventoryGroup.name,
      tableCount: link.inventoryGroup._count.tables,
    };
  } catch {
    throw new AppError("This inventory group is already linked or does not exist.", 409);
  }
}

export async function removeGroupLink(warehouseId: string, groupId: string) {
  await getWarehouse(warehouseId);
  await deleteGroupLink(warehouseId, groupId);
}

export async function addTableLink(warehouseId: string, tableId: string) {
  await getWarehouse(warehouseId);
  try {
    const link = await createTableLink(warehouseId, tableId);
    return {
      id: link.id,
      tableId: link.inventoryTableId,
      name: link.inventoryTable.name,
      groupId: link.inventoryTable.groupId,
    };
  } catch {
    throw new AppError("This inventory table is already linked or does not exist.", 409);
  }
}

export async function removeTableLink(warehouseId: string, tableId: string) {
  await getWarehouse(warehouseId);
  await deleteTableLink(warehouseId, tableId);
}
