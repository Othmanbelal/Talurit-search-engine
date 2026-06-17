import type {
  AssignableInventoryRow,
  AssignSlotInput,
  AvailableInventory,
  CreateWarehouseInput,
  CreateWarehouseShelfInput,
  CreateWarehouseSlotInput,
  GenerateRackSlotsFromSceneObjectInput,
  GenerateShelvesFromSceneObjectInput,
  GenerateWarehouseShelvesInput,
  SaveWarehouseLayoutInput,
  SaveRackSlotLayoutFromSceneObjectInput,
  ShelfView,
  UpdateWarehouseInput,
  UpdateWarehouseShelfInput,
  UpdateWarehouseSlotInput,
  WarehouseArchiveMode,
  WarehouseInventoryLinks,
  WarehouseLayout,
  WarehouseSceneObject,
  WarehouseShelf,
  WarehouseSlotAssignment,
  WarehouseStockPlacement,
  WarehouseSummary,
} from "../types/warehouse";
import { apiRequest } from "./http";

export function listWarehousesRequest(archived: WarehouseArchiveMode) {
  return apiRequest<{ warehouses: WarehouseSummary[] }>(`/api/warehouses?archived=${archived}`);
}

export function createWarehouseRequest(input: CreateWarehouseInput) {
  return apiRequest<{ warehouse: WarehouseLayout }>("/api/warehouses", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getWarehouseRequest(id: string) {
  return apiRequest<{ warehouse: WarehouseLayout }>(`/api/warehouses/${id}`);
}

export function updateWarehouseRequest(id: string, input: UpdateWarehouseInput) {
  return apiRequest<{ warehouse: WarehouseLayout }>(`/api/warehouses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function saveWarehouseLayoutRequest(id: string, input: SaveWarehouseLayoutInput) {
  return apiRequest<{ warehouse: WarehouseLayout }>(`/api/warehouses/${id}/layout`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function archiveWarehouseRequest(id: string) {
  return apiRequest<{ warehouse: WarehouseLayout }>(`/api/warehouses/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ isArchived: true }),
  });
}

export function deleteWarehouseRequest(id: string) {
  return apiRequest<void>(`/api/warehouses/${id}`, { method: "DELETE" });
}

export function listWarehouseShelvesRequest(id: string) {
  return apiRequest<{ shelves: WarehouseShelf[] }>(`/api/warehouses/${id}/shelves`);
}

export function listWarehouseSceneObjectsRequest(id: string) {
  return apiRequest<{ sceneObjects: WarehouseSceneObject[] }>(`/api/warehouses/${id}/scene-objects`);
}

