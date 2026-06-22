import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/role.middleware";
import { requireResourceAccess } from "../../middleware/resource-access.middleware";
import { asyncHandler } from "../../utils/async-handler";
import {
  createWarehouseController,
  deleteWarehouseController,
  getWarehouseController,
  listWarehousesController,
  saveWarehouseLayoutController,
  updateWarehouseController,
} from "./warehouse.controller";
import {
  createWarehouseShelfController,
  createWarehouseSlotController,
  deleteWarehouseShelfController,
  deleteWarehouseSlotController,
  generateWarehouseShelvesController,
  listWarehouseShelvesController,
  setShelfFackController,
  updateWarehouseShelfController,
  updateWarehouseSlotController,
} from "./warehouse-slots.controller";
import {
  generateRackSlotsFromSceneObjectController,
  generateShelvesFromSceneObjectController,
  listWarehouseSceneObjectsController,
  saveRackSlotLayoutFromSceneObjectController,
} from "./warehouse-scene.controller";
import {
  addGroupLinkController,
  addTableLinkController,
  getAvailableInventoryController,
  getInventoryLinksController,
  removeGroupLinkController,
  removeTableLinkController,
} from "./warehouse-links.controller";
import { getLocationCodesController, getShelfViewController } from "./warehouse-shelf-view.controller";
import {
  assignSlotController,
  getAssignmentByStockController,
  listSlotAssignmentsController,
  listWarehouseAssignmentsController,
  scanInventoryRowsController,
  searchInventoryRowsController,
  unassignSlotController,
} from "./warehouse-assignments.controller";

export const warehouseRoutes = Router();
// Only admin and manager can edit or delete warehouse layouts
const canEditWarehouse = requireRoles(UserRole.admin, UserRole.manager);
const canDeleteWarehouse = requireRoles(UserRole.admin, UserRole.manager);

warehouseRoutes.use(requireAuth);

// Static routes must be registered before /:id wildcards
warehouseRoutes.get("/assignment/by-stock/:stockBalanceId", asyncHandler(getAssignmentByStockController));

// Layout CRUD
warehouseRoutes.get("/", asyncHandler(listWarehousesController));
warehouseRoutes.post("/", canEditWarehouse, asyncHandler(createWarehouseController));
warehouseRoutes.get("/:id", asyncHandler(getWarehouseController));
warehouseRoutes.patch("/:id", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(updateWarehouseController));
warehouseRoutes.put("/:id/layout", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(saveWarehouseLayoutController));
warehouseRoutes.delete("/:id", canDeleteWarehouse, asyncHandler(deleteWarehouseController));

// Scene objects
warehouseRoutes.get("/:id/scene-objects", asyncHandler(listWarehouseSceneObjectsController));
warehouseRoutes.post("/:id/scene-objects/generate-shelves", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(generateShelvesFromSceneObjectController));
warehouseRoutes.post("/:id/scene-objects/generate-rack-slots", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(generateRackSlotsFromSceneObjectController));
warehouseRoutes.post("/:id/scene-objects/rack-slot-layout", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(saveRackSlotLayoutFromSceneObjectController));

// Shelf and slot management
warehouseRoutes.get("/:id/shelves", asyncHandler(listWarehouseShelvesController));
warehouseRoutes.post("/:id/shelves", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(createWarehouseShelfController));
warehouseRoutes.post("/:id/shelves/generate", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(generateWarehouseShelvesController));
warehouseRoutes.patch("/:id/shelves/:shelfId", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(updateWarehouseShelfController));
warehouseRoutes.delete("/:id/shelves/:shelfId", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(deleteWarehouseShelfController));
warehouseRoutes.post("/:id/shelves/:shelfId/slots", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(createWarehouseSlotController));
warehouseRoutes.patch("/:id/slots/:slotId", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(updateWarehouseSlotController));
warehouseRoutes.patch("/:id/shelves/:shelfId/fack", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(setShelfFackController));
warehouseRoutes.delete("/:id/slots/:slotId", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(deleteWarehouseSlotController));

// Slot assignments
warehouseRoutes.get("/:id/assignments", asyncHandler(listWarehouseAssignmentsController));
warehouseRoutes.get("/:id/inventory-rows", asyncHandler(searchInventoryRowsController));
warehouseRoutes.post("/:id/inventory-rows/scan", asyncHandler(scanInventoryRowsController));
warehouseRoutes.get("/:id/slots/:slotId/assignments", asyncHandler(listSlotAssignmentsController));
warehouseRoutes.post("/:id/slots/:slotId/assign", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(assignSlotController));
warehouseRoutes.delete("/:id/assignments/:assignmentId", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(unassignSlotController));

// Shelf view (automatic location-code matching)
warehouseRoutes.get("/:id/shelf-view", asyncHandler(getShelfViewController));
warehouseRoutes.get("/:id/location-codes", asyncHandler(getLocationCodesController));

// Inventory links
warehouseRoutes.get("/:id/links", asyncHandler(getInventoryLinksController));
warehouseRoutes.get("/:id/links/available", asyncHandler(getAvailableInventoryController));
warehouseRoutes.post("/:id/links/groups", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(addGroupLinkController));
warehouseRoutes.delete("/:id/links/groups/:groupId", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(removeGroupLinkController));
warehouseRoutes.post("/:id/links/tables", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(addTableLinkController));
warehouseRoutes.delete("/:id/links/tables/:tableId", requireResourceAccess("warehouse", (req) => req.params.id), asyncHandler(removeTableLinkController));
