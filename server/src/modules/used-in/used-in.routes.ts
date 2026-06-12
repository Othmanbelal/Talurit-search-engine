import { UserRole } from "@prisma/client";
import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/role.middleware";
import { asyncHandler } from "../../utils/async-handler";
import {
  assignRowsController,
  createUsedInCardController,
  deleteUsedInCardController,
  deleteAssignmentController,
  getUsedInCardController,
  listUsedInCardsController,
  returnStockAssignmentController,
  updateUsedInCardController,
} from "./used-in.controller";

// Admin and manager create/edit/delete cards; employee and above can assign/return
const canManageCards = requireRoles(UserRole.admin, UserRole.manager);
const canAssignReturn = requireRoles(UserRole.admin, UserRole.manager, UserRole.employee);

export const usedInRoutes = Router();

usedInRoutes.use(requireAuth);

usedInRoutes.get("/cards", asyncHandler(listUsedInCardsController));
usedInRoutes.post("/cards", canManageCards, asyncHandler(createUsedInCardController));
usedInRoutes.get("/cards/:id", asyncHandler(getUsedInCardController));
usedInRoutes.patch("/cards/:id", canManageCards, asyncHandler(updateUsedInCardController));
usedInRoutes.delete("/cards/:id", canManageCards, asyncHandler(deleteUsedInCardController));
usedInRoutes.post("/cards/:id/assignments", canAssignReturn, asyncHandler(assignRowsController));
usedInRoutes.delete("/assignments/:id", canAssignReturn, asyncHandler(deleteAssignmentController));
usedInRoutes.post("/stock-assignments/:id/return", canAssignReturn, asyncHandler(returnStockAssignmentController));
