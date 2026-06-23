import { ChevronRight, ExternalLink, TrendingDown, X } from "lucide-react";
import { useState } from "react";
import { Modal } from "../Modal";
import { listTableLowStockRowsRequest } from "../../services/low-stock.service";
import type { StructuredStockRow } from "../../types/structured-inventory";

export function LowStockSummaryWidget({ count, onOpenRow, tableId }: {
  count: number;
  onOpenRow: (row: StructuredStockRow) => void;
  tableId: string;
}) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<StructuredStockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const low = count > 0;

  async function openList() {
    setOpen(true);
    setLoading(true);
    try {
      const result = await listTableLowStockRowsRequest(tableId);
      setRows(result.rows);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        className={`flex w-full items-center justify-between gap-3 rounded-lg border p-4 text-left transition-colors ${
          low ? "border-amber-400/40 bg-amber-500/10 hover:bg-amber-500/[0.16]" : "border-line bg-white/[0.03] hover:bg-white/[0.06]"
        }`}
        onClick={openList}
        type="button"
      >
        <div className="flex items-center gap-3">
          <TrendingDown className={low ? "text-amber-300" : "text-slate-400"} size={18} />
          <div>
            <p className="text-sm font-semibold text-white">{count} item{count === 1 ? "" : "s"} below low‑stock level</p>
            <p className="text-xs text-slate-400">{low ? "Click to view and reorder" : "All items are above their threshold"}</p>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-sm font-bold ${low ? "bg-amber-500/20 text-amber-200" : "bg-white/10 text-slate-300"}`}>{count}</span>
      </button>

      {open ? (
        <Modal maxWidth="max-w-2xl" onClose={() => setOpen(false)}>
          <header className="flex items-center justify-between gap-4 border-b border-line p-5">
            <div className="flex items-center gap-2">
              <TrendingDown className="text-amber-300" size={18} />
              <h2 className="text-lg font-semibold text-white">Low stock — {count} item{count === 1 ? "" : "s"}</h2>
            </div>
            <button className="rounded-md border border-line bg-white/5 p-2 text-slate-300 hover:text-white" onClick={() => setOpen(false)} type="button">
              <X size={18} />
            </button>
          </header>
          <div className="max-h-[60vh] space-y-2 overflow-y-auto p-5">
            {loading ? <p className="text-sm text-slate-500">Loading…</p> : null}
            {!loading && rows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-slate-400">No items are below their low‑stock level.</p>
            ) : null}
            {rows.map((row) => (
              <LowRow key={row.id} onOpen={() => { onOpenRow(row); setOpen(false); }} row={row} />
            ))}
          </div>
        </Modal>
      ) : null}
    </>
  );
}

function LowRow({ onOpen, row }: { onOpen: () => void; row: StructuredStockRow }) {
  const placement = row.location ? row.location.code : "Unassigned";
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white/[0.03] p-3 hover:border-amber-400/40">
      <button className="min-w-0 flex-1 text-left" onClick={onOpen} type="button">
        <p className="truncate text-sm font-semibold text-white">{row.item.name}</p>
        <p className="text-xs text-slate-400">
          <span className="font-semibold text-amber-300">{row.quantity} {row.unit}</span> · low at {row.lowStockThreshold} {row.unit}
          <span className="text-slate-500"> · {placement}{row.compartment ? ` / FACK ${row.compartment}` : ""}</span>
        </p>
      </button>
      <div className="flex shrink-0 items-center gap-2">
        {row.reorderUrl ? (
          <a
            className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 px-2.5 py-1.5 text-xs font-semibold text-accent hover:bg-accent/10"
            href={row.reorderUrl}
            onClick={(e) => e.stopPropagation()}
            rel="noreferrer"
            target="_blank"
          >
            <ExternalLink size={13} /> Order
          </a>
        ) : null}
        <button className="rounded-md border border-line p-1.5 text-slate-400 hover:border-accent hover:text-accent" onClick={onOpen} title="Open details" type="button">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
