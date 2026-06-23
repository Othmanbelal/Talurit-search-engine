import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/role.middleware";
import { requireResourceAccess } from "../../middleware/resource-access.middleware";
import { asyncHandler } from "../../utils/async-handler";
import {
  addStructuredStockRowController,
  archiveStructuredStockRowController,
  createStructuredInventoryGroupController,
  createStructuredInventoryTableController,
  deleteStructuredInventoryGroupController,
  deleteStructuredInventoryTableController,
  deleteStructuredStockRowController,
  getStructuredInventoryGroupController,
  getStructuredStockRowController,
  getStructuredStockRowHistoryController,
  getStructuredInventoryTableController,
  listTakenItemsController,
  listStructuredDuplicatesController,
  listStructuredInventoriesController,
  listStructuredInventoryRowsController,
  listTableLowStockRowsController,
  mergeStructuredDuplicatesController,
  returnTakenItemController,
  restoreStructuredStockRowController,
  takeStockItemController,
  updateStructuredInventoryTableColumnsController,
  updateStructuredStockRowController,
  useStockItemInCardController,
} from "./structured-inventory.controller";

export const structuredInventoryRoutes = Router();
// Admin and manager can create/edit/delete tables, groups, and items
const canManageData = requireRoles(UserRole.admin, UserRole.manager);
// Employee can take and return items only
const canTakeReturn = requireRoles(UserRole.admin, UserRole.manager, UserRole.employee);

structuredInventoryRoutes.use(requireAuth);

structuredInventoryRoutes.get("/", asyncHandler(listStructuredInventoriesController));
structuredInventoryRoutes.get("/taken-items", asyncHandler(listTakenItemsController));
structuredInventoryRoutes.post("/taken-items/:id/return", canTakeReturn, asyncHandler(returnTakenItemController));
structuredInventoryRoutes.post("/groups", canManageData, asyncHandler(createStructuredInventoryGroupController));
structuredInventoryRoutes.post("/tables", canManageData, asyncHandler(createStructuredInventoryTableController));
structuredInventoryRoutes.get("/groups/:id", asyncHandler(getStructuredInventoryGroupController));
structuredInventoryRoutes.get("/tables/:id", asyncHandler(getStructuredInventoryTableController));
structuredInventoryRoutes.delete("/groups/:id", canManageData, asyncHandler(deleteStructuredInventoryGroupController));
structuredInventoryRoutes.delete("/tables/:id", canManageData, asyncHandler(deleteStructuredInventoryTableController));
structuredInventoryRoutes.patch("/tables/:id/columns", requireResourceAccess("inventory_table", (req) => req.params.id), asyncHandler(updateStructuredInventoryTableColumnsController));
structuredInventoryRoutes.get("/tables/:id/duplicates", asyncHandler(listStructuredDuplicatesController));
structuredInventoryRoutes.post("/tables/:id/duplicates/merge", requireResourceAccess("inventory_table", (req) => req.params.id), asyncHandler(mergeStructuredDuplicatesController));
structuredInventoryRoutes.get("/tables/:id/rows", asyncHandler(listStructuredInventoryRowsController));
structuredInventoryRoutes.get("/tables/:id/low-stock", asyncHandler(listTableLowStockRowsController));
structuredInventoryRoutes.post("/tables/:id/rows", requireResourceAccess("inventory_table", (req) => req.params.id), asyncHandler(addStructuredStockRowController));
structuredInventoryRoutes.get("/tables/:id/rows/:rowId", asyncHandler(getStructuredStockRowController));
structuredInventoryRoutes.get("/stock-rows/:id/history", asyncHandler(getStructuredStockRowHistoryController));
structuredInventoryRoutes.patch("/tables/:id/rows/:rowId", requireResourceAccess("inventory_table", (req) => req.params.id), asyncHandler(updateStructuredStockRowController));
structuredInventoryRoutes.delete("/tables/:id/rows/:rowId", requireResourceAccess("inventory_table", (req) => req.params.id), asyncHandler(deleteStructuredStockRowController));
structuredInventoryRoutes.post("/tables/:id/rows/:rowId/archive", requireResourceAccess("inventory_table", (req) => req.params.id), asyncHandler(archiveStructuredStockRowController));
structuredInventoryRoutes.post("/tables/:id/rows/:rowId/restore", requireResourceAccess("inventory_table", (req) => req.params.id), asyncHandler(restoreStructuredStockRowController));
structuredInventoryRoutes.post("/tables/:id/rows/:rowId/take", canTakeReturn, asyncHandler(takeStockItemController));
structuredInventoryRoutes.post("/tables/:id/rows/:rowId/use-in", canTakeReturn, asyncHandler(useStockItemInCardController));
