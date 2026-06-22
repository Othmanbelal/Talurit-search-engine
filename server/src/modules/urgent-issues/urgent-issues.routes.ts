import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/role.middleware";
import { asyncHandler } from "../../utils/async-handler";
import {
  acknowledgeUrgentIssueController,
  createUrgentIssueController,
  listMyIssuesController,
  listUrgentIssuesController,
  resolveUrgentIssueController,
  unresolveUrgentIssueController,
} from "./urgent-issues.controller";

export const urgentIssueRoutes = Router();
urgentIssueRoutes.use(requireAuth);

const canReport = requireRoles(UserRole.admin, UserRole.manager, UserRole.employee);
const canManage = requireRoles(UserRole.admin, UserRole.manager);

urgentIssueRoutes.post("/", canReport, asyncHandler(createUrgentIssueController));
urgentIssueRoutes.get("/my", canReport, asyncHandler(listMyIssuesController));
urgentIssueRoutes.patch("/:id/acknowledge", canReport, asyncHandler(acknowledgeUrgentIssueController));
urgentIssueRoutes.get("/", canManage, asyncHandler(listUrgentIssuesController));
urgentIssueRoutes.patch("/:id/resolve", canManage, asyncHandler(resolveUrgentIssueController));
urgentIssueRoutes.patch("/:id/unresolve", canManage, asyncHandler(unresolveUrgentIssueController));
