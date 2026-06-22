import { Package, PackageX } from "lucide-react";
import type { ShelfViewItem, ShelfViewSlot } from "../../types/warehouse";

type Props = {
  items: ShelfViewItem[];
  isSelected: boolean;
  onSelect: () => void;
  slot: ShelfViewSlot;
};

export function WarehouseSlotCard({ items, isSelected, onSelect, slot }: Props) {
  const occupied = items.length > 0;
  const label = occupied ? itemPlacementLabel(items[0]) : physicalSlotLabel(slot.slotIndex);

  return (
    <button
      className={slotClass(isSelected, occupied)}
      onClick={onSelect}
      title={label}
      type="button"
    >
      <div className="flex items-center justify-between gap-1">
        {occupied
          ? <Package className="shrink-0 text-emerald-300" size={13} />
          : <PackageX className="shrink-0 text-slate-500" size={13} />}
        <span className={`truncate text-[11px] font-semibold ${occupied ? "text-emerald-200" : "text-slate-400"}`}>
          {label}
        </span>
      </div>
      {slot.slotIndex !== undefined && slot.slotIndex !== null ? (
        <span className="mt-1 block text-[10px] text-slate-500">#{slot.slotIndex}</span>
      ) : null}
      {occupied ? (
        <span className="mt-1 block truncate text-[10px] text-emerald-300">
          {items.length === 1 ? items[0].itemName : `${items.length} items`}
        </span>
      ) : (
        <span className="mt-1 block text-[10px] text-slate-600">Free</span>
      )}
    </button>
  );
}

function slotClass(isSelected: boolean, occupied: boolean) {
  const base = "min-h-20 rounded-md border p-2 text-left transition-colors";
  if (isSelected) return `${base} border-accent bg-accent/15`;
  if (occupied) return `${base} border-emerald-400/40 bg-emerald-500/10 hover:border-emerald-400/60`;
  return `${base} border-dashed border-slate-700 bg-white/[0.01] hover:border-line`;
}

function itemPlacementLabel(item: ShelfViewItem) {
  return `${item.locationCode ?? "Placement unassigned"}${item.compartment ? ` / FACK ${item.compartment}` : ""}`;
}

function physicalSlotLabel(slotIndex?: number | null) {
  return slotIndex ? `Slot #${slotIndex}` : "Available slot";
}
