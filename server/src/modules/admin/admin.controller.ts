import type { Request, Response } from "express";
import { successResponse } from "../../utils/api-response";
import { getAdminDashboard } from "./admin.service";

export async function adminDashboardController(_request: Request, response: Response) {
  const dashboard = await getAdminDashboard();

  return response.json(successResponse({ dashboard }));
}
