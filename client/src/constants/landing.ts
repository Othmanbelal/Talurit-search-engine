import {
  Boxes,
  Factory,
  LayoutDashboard,
  MapPin,
  PackageOpen,
  Settings2,
  Truck,
  Warehouse,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type LandingType = "page" | "group" | "table";

/** Fixed app routes a user may pick. Must stay in sync with the server allowlist. */
export const LANDING_PAGE_OPTIONS: { path: string; label: string; icon: LucideIcon }[] = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/inventory", label: "Inventory", icon: Boxes },
  { path: "/used-in", label: "Used In", icon: PackageOpen },
  { path: "/borrowed-items", label: "Borrowed Items", icon: Truck },
  { path: "/warehouses", label: "Warehouses", icon: Warehouse },
  { path: "/locations", label: "Locations", icon: MapPin },
  { path: "/machines", label: "Machines", icon: Factory },
  { path: "/tools", label: "Tools", icon: Wrench },
  { path: "/profile", label: "Profile", icon: Settings2 },
];

export const DEFAULT_LANDING_PATH = "/dashboard";

export function isLandingPageRoute(value: string | null | undefined): boolean {
  return LANDING_PAGE_OPTIONS.some((option) => option.path === value);
}
