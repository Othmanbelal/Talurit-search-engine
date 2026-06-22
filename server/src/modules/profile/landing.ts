import { prisma } from "../../db/prisma";

/**
 * Allowlist of fixed app routes a user may pick as a landing page.
 * Mirrored on the client (client/src/constants/landing.ts). Any value outside
 * this list is rejected so a stored landing path can never be an open redirect.
 */
export const LANDING_PAGE_ROUTES = [
  "/dashboard",
  "/inventory",
  "/used-in",
  "/taken-items",
  "/warehouses",
  "/locations",
  "/machines",
  "/tools",
  "/profile",
] as const;

export type LandingPageRoute = (typeof LANDING_PAGE_ROUTES)[number];
export type LandingType = "page" | "group" | "table";

export const DEFAULT_LANDING_PATH = "/dashboard";

export function isLandingPageRoute(value: string | null | undefined): value is LandingPageRoute {
  return typeof value === "string" && (LANDING_PAGE_ROUTES as readonly string[]).includes(value);
}

export type LandingPreference = {
  landingType: string | null;
  landingPath: string | null;
  landingTargetId: string | null;
};

/**
 * Resolve a stored landing preference to a concrete route. Group/table targets
 * are verified to still exist; a missing target resolves to the dashboard and is
 * reported as stale so callers can clear it.
 */
export async function resolveLandingPath(
  pref: LandingPreference,
): Promise<{ path: string; stale: boolean }> {
  if (!pref.landingType) return { path: DEFAULT_LANDING_PATH, stale: false };

  if (pref.landingType === "page") {
    return { path: isLandingPageRoute(pref.landingPath) ? pref.landingPath : DEFAULT_LANDING_PATH, stale: false };
  }

  if (pref.landingType === "group" && pref.landingTargetId) {
    const exists = await prisma.inventoryGroup.findUnique({
      where: { id: pref.landingTargetId },
      select: { id: true },
    });
    return exists
      ? { path: `/inventory/groups/${pref.landingTargetId}`, stale: false }
      : { path: DEFAULT_LANDING_PATH, stale: true };
  }

  if (pref.landingType === "table" && pref.landingTargetId) {
    const exists = await prisma.inventoryTable.findUnique({
      where: { id: pref.landingTargetId },
      select: { id: true },
    });
    return exists
      ? { path: `/inventory/tables/${pref.landingTargetId}`, stale: false }
      : { path: DEFAULT_LANDING_PATH, stale: true };
  }

  return { path: DEFAULT_LANDING_PATH, stale: true };
}

/** Validate that a group/table landing target exists before it is saved. */
export async function landingTargetExists(type: LandingType, targetId: string): Promise<boolean> {
  if (type === "group") {
    return Boolean(await prisma.inventoryGroup.findUnique({ where: { id: targetId }, select: { id: true } }));
  }
  if (type === "table") {
    return Boolean(await prisma.inventoryTable.findUnique({ where: { id: targetId }, select: { id: true } }));
  }
  return true;
}
