import { UserRole } from "@prisma/client";
import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/role.middleware";
import { asyncHandler } from "../../utils/async-handler";
import {
  confirmStructuredImportController,
  getStructuredImportBatchController,
  getStructuredImportPreviewController,
  listStructuredImportStagingRowsController,
  scanStructuredImportController,
  stageStructuredImportController,
  updateStructuredImportMappingsController,
  updateStructuredImportStagingRowController,
  updateStructuredImportSheetsController,
} from "./structured-import.controller";

const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  storage: multer.memoryStorage(),
});

const canImport = requireRoles(UserRole.admin);

export const structuredImportRoutes = Router();

structuredImportRoutes.use(requireAuth);

structuredImportRoutes.post("/scan", canImport, upload.single("file"), asyncHandler(scanStructuredImportController));
structuredImportRoutes.post("/upload", canImport, upload.single("file"), asyncHandler(scanStructuredImportController));
structuredImportRoutes.get("/:batchId", canImport, asyncHandler(getStructuredImportBatchController));
structuredImportRoutes.get("/:batchId/sheets", canImport, asyncHandler(getStructuredImportBatchController));
structuredImportRoutes.patch("/:batchId/sheets", canImport, asyncHandler(updateStructuredImportSheetsController));
structuredImportRoutes.post("/:batchId/mappings/preview", canImport, asyncHandler(stageStructuredImportController));
structuredImportRoutes.post("/:batchId/stage", canImport, asyncHandler(stageStructuredImportController));
structuredImportRoutes.post("/:batchId/confirm", canImport, asyncHandler(confirmStructuredImportController));
structuredImportRoutes.get("/:batchId/preview", canImport, asyncHandler(getStructuredImportPreviewController));
structuredImportRoutes.get("/:batchId/staging-rows", canImport, asyncHandler(listStructuredImportStagingRowsController));
structuredImportRoutes.patch("/staging-rows/:rowId", canImport, asyncHandler(updateStructuredImportStagingRowController));
structuredImportRoutes.patch(
  "/:batchId/sheets/:sheetId/mappings",
  canImport,
  asyncHandler(updateStructuredImportMappingsController),
);
