import { X } from "lucide-react";
import type { AddStockRowInput } from "../../types/structured-inventory";
import { Modal } from "../Modal";
import { StockRowForm } from "./StockRowForm";

export function StockRowAddDrawer({
  isOpen,
  onAddRow,
  onClose,
}: {
  isOpen: boolean;
  onAddRow: (input: AddStockRowInput) => Promise<void>;
  onClose: () => void;
}) {
  if (!isOpen) return null;
  return (
    <Modal maxWidth="max-w-4xl" onClose={onClose}>
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">New inventory item</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Add item</h2>
        </div>
        <button className="rounded-md border border-line bg-white/5 p-2 text-slate-300 hover:text-white" onClick={onClose} type="button">
          <X size={18} />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-5">
        <StockRowForm onAddRow={async (input) => { await onAddRow(input); onClose(); }} />
      </div>
    </Modal>
  );
}
