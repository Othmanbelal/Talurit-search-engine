import { UserRole } from "@prisma/client";
import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/role.middleware";
import { asyncHandler } from "../../utils/async-handler";
import {
  confirmDynamicImportController,
  getDynamicInventoryController,
  listDynamicInventoriesController,
  listDynamicInventoryRowsController,
  previewDynamicImportController,
} from "./inventories.controller";

const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  storage: multer.memoryStorage(),
});

const canImport = requireRoles(UserRole.admin);

export const inventoriesRoutes = Router();

inventoriesRoutes.use(requireAuth);

inventoriesRoutes.get("/", asyncHandler(listDynamicInventoriesController));
inventoriesRoutes.post(
  "/import/preview",
  canImport,
  upload.single("file"),
  asyncHandler(previewDynamicImportController),
);
inventoriesRoutes.post(
  "/import/confirm",
  canImport,
  upload.single("file"),
  asyncHandler(confirmDynamicImportController),
);
inventoriesRoutes.get("/:id", asyncHandler(getDynamicInventoryController));
inventoriesRoutes.get("/:id/rows", asyncHandler(listDynamicInventoryRowsController));
