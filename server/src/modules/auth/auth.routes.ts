import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";
import {
  acceptInviteController,
  loginController,
  logoutController,
  meController,
} from "./auth.controller";

export const authRoutes = Router();

authRoutes.post("/login", asyncHandler(loginController));
authRoutes.post("/logout", asyncHandler(logoutController));
authRoutes.post("/accept-invite", asyncHandler(acceptInviteController));
authRoutes.get("/me", requireAuth, asyncHandler(meController));
