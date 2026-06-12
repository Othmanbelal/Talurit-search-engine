import type { UserRole } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";

export function requireRoles(...allowedRoles: UserRole[]) {
  return (request: Request, _response: Response, next: NextFunction) => {
    if (!request.user) {
      return next(new AppError("Authentication required", 401));
    }

    if (!allowedRoles.includes(request.user.role)) {
      return next(new AppError("Insufficient permissions", 403));
    }

    return next();
  };
}
