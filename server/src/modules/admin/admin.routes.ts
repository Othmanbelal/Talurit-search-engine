import { UserRole } from "@prisma/client";
import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/role.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { adminDashboardController } from "./admin.controller";
import {
  adminSettingsController,
  adminUsersController,
  cancelInvitationController,
  inviteUserController,
  invitationsController,
  resendInvitationController,
  sendTestEmailController,
  updateAdminSettingsController,
  updateUserController,
} from "./admin.users.controller";

export const adminRoutes = Router();

adminRoutes.use(requireAuth);

// Dashboard is visible to admins and managers
adminRoutes.get("/dashboard", requireRoles(UserRole.admin, UserRole.manager), asyncHandler(adminDashboardController));

// All remaining admin routes require admin role
adminRoutes.use(requireRoles(UserRole.admin));
adminRoutes.get("/users", asyncHandler(adminUsersController));
adminRoutes.patch("/users/:id", asyncHandler(updateUserController));
adminRoutes.post("/invitations", asyncHandler(inviteUserController));
adminRoutes.get("/invitations", asyncHandler(invitationsController));
adminRoutes.post("/invitations/:id/resend", asyncHandler(resendInvitationController));
adminRoutes.post("/invitations/:id/cancel", asyncHandler(cancelInvitationController));
adminRoutes.get("/settings", asyncHandler(adminSettingsController));
adminRoutes.patch("/settings", asyncHandler(updateAdminSettingsController));
adminRoutes.post("/email/send-test", asyncHandler(sendTestEmailController));
