import {
  BarChart3,
  Boxes,
  FileSpreadsheet,
  MapPinned,
  PackageMinus,
  Settings,
  UserCircle,
  Users,
  Warehouse,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

const primaryItems = [
  { label: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { label: "Inventory", href: "/inventory", icon: Boxes },
  { label: "Used In", href: "/used-in", icon: Boxes },
  { label: "Taken Items", href: "/taken-items", icon: PackageMinus },
  { label: "Warehouses", href: "/warehouses", icon: Warehouse },
  { label: "Locations", href: "/locations", icon: MapPinned },
  { label: "Import", href: "/import", icon: FileSpreadsheet, adminOnly: true },
  { label: "Users", href: "/admin/users", icon: Users, adminOnly: true },
  { label: "Settings", href: "/admin/settings", icon: Settings, adminOnly: true },
];

export function Sidebar() {
  const { user } = useAuth();
  const visibleItems = primaryItems.filter((item) => !item.adminOnly || user?.role === "admin");

  return (
    <aside className="hidden w-72 shrink-0 flex-col border-r border-line bg-slate-950/80 px-4 py-5 lg:flex lg:min-h-screen">
      <div className="mb-8 px-2">
        <div className="text-lg font-semibold text-white">Tool Inventory</div>
        <div className="text-sm text-slate-400">Internal system</div>
      </div>

      <nav className="flex flex-1 flex-col justify-between space-y-6" aria-label="Main navigation">
        <div className="space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition",
                    isActive
                      ? "border border-line bg-white/10 text-white"
                      : "text-slate-300 hover:bg-white/5 hover:text-white",
                  ].join(" ")
                }
                key={item.href}
                to={item.href}
              >
                <Icon aria-hidden="true" size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </div>

        <div className="border-t border-line pt-4">
          <NavLink
            className={({ isActive }) =>
              [
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition",
                isActive
                  ? "border border-line bg-white/10 text-white"
                  : "text-slate-300 hover:bg-white/5 hover:text-white",
              ].join(" ")
            }
            to="/profile"
          >
            <UserCircle aria-hidden="true" size={18} />
            {user?.name || "Profile"}
          </NavLink>
        </div>
      </nav>
    </aside>
  );
}
