import { Boxes, ExternalLink, Package, Warehouse, X } from "lucide-react";
import { buildApiUrl } from "../../services/http";
import type { ShelfViewItem } from "../../types/warehouse";

type Props = {
  items: ShelfViewItem[];
  onClose: () => void;
  onOpen: (item: ShelfViewItem) => void;
  screenPos: { x: number; y: number } | null;
};

/**
 * Premium overlay card for the item(s) in the focused slot, visually tied to the
 * highlighted container by a leader line that follows the projected 3D point.
 */
export function WarehouseLinkedItemCard({ items, onClose, onOpen, screenPos }: Props) {
  if (items.length === 0) return null;
  const primary = items[0];

  return (
    <>
      {screenPos ? <Connector x={screenPos.x} y={screenPos.y} /> : null}
      <div className="pointer-events-auto absolute left-4 top-4 z-20 w-[min(20rem,calc(100%-2rem))] overflow-hidden rounded-xl border border-accent/40 bg-slate-900/90 shadow-industrial backdrop-blur-md">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 bg-accent/10 px-4 py-2.5">
          <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-accent">
            <Warehouse size={14} /> Stored here
          </span>
          <button className="rounded p-1 text-slate-400 hover:bg-white/10 hover:text-white" onClick={onClose} type="button" aria-label="Dismiss">
            <X size={15} />
          </button>
        </header>
        <div className="space-y-3 p-4">
          {items.map((item) => (
            <ItemRow item={item} key={item.assignmentId} onOpen={() => onOpen(item)} single={items.length === 1} />
          ))}
          {items.length > 1 ? (
            <p className="text-center text-xs text-slate-500">{items.length} items share this slot</p>
          ) : null}
        </div>
        <footer className="border-t border-white/10 px-4 py-2.5">
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-slate-950"
            onClick={() => onOpen(primary)}
            type="button"
          >
            <ExternalLink size={14} /> Open inventory row
          </button>
        </footer>
      </div>
    </>
  );
}

function ItemRow({ item, onOpen, single }: { item: ShelfViewItem; onOpen: () => void; single: boolean }) {
  return (
    <button className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-2.5 text-left hover:border-accent/40" onClick={onOpen} type="button">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-slate-950">
        {item.imageUrl ? (
          <img alt={item.itemName} className="h-full w-full object-cover" src={buildApiUrl(item.imageUrl)} />
        ) : item.containerType === "box" ? (
          <Boxes className="text-slate-500" size={22} />
        ) : (
          <Package className="text-slate-500" size={22} />
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{item.itemName}</p>
        <p className="truncate text-xs text-slate-400">{item.tableName}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {item.quantity} {item.unit}
          {item.locationCode ? ` · ${item.locationCode}` : ""}
          {item.compartment ? ` / FACK ${item.compartment}` : ""}
          {single ? "" : ` · ${item.containerType}`}
        </p>
      </div>
    </button>
  );
}

function Connector({ x, y }: { x: number; y: number }) {
  // Leader line from the card's bottom-left anchor to the projected container point.
  const anchorX = 28;
  const anchorY = 150;
  return (
    <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full overflow-visible">
      <line x1={anchorX} y1={anchorY} x2={x} y2={y} stroke="rgba(240,165,0,0.7)" strokeWidth={1.5} strokeDasharray="4 3" />
      <circle cx={x} cy={y} r={4} fill="#f0a500" />
      <circle cx={x} cy={y} r={8} fill="none" stroke="rgba(240,165,0,0.5)" strokeWidth={1.5} />
    </svg>
  );
}
