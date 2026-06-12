import { AppError } from "../../utils/AppError";
import { cleanupResourceManagers } from "../resource-managers/resource-managers.service";
import {
  archiveWarehouseRecord,
  createWarehouseRecord,
  deleteWarehouseRecord,
  findWarehouse,
  findWarehouses,
  saveWarehouseLayoutRecord,
  updateWarehouseRecord,
} from "./warehouse.repository";
import {
  CreateWarehouseInput,
  ListWarehousesQuery,
  SaveWarehouseLayoutInput,
  UpdateWarehouseInput,
} from "./warehouse.schemas";
import { serializeWarehouse, serializeWarehouseSummary } from "./warehouse.serializer";

export async function listWarehouses(query: ListWarehousesQuery) {
  const warehouses = await findWarehouses(query);
  return warehouses.map(serializeWarehouseSummary);
}

export async function getWarehouse(id: string) {
  const warehouse = await findWarehouse(id);
  if (!warehouse) throw new AppError("Warehouse not found.", 404);
  return serializeWarehouse(warehouse);
}

export async function createWarehouse(input: CreateWarehouseInput, userId?: string) {
  const warehouse = await createWarehouseRecord(input, userId);
  return serializeWarehouse(warehouse);
}

export async function updateWarehouse(id: string, input: UpdateWarehouseInput) {
  await getWarehouse(id);
  const warehouse = await updateWarehouseRecord(id, input);
  return serializeWarehouse(warehouse);
}

export async function saveWarehouseLayout(id: string, input: SaveWarehouseLayoutInput) {
  await getWarehouse(id);
  const warehouse = await saveWarehouseLayoutRecord(id, input.layoutData);
  return serializeWarehouse(warehouse);
}

export async function archiveWarehouse(id: string) {
  await getWarehouse(id);
  const warehouse = await archiveWarehouseRecord(id);
  return serializeWarehouse(warehouse);
}

export async function deleteWarehouse(id: string) {
  await getWarehouse(id);
  await cleanupResourceManagers("warehouse", id);
  await deleteWarehouseRecord(id);
}
