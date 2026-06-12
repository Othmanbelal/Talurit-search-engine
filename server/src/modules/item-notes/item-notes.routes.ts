import { Router } from "express";
import { UserRole } from "@prisma/client";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireRoles } from "../../middleware/role.middleware";
import { asyncHandler } from "../../utils/async-handler";
import {
  createNoteController,
  deleteNoteController,
  listNotesController,
  recentNotesController,
} from "./item-notes.controller";

export const itemNotesRoutes = Router();
itemNotesRoutes.use(requireAuth);

const canWrite = requireRoles(UserRole.admin, UserRole.manager, UserRole.employee);

itemNotesRoutes.get("/", asyncHandler(listNotesController));
itemNotesRoutes.get("/recent", asyncHandler(recentNotesController));
itemNotesRoutes.post("/", canWrite, asyncHandler(createNoteController));
itemNotesRoutes.delete("/:noteId", canWrite, asyncHandler(deleteNoteController));
