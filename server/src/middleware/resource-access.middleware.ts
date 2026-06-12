import type { NextFunction, Request, Response } from "express";
import { type ResourceType, UserRole } from "@prisma/client";
import { prisma } from "../db/prisma";
import { AppError } from "../utils/AppError";
import { isResourceManager } from "../modules/resource-managers/resource-managers.repository";

/**
 * Passes if:
 * - user is admin (global role), OR
 * - user is explicitly assigned as ResourceManager for this resource, OR
 * - resource is an inventory_table AND user is assigned as ResourceManager for its parent group
 *
 * Use this instead of requireRoles("admin","manager") on resource-specific write routes.
 */
export function requireResourceAccess(
  resourceType: ResourceType,
  getResourceId: (req: Request) => string
) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) return next(new AppError("Authentication required.", 401));

      if (req.user.role === UserRole.admin) return next();

      const resourceId = getResourceId(req);

      const isDirectRM = await isResourceManager(req.user.id, resourceType, resourceId);
      if (isDirectRM) return next();

      // For tables: also accept if user manages the parent group
      if (resourceType === "inventory_table") {
        const table = await prisma.inventoryTable.findUnique({
          where: { id: resourceId },
          select: { groupId: true },
        });
        if (table?.groupId) {
          const isGroupRM = await isResourceManager(
            req.user.id,
            "inventory_group" as ResourceType,
            table.groupId
          );
          if (isGroupRM) return next();
        }
      }

      return next(new AppError("Insufficient permissions.", 403));
    } catch (error) {
      return next(error);
    }
  };
}
