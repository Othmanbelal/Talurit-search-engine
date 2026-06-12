import {
  BarChart3,
  Boxes,
  FileSpreadsheet,
  LogOut,
  MapPinned,
  PackageMinus,
  Settings,
  ShieldCheck,
  Users,
  Warehouse,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const mobileNav = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/used-in", label: "Used In", icon: Boxes },
  { href: "/taken-items", label: "Taken Items", icon: PackageMinus },
  { href: "/warehouses", label: "Warehouses", icon: Warehouse },
  { href: "/locations", label: "Locations", icon: MapPinned },
  { href: "/import", label: "Import", icon: FileSpreadsheet, adminOnly: true },
  { href: "/admin/users", label: "Users", icon: Users, adminOnly: true },
  { href: "/admin/settings", label: "Settings", icon: Settings, adminOnly: true },
];

export function Topbar() {
  const { logout, user } = useAuth();
  const visibleMobileNav = mobileNav.filter((item) => !item.adminOnly || user?.role === "admin");

  return (
    <header className="flex min-h-16 items-center justify-between border-b border-line bg-slate-950/70 px-4 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-4">
        <div>
          <div className="text-sm font-medium text-white">{user?.name}</div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck aria-hidden="true" size={13} />
            {user?.role}
          </div>
        </div>

        <nav className="flex gap-1 lg:hidden" aria-label="Mobile navigation">
          {visibleMobileNav.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                className={({ isActive }) =>
                  [
                    "inline-flex h-10 w-10 items-center justify-center rounded-md border",
                    isActive ? "border-accent text-accent" : "border-line text-slate-300",
                  ].join(" ")
                }
                key={item.href}
                title={item.label}
                to={item.href}
              >
                <Icon aria-hidden="true" size={17} />
              </NavLink>
            );
          })}
        </nav>
      </div>

      <button
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white/5 text-slate-200 hover:border-accent"
        onClick={() => void logout()}
        title="Sign out"
        type="button"
      >
        <LogOut aria-hidden="true" size={17} />
      </button>
    </header>
  );
}
