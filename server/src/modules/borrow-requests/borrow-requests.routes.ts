import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/role.middleware";
import { asyncHandler } from "../../utils/async-handler";
import {
  acceptBorrowRequestController,
  cancelBorrowRequestController,
  createBorrowRequestController,
  declineBorrowRequestController,
} from "./borrow-requests.controller";

export const borrowRequestRoutes = Router();
borrowRequestRoutes.use(requireAuth);

const canRequestOrResolve = requireRoles(UserRole.admin, UserRole.manager, UserRole.employee);

borrowRequestRoutes.post("/", canRequestOrResolve, asyncHandler(createBorrowRequestController));
borrowRequestRoutes.post("/:id/accept", canRequestOrResolve, asyncHandler(acceptBorrowRequestController));
borrowRequestRoutes.post("/:id/decline", canRequestOrResolve, asyncHandler(declineBorrowRequestController));
borrowRequestRoutes.post("/:id/cancel", canRequestOrResolve, asyncHandler(cancelBorrowRequestController));
