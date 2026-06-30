import { ArrowRight, FolderKanban, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { StructuredInventoryGroup } from "../../types/structured-inventory";

export function InventoryGroupCard({ group, onDelete }: { group: StructuredInventoryGroup; onDelete?: (group: StructuredInventoryGroup) => void }) {
  const { t } = useTranslation("inventory");
  return (
    <article className="group relative rounded-xl border border-line bg-panel p-5 shadow-industrial transition-colors hover:border-slate-600">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-white/[0.04] text-accent">
          <FolderKanban size={20} />
        </div>
        <div className="flex items-center gap-1.5">
          {onDelete && (
            <button
              className="hidden h-8 w-8 items-center justify-center rounded-md border border-red-400/30 bg-red-500/10 text-red-300 transition-colors hover:bg-red-500/20 group-hover:flex"
              onClick={() => onDelete(group)}
              title={t("card.removeGroup")}
              type="button"
            >
              <Trash2 size={13} />
            </button>
          )}
          <Link
            className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white/5 text-slate-400 transition-colors hover:border-accent hover:text-accent"
            title={t("card.openGroup")}
            to={`/inventory/groups/${group.id}`}
          >
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <h2 className="mt-4 truncate text-base font-semibold text-white">{group.name}</h2>
      <p className="mt-0.5 text-xs text-slate-500">{t("card.inventoryGroup")}</p>

      <div className="mt-4 flex gap-2">
        <Stat label={t("group.statTables")} value={group.tableCount} />
        <Stat label={t("group.statRows")} value={group.rowCount} />
      </div>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex-1 rounded-md border border-line bg-white/[0.03] px-3 py-2">
      <div className="text-base font-semibold text-white">{value}</div>
      <div className="mt-0.5 text-xs text-slate-500">{label}</div>
    </div>
  );
}
