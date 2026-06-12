import { UserRole } from "@prisma/client";
import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/role.middleware";
import { asyncHandler } from "../../utils/async-handler";
import {
  createLocationController,
  createMachineController,
  createManufacturerController,
  createToolTypeController,
  deleteMachineController,
  listLocationsController,
  listMachinesController,
  listMachineToolsController,
  listManufacturersController,
  listToolTypesController,
  linkToolToMachineController,
} from "./metadata.controller";

const canManageInventoryMetadata = requireRoles(UserRole.admin, UserRole.manager);
const canDeleteMachine = requireRoles(UserRole.admin);

export const toolTypeRoutes = Router();
export const manufacturerRoutes = Router();
export const locationRoutes = Router();
export const machineRoutes = Router();

toolTypeRoutes.use(requireAuth);
manufacturerRoutes.use(requireAuth);
locationRoutes.use(requireAuth);
machineRoutes.use(requireAuth);

toolTypeRoutes.get("/", asyncHandler(listToolTypesController));
toolTypeRoutes.post("/", canManageInventoryMetadata, asyncHandler(createToolTypeController));

manufacturerRoutes.get("/", asyncHandler(listManufacturersController));
manufacturerRoutes.post("/", canManageInventoryMetadata, asyncHandler(createManufacturerController));

locationRoutes.get("/", asyncHandler(listLocationsController));
locationRoutes.post("/", canManageInventoryMetadata, asyncHandler(createLocationController));

machineRoutes.get("/", asyncHandler(listMachinesController));
machineRoutes.post("/", canManageInventoryMetadata, asyncHandler(createMachineController));
machineRoutes.get("/:id/tools", asyncHandler(listMachineToolsController));
machineRoutes.post(
  "/:id/tools/link",
  canManageInventoryMetadata,
  asyncHandler(linkToolToMachineController),
);
machineRoutes.delete("/:id", canDeleteMachine, asyncHandler(deleteMachineController));
