import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";
import {
  acceptInviteController,
  forgotPasswordController,
  loginController,
  logoutController,
  meController,
  resetPasswordController,
} from "./auth.controller";
import {
  loginRateLimit,
  passwordResetRequestRateLimit,
  passwordResetSubmitRateLimit,
} from "../../middleware/auth-rate-limit.middleware";

export const authRoutes = Router();

authRoutes.post("/login", loginRateLimit, asyncHandler(loginController));
authRoutes.post("/logout", asyncHandler(logoutController));
authRoutes.post("/accept-invite", asyncHandler(acceptInviteController));
authRoutes.post("/forgot-password", passwordResetRequestRateLimit, asyncHandler(forgotPasswordController));
authRoutes.post("/reset-password", passwordResetSubmitRateLimit, asyncHandler(resetPasswordController));
authRoutes.get("/me", requireAuth, asyncHandler(meController));
