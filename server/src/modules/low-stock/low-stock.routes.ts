import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/role.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { setRowLowStockController, setTableLowStockController } from "./low-stock.controller";

export const lowStockRoutes = Router();
lowStockRoutes.use(requireAuth);

// Coarse role gate; the service enforces table-specific manager/admin authorization.
const canConfigure = requireRoles(UserRole.admin, UserRole.manager);

lowStockRoutes.patch("/tables/:tableId", canConfigure, asyncHandler(setTableLowStockController));
lowStockRoutes.patch("/tables/:tableId/rows/:rowId", canConfigure, asyncHandler(setRowLowStockController));
