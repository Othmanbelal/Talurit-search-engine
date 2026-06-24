import { LogOut, Menu, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../hooks/useAuth";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { logout, user } = useAuth();
  const { t } = useTranslation("navigation");

  return (
    <header className="flex min-h-16 items-center justify-between border-b border-line bg-slate-950/70 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-3">
        <button
          aria-label={t("openNavigation")}
          className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white/5 text-slate-300 hover:border-accent hover:text-accent lg:hidden"
          onClick={onMenuClick}
          type="button"
        >
          <Menu aria-hidden="true" size={20} />
        </button>
        <div>
          <div className="text-sm font-medium text-white">{user?.name}</div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck aria-hidden="true" size={13} />
            {user?.role}
          </div>
        </div>
      </div>

      <button
        className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white/5 text-slate-200 hover:border-accent"
        onClick={() => void logout()}
        title={t("signOut")}
        type="button"
      >
        <LogOut aria-hidden="true" size={17} />
      </button>
    </header>
  );
}
