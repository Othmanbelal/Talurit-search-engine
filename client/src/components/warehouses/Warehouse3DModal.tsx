import { Warehouse, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getWarehouseRequest } from "../../services/warehouse.service";
import type { WarehouseLayout } from "../../types/warehouse";
import { WarehouseViewerPanel } from "./WarehouseViewerPanel";

/**
 * Opens the 3D warehouse focused on a specific slot in an overlay, so "Show in 3D"
 * from an inventory row jumps straight to the item without navigating to the
 * warehouse page (where the 3D view is far below the fold).
 */
export function Warehouse3DModal({ onClose, slotId, warehouseId }: {
  onClose: () => void;
  slotId: string;
  warehouseId: string;
}) {
  const [warehouse, setWarehouse] = useState<WarehouseLayout | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getWarehouseRequest(warehouseId)
      .then((result) => setWarehouse(result.warehouse))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load the warehouse."));
  }, [warehouseId]);

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal>
      <div className="flex w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-white/10 bg-[#060d18] shadow-industrial">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-2.5">
          <span className="flex items-center gap-2 text-sm font-semibold text-white">
            <Warehouse className="text-accent" size={16} /> {warehouse?.name ?? "Warehouse"}
          </span>
          <button className="rounded-md border border-white/10 p-1.5 text-slate-400 hover:border-accent hover:text-accent" onClick={onClose} type="button" aria-label="Close">
            <X size={16} />
          </button>
        </header>

        {error ? <p className="p-6 text-sm text-red-200">{error}</p> : null}
        {!warehouse && !error ? <div className="h-[520px] animate-pulse bg-white/[0.03]" /> : null}
        {warehouse ? <WarehouseViewerPanel focusSlotId={slotId} warehouse={warehouse} /> : null}
      </div>
    </div>
  );
}
