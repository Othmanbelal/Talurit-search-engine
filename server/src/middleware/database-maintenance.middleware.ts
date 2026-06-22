import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { isDatabaseMaintenanceActive } from "../modules/backups/backup.runtime";

export function rejectDuringDatabaseMaintenance(
  _request: Request,
  _response: Response,
  next: NextFunction,
) {
  if (isDatabaseMaintenanceActive()) {
    return next(new AppError("Application backup maintenance is running. Try again shortly.", 503));
  }
  return next();
}
