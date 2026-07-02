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
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const { t } = useTranslation("navigation");

  const primaryItems = [
    { label: t("dashboard"), href: "/dashboard", icon: BarChart3 },
    { label: t("inventory"), href: "/inventory", icon: Boxes },
    { label: t("usedIn"), href: "/used-in", icon: Boxes },
    { label: t("borrowedItems"), href: "/borrowed-items", icon: PackageMinus },
    { label: t("warehouses"), href: "/warehouses", icon: Warehouse },
    { label: t("locations"), href: "/locations", icon: MapPinned },
    { label: t("import"), href: "/import", icon: FileSpreadsheet, adminOnly: true },
    { label: t("users"), href: "/admin/users", icon: Users, adminOnly: true },
    { label: t("settings"), href: "/admin/settings", icon: Settings, adminOnly: true },
  ];

  const visibleItems = primaryItems.filter((item) => !item.adminOnly || user?.role === "admin");

  return (
    <>
      {isOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col overflow-y-auto border-r border-line bg-slate-950/95 px-4 py-5 transition-transform duration-200",
          "lg:static lg:inset-auto lg:min-h-screen lg:bg-slate-950/80 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="mb-8 flex items-center justify-between px-2">
          <div>
            <div className="text-lg font-semibold text-white">{t("appName")}</div>
            <div className="text-sm text-slate-400">{t("appSubtitle")}</div>
          </div>
          <button
            aria-label={t("closeNavigation")}
            className="rounded-md border border-line p-1.5 text-slate-400 hover:text-white lg:hidden"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col justify-between space-y-6" aria-label={t("mainNavigation")}>
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
                  onClick={onClose}
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
              onClick={onClose}
              to="/profile"
            >
              <UserCircle aria-hidden="true" size={18} />
              {user?.name || t("profile")}
            </NavLink>
          </div>
        </nav>
      </aside>
    </>
  );
}
