import { ExternalLink, PackageX, Pencil, TrendingDown } from "lucide-react";
import { isRowLowStockDefined } from "../../utils/lowStock";
import type { StructuredStockRow } from "../../types/structured-inventory";

export function LowStockSection({ onConfigure, row }: {
  onConfigure?: (row: StructuredStockRow) => void;
  row: StructuredStockRow;
}) {
  const defined = isRowLowStockDefined(row);
  const isLow = defined && row.quantity <= (row.lowStockThreshold as number);

  // Nothing configured and the viewer can't configure → don't show the section.
  if (!defined && !onConfigure) return null;

  return (
    <section className="rounded-lg border border-line bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          <TrendingDown size={13} /> Low stock
          {isLow ? <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">LOW</span> : null}
        </div>
        {onConfigure ? (
          <button
            className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-xs font-semibold text-slate-300 hover:border-accent hover:text-accent"
            onClick={() => onConfigure(row)}
            type="button"
          >
            <Pencil size={12} /> {defined ? "Edit" : "Set up"}
          </button>
        ) : null}
      </div>

      {defined ? (
        <div className="mt-3 space-y-1.5 text-sm">
          <p className="text-slate-300">
            Alerts at <span className="font-semibold text-white">{row.lowStockThreshold} {row.unit}</span>
            <span className="text-slate-500"> · currently {row.quantity} {row.unit}</span>
          </p>
          {row.reorderUrl ? (
            <a className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:underline" href={row.reorderUrl} rel="noreferrer" target="_blank">
              <ExternalLink size={13} /> Order link
            </a>
          ) : (
            <p className="text-xs text-slate-500">No order link set.</p>
          )}
        </div>
      ) : (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-500">
          <PackageX size={14} /> Low-stock monitoring is off for this item.
        </p>
      )}
    </section>
  );
}
