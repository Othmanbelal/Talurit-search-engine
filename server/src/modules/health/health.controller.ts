import type { Request, Response } from "express";
import { successResponse } from "../../utils/api-response";
import { getHealthStatus } from "./health.service";

export async function healthController(_request: Request, response: Response) {
  const health = await getHealthStatus();
  const statusCode = health.status === "ok" ? 200 : 503;

  return response.status(statusCode).json(successResponse(health));
}
