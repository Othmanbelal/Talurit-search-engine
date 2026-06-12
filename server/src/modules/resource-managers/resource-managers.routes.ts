import { UserRole } from "@prisma/client";
import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/role.middleware";
import { asyncHandler } from "../../utils/async-handler";
import {
  assignResourceManagerController,
  listMyManagedResourcesController,
  listResourceManagersController,
  unassignResourceManagerController,
} from "./resource-managers.controller";

export const resourceManagerRoutes = Router();

resourceManagerRoutes.use(requireAuth);

// Any authenticated user can see their own managed resources
resourceManagerRoutes.get("/my", asyncHandler(listMyManagedResourcesController));

// Listing managers for a resource: any authenticated user (read-only, non-sensitive)
resourceManagerRoutes.get("/", asyncHandler(listResourceManagersController));

// Assign: service enforces admin-or-manager-who-manages-that-resource
resourceManagerRoutes.post(
  "/",
  requireRoles(UserRole.admin, UserRole.manager),
  asyncHandler(assignResourceManagerController)
);

// Unassign: service enforces admin-or-manager-who-manages-that-resource
resourceManagerRoutes.delete(
  "/:id",
  requireRoles(UserRole.admin, UserRole.manager),
  asyncHandler(unassignResourceManagerController)
);
