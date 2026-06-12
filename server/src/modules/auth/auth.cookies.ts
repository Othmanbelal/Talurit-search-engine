import type { CookieOptions } from "express";
import { env } from "../../config/env";

function isHttpsFrontend() {
  return env.NODE_ENV === "production" && env.CLIENT_URL.startsWith("https://");
}

export function sessionCookieOptions(expiresAt: Date): CookieOptions {
  const crossSiteHttps = isHttpsFrontend();

  return {
    httpOnly: true,
    // Vercel and Render are different sites, so production cookies must be cross-site.
    sameSite: crossSiteHttps ? "none" : "lax",
    secure: crossSiteHttps,
    path: "/",
    expires: expiresAt,
  };
}

export function clearSessionCookieOptions(): CookieOptions {
  const crossSiteHttps = isHttpsFrontend();

  return {
    httpOnly: true,
    sameSite: crossSiteHttps ? "none" : "lax",
    secure: crossSiteHttps,
    path: "/",
  };
}
