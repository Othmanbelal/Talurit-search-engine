import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { API_PREFIX } from "./config/constants";
import { env } from "./config/env";
import { errorMiddleware, notFoundMiddleware } from "./middleware/error.middleware";
import { requestLogger } from "./middleware/request-logger.middleware";
import { adminRoutes } from "./modules/admin/admin.routes";
import { authRoutes } from "./modules/auth/auth.routes";
import { excelRoutes } from "./modules/excel/excel.routes";
import { healthRoutes } from "./modules/health/health.routes";
import { inventoriesRoutes } from "./modules/inventories/inventories.routes";
import {
  locationRoutes,
  machineRoutes,
  manufacturerRoutes,
  toolTypeRoutes,
} from "./modules/metadata/metadata.routes";
import { toolsRoutes } from "./modules/tools/tools.routes";
import { structuredImportRoutes } from "./modules/structured-imports/structured-import.routes";
import { structuredInventoryRoutes } from "./modules/structured-inventory/structured-inventory.routes";
import { uploadRoutes } from "./modules/uploads/upload.routes";
import { uploadRoot } from "./modules/uploads/upload-paths";
import { profileRoutes } from "./modules/profile/profile.routes";
import { usedInRoutes } from "./modules/used-in/used-in.routes";
import { warehouseRoutes } from "./modules/warehouses/warehouse.routes";
import { resourceManagerRoutes } from "./modules/resource-managers/resource-managers.routes";
import { itemNotesRoutes } from "./modules/item-notes/item-notes.routes";
import { urgentIssueRoutes } from "./modules/urgent-issues/urgent-issues.routes";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: "10mb" }));
  app.use(requestLogger);
  app.use("/uploads", express.static(uploadRoot()));

  app.use(`${API_PREFIX}/auth`, authRoutes);
  app.use(`${API_PREFIX}/admin`, adminRoutes);
  app.use(`${API_PREFIX}/excel`, excelRoutes);
  app.use(`${API_PREFIX}/health`, healthRoutes);
  app.use(`${API_PREFIX}/imports`, structuredImportRoutes);
  app.use(`${API_PREFIX}/inventories`, inventoriesRoutes);
  app.use(`${API_PREFIX}/structured-imports`, structuredImportRoutes);
  app.use(`${API_PREFIX}/structured-inventory`, structuredInventoryRoutes);
  app.use(`${API_PREFIX}/resource-managers`, resourceManagerRoutes);
  app.use(`${API_PREFIX}/tools`, toolsRoutes);
  app.use(`${API_PREFIX}/uploads`, uploadRoutes);
  app.use(`${API_PREFIX}/tool-types`, toolTypeRoutes);
  app.use(`${API_PREFIX}/manufacturers`, manufacturerRoutes);
  app.use(`${API_PREFIX}/locations`, locationRoutes);
  app.use(`${API_PREFIX}/machines`, machineRoutes);
  app.use(`${API_PREFIX}/profile`, profileRoutes);
  app.use(`${API_PREFIX}/used-in`, usedInRoutes);
  app.use(`${API_PREFIX}/warehouses`, warehouseRoutes);
  app.use(`${API_PREFIX}/item-notes`, itemNotesRoutes);
  app.use(`${API_PREFIX}/urgent-issues`, urgentIssueRoutes);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}
