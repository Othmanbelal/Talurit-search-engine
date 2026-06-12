import { Router } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { healthController } from "./health.controller";

export const healthRoutes = Router();

healthRoutes.get("/", asyncHandler(healthController));
