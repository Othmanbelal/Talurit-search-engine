import { ArrowRight, Table2, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { StructuredInventoryTableSummary } from "../../types/structured-inventory";

export function InventoryTableCard({ onDelete, table }: {
  onDelete?: (table: StructuredInventoryTableSummary) => void;
  table: StructuredInventoryTableSummary;
}) {
  const { t } = useTranslation("inventory");
  return (
    <article className="group relative rounded-xl border border-line bg-panel p-5 shadow-industrial transition-colors hover:border-slate-600">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-white/[0.04] text-accent">
          <Table2 size={20} />
        </div>
        <div className="flex items-center gap-1.5">
          {onDelete && (
            <button
              className="hidden h-8 w-8 items-center justify-center rounded-md border border-red-400/30 bg-red-500/10 text-red-300 transition-colors hover:bg-red-500/20 group-hover:flex"
              onClick={() => onDelete(table)}
              title={t("card.removeTable")}
              type="button"
            >
              <Trash2 size={13} />
            </button>
          )}
          <Link
            className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white/5 text-slate-400 transition-colors hover:border-accent hover:text-accent"
            title={t("card.openTable")}
            to={`/inventory/tables/${table.id}`}
          >
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <h3 className="mt-4 truncate text-base font-semibold text-white">{table.name}</h3>
      <p className="mt-0.5 text-xs text-slate-500">{table.sourceSheetName ?? table.tableType}</p>

      <div className="mt-4 rounded-md border border-line bg-white/[0.03] px-3 py-2">
        <div className="text-base font-semibold text-white">{table.rowCount}</div>
        <div className="mt-0.5 text-xs text-slate-500">{t("table.stockRows")}</div>
      </div>
    </article>
  );
}