export function generateWarehouseShelvesRequest(id: string, input: GenerateWarehouseShelvesInput) {
  return apiRequest<{ shelves: WarehouseShelf[] }>(`/api/warehouses/${id}/shelves/generate`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function generateShelvesFromSceneObjectRequest(id: string, input: GenerateShelvesFromSceneObjectInput) {
  return apiRequest<{ shelves: WarehouseShelf[] }>(`/api/warehouses/${id}/scene-objects/generate-shelves`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function generateRackSlotsFromSceneObjectRequest(id: string, input: GenerateRackSlotsFromSceneObjectInput) {
  return apiRequest<{ shelves: WarehouseShelf[] }>(`/api/warehouses/${id}/scene-objects/generate-rack-slots`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function saveRackSlotLayoutFromSceneObjectRequest(id: string, input: SaveRackSlotLayoutFromSceneObjectInput) {
  return apiRequest<{ shelves: WarehouseShelf[] }>(`/api/warehouses/${id}/scene-objects/rack-slot-layout`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createWarehouseShelfRequest(id: string, input: CreateWarehouseShelfInput) {
  return apiRequest<{ shelf: WarehouseShelf }>(`/api/warehouses/${id}/shelves`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateWarehouseShelfRequest(id: string, shelfId: string, input: UpdateWarehouseShelfInput) {
  return apiRequest<{ shelf: WarehouseShelf }>(`/api/warehouses/${id}/shelves/${shelfId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteWarehouseShelfRequest(id: string, shelfId: string) {
  return apiRequest<{ deleted: true }>(`/api/warehouses/${id}/shelves/${shelfId}`, { method: "DELETE" });
}

export function createWarehouseSlotRequest(id: string, shelfId: string, input: CreateWarehouseSlotInput) {
  return apiRequest<{ shelves: WarehouseShelf[] }>(`/api/warehouses/${id}/shelves/${shelfId}/slots`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateWarehouseSlotRequest(id: string, slotId: string, input: UpdateWarehouseSlotInput) {
  return apiRequest<{ shelf: WarehouseShelf }>(`/api/warehouses/${id}/slots/${slotId}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteWarehouseSlotRequest(id: string, slotId: string) {
  return apiRequest<{ deleted: true }>(`/api/warehouses/${id}/slots/${slotId}`, { method: "DELETE" });
}

// Inventory links
export function getWarehouseLinksRequest(id: string) {
  return apiRequest<WarehouseInventoryLinks>(`/api/warehouses/${id}/links`);
}

export function getAvailableInventoryRequest(id: string) {
  return apiRequest<AvailableInventory>(`/api/warehouses/${id}/links/available`);
}

export function addGroupLinkRequest(id: string, groupId: string) {
  return apiRequest<{ link: { id: string; groupId: string; name: string; tableCount: number } }>(`/api/warehouses/${id}/links/groups`, {
    method: "POST",
    body: JSON.stringify({ groupId }),
  });
}

export function removeGroupLinkRequest(id: string, groupId: string) {
  return apiRequest<{ removed: true }>(`/api/warehouses/${id}/links/groups/${groupId}`, { method: "DELETE" });
}

export function addTableLinkRequest(id: string, tableId: string) {
  return apiRequest<{ link: { id: string; tableId: string; name: string; groupId?: string | null } }>(`/api/warehouses/${id}/links/tables`, {
    method: "POST",
    body: JSON.stringify({ tableId }),
  });
}

export function removeTableLinkRequest(id: string, tableId: string) {
  return apiRequest<{ removed: true }>(`/api/warehouses/${id}/links/tables/${tableId}`, { method: "DELETE" });
}

// Slot assignments
export function listWarehouseAssignmentsRequest(id: string) {
  return apiRequest<{ assignments: WarehouseSlotAssignment[] }>(`/api/warehouses/${id}/assignments`);
}

export function listSlotAssignmentsRequest(id: string, slotId: string) {
  return apiRequest<{ assignments: WarehouseSlotAssignment[] }>(`/api/warehouses/${id}/slots/${slotId}/assignments`);
}

export function searchInventoryRowsRequest(id: string, params: { search?: string; tableId?: string; limit?: number }) {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.tableId) query.set("tableId", params.tableId);
  if (params.limit) query.set("limit", String(params.limit));
  return apiRequest<{ rows: AssignableInventoryRow[] }>(`/api/warehouses/${id}/inventory-rows?${query.toString()}`);
}

export function scanWarehouseInventoryRowsRequest(id: string, code: string) {
  return apiRequest<{ matched: boolean; rows: AssignableInventoryRow[] }>(`/api/warehouses/${id}/inventory-rows/scan`, {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export function assignSlotRequest(id: string, slotId: string, input: AssignSlotInput) {
  return apiRequest<{ assignment: WarehouseSlotAssignment }>(`/api/warehouses/${id}/slots/${slotId}/assign`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function unassignSlotRequest(id: string, assignmentId: string) {
  return apiRequest<{ unassigned: true }>(`/api/warehouses/${id}/assignments/${assignmentId}`, { method: "DELETE" });
}

export function getAssignmentByStockRequest(stockBalanceId: string) {
  return apiRequest<{ assignment: WarehouseStockPlacement | null }>(`/api/warehouses/assignment/by-stock/${stockBalanceId}`);
}

export function getShelfViewRequest(id: string) {
  return apiRequest<ShelfView>(`/api/warehouses/${id}/shelf-view`);
}

export function getLocationCodesRequest(id: string) {
  return apiRequest<{ codes: string[] }>(`/api/warehouses/${id}/location-codes`);
}
