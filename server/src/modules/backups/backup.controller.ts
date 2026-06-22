import type { Request, Response } from "express";
import { successResponse } from "../../utils/api-response";
import { restoreBackupSchema, updateBackupSettingsSchema } from "./backup.schemas";
import {
  getBackupOverview,
  restoreBackup,
  runManualBackup,
  testConfiguredBackupDirectory,
  updateBackupSettings,
} from "./backup.service";

export async function backupOverviewController(_request: Request, response: Response) {
  return response.json(successResponse({ backups: await getBackupOverview() }));
}

export async function updateBackupSettingsController(request: Request, response: Response) {
  const settings = await updateBackupSettings(updateBackupSettingsSchema.parse(request.body));
  return response.json(successResponse({ settings }));
}

export async function testBackupDirectoryController(request: Request, response: Response) {
  const input = updateBackupSettingsSchema.pick({ directory: true }).parse(request.body);
  return response.json(successResponse(await testConfiguredBackupDirectory(input.directory)));
}

export async function runBackupController(request: Request, response: Response) {
  const result = await runManualBackup(request.user!.id);
  return response.status(201).json(successResponse({ backup: result.log }));
}

export async function restoreBackupController(request: Request, response: Response) {
  const result = await restoreBackup(restoreBackupSchema.parse(request.body), request.user!.id);
  return response.json(successResponse({ restore: result }));
}
