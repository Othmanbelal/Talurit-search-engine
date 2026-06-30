import type React from "react";
import { Archive, ArrowRight, Boxes, RotateCcw, Trash2, Warehouse } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { WarehouseSummary } from "../../types/warehouse";

export function WarehouseCard({
  onArchive,
  onDelete,
  onRestore,
  warehouse,
}: {
  onArchive: (warehouse: WarehouseSummary) => void;
  onDelete?: (warehouse: WarehouseSummary) => void;
  onRestore: (warehouse: WarehouseSummary) => void;
  warehouse: WarehouseSummary;
}) {
  const { t } = useTranslation("warehouses");

  return (
    <article className="rounded-lg border border-line bg-panel p-4 shadow-industrial">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-line bg-white/[0.04] text-accent">
          <Warehouse size={19} />
        </span>
        <div className="flex gap-2">
          {warehouse.isArchived ? (
            <button className="rounded-md border border-line bg-white/[0.04] p-2 text-slate-300 hover:border-accent hover:text-accent" onClick={() => onRestore(warehouse)} title={t("card.restoreTitle")} type="button">
              <RotateCcw size={16} />
            </button>
          ) : (
            <button className="rounded-md border border-line bg-white/[0.04] p-2 text-slate-300 hover:border-accent hover:text-accent" onClick={() => onArchive(warehouse)} title={t("card.archiveTitle")} type="button">
              <Archive size={16} />
            </button>
          )}
          {onDelete ? (
            <button className="rounded-md border border-red-400/30 bg-red-500/10 p-2 text-red-100 hover:border-red-400" onClick={() => onDelete(warehouse)} title={t("card.deleteTitle")} type="button">
              <Trash2 size={16} />
            </button>
          ) : null}
          <Link className="rounded-md border border-line bg-white/[0.04] p-2 text-slate-300 hover:border-accent hover:text-accent" title={t("card.openTitle")} to={`/warehouses/${warehouse.id}`}>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      <h2 className="mt-5 text-xl font-semibold text-white">{warehouse.name}</h2>
      <p className="mt-2 min-h-10 text-sm text-slate-400">{warehouse.description || t("noDescription")}</p>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
        <Metric icon={<Boxes size={14} />} label={t("card.shelves")} value={warehouse.counts.shelves} />
        <Metric label={t("card.slots")} value={warehouse.counts.slots} />
        <Metric label={t("card.assigned")} value={warehouse.counts.assignments} />
      </div>
      <p className="mt-4 text-xs text-slate-500">Version {warehouse.version} · Updated {formatDate(warehouse.updatedAt)}</p>
    </article>
  );
}

function Metric({ icon, label, value }: { icon?: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-md border border-line bg-white/[0.03] p-3">
      <div className="flex items-center gap-1 text-xs text-slate-400">{icon}{label}</div>
      <div className="mt-1 font-semibold text-white">{value}</div>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
