import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { clearSessionCookieOptions } from "../modules/auth/auth.cookies";
import { getCurrentUser } from "../modules/auth/auth.service";
import { AppError } from "../utils/AppError";

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  authenticateRequest(request, response)
    .then(() => next())
    .catch((error) => {
      if (error instanceof AppError && error.statusCode === 401) {
        response.clearCookie(env.COOKIE_NAME, clearSessionCookieOptions());
      }

      next(error);
    });
}

async function authenticateRequest(request: Request, _response: Response) {
  const sessionToken = request.cookies?.[env.COOKIE_NAME];
  const user = await getCurrentUser(sessionToken);

  request.user = user;
}
