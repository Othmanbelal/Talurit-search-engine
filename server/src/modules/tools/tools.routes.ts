import { UserRole } from "@prisma/client";
import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/role.middleware";
import { asyncHandler } from "../../utils/async-handler";
import {
  archiveToolController,
  createToolController,
  deleteToolController,
  getToolController,
  listToolsController,
  restoreToolController,
  updateToolController,
  updateToolPlacementController,
} from "./tools.controller";

export const toolsRoutes = Router();

toolsRoutes.use(requireAuth);

toolsRoutes.get("/", asyncHandler(listToolsController));
toolsRoutes.get("/:id", asyncHandler(getToolController));

toolsRoutes.post(
  "/",
  requireRoles(UserRole.admin, UserRole.manager),
  asyncHandler(createToolController),
);

toolsRoutes.patch(
  "/:id",
  requireRoles(UserRole.admin, UserRole.manager),
  asyncHandler(updateToolController),
);

toolsRoutes.patch(
  "/:id/placement",
  requireRoles(UserRole.admin, UserRole.manager),
  asyncHandler(updateToolPlacementController),
);

toolsRoutes.post(
  "/:id/archive",
  requireRoles(UserRole.admin, UserRole.manager),
  asyncHandler(archiveToolController),
);

toolsRoutes.post(
  "/:id/restore",
  requireRoles(UserRole.admin, UserRole.manager),
  asyncHandler(restoreToolController),
);

toolsRoutes.delete(
  "/:id",
  requireRoles(UserRole.admin),
  asyncHandler(deleteToolController),
);
