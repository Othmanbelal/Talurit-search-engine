import type { Request, Response } from "express";
import { env } from "../../config/env";
import { successResponse } from "../../utils/api-response";
import { acceptInviteSchema, loginSchema } from "./auth.schemas";
import { clearSessionCookieOptions, sessionCookieOptions } from "./auth.cookies";
import { acceptInvitation, getCurrentUser, login, logout } from "./auth.service";

export async function loginController(request: Request, response: Response) {
  const input = loginSchema.parse(request.body);
  const result = await login(input);

  response.cookie(
    env.COOKIE_NAME,
    result.sessionToken,
    sessionCookieOptions(result.expiresAt),
  );

  return response.json(
    successResponse({
      user: result.user,
      expiresAt: result.expiresAt.toISOString(),
    }),
  );
}

export async function logoutController(request: Request, response: Response) {
  await logout(request.cookies?.[env.COOKIE_NAME]);
  response.clearCookie(env.COOKIE_NAME, clearSessionCookieOptions());

  return response.json(successResponse({ loggedOut: true }));
}

export async function meController(request: Request, response: Response) {
  const user = await getCurrentUser(request.cookies?.[env.COOKIE_NAME]);

  return response.json(successResponse({ user }));
}

export async function acceptInviteController(request: Request, response: Response) {
  const input = acceptInviteSchema.parse(request.body);
  const result = await acceptInvitation(input);

  response.cookie(
    env.COOKIE_NAME,
    result.sessionToken,
    sessionCookieOptions(result.expiresAt),
  );

  return response.json(
    successResponse({
      user: result.user,
      expiresAt: result.expiresAt.toISOString(),
    }),
  );
}
