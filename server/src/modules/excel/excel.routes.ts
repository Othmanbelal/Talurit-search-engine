import { UserRole } from "@prisma/client";
import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/role.middleware";
import { asyncHandler } from "../../utils/async-handler";
import {
  confirmExcelImportController,
  exportInventoryController,
  previewExcelImportController,
} from "./excel.controller";

const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
  storage: multer.memoryStorage(),
});

export const excelRoutes = Router();

excelRoutes.use(requireAuth);

excelRoutes.post(
  "/import/preview",
  requireRoles(UserRole.admin),
  upload.single("file"),
  asyncHandler(previewExcelImportController),
);

excelRoutes.post(
  "/import/confirm",
  requireRoles(UserRole.admin),
  upload.single("file"),
  asyncHandler(confirmExcelImportController),
);

excelRoutes.get(
  "/export",
  requireRoles(UserRole.admin, UserRole.manager),
  asyncHandler(exportInventoryController),
);
