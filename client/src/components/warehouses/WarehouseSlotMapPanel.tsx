import { ChevronRight, Link2Off, Map as MapIcon, Package, X } from "lucide-react";
import { Modal } from "../Modal";
import { useState } from "react";
import { useWarehouseShelfView } from "../../hooks/useWarehouseShelfView";
import type { ShelfViewItem, ShelfViewShelf, ShelfViewSlot } from "../../types/warehouse";
import { WarehouseSlotCard } from "./WarehouseSlotCard";

type Props = {
  warehouseId: string;
};

type RackGroup = {
  key: string;
  name: string;
  shelves: ShelfViewShelf[];
  totalSlots: number;
  occupiedSlots: number;
};

export function WarehouseSlotMapPanel({ warehouseId }: Props) {
  const { data, isLoading, error } = useWarehouseShelfView(warehouseId);
  const [selectedSlot, setSelectedSlot] = useState<ShelfViewSlot | null>(null);

  if (isLoading) return <div className="h-40 animate-pulse rounded-lg border border-line bg-white/5" />;

  const noLinks = data?.linkedTableCount === 0;
  const groups = groupByRack(data?.shelves ?? []);

  return (
    <section className="space-y-4 rounded-lg border border-line bg-panel p-4 shadow-industrial">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-white/5 text-accent">
            <MapIcon size={18} />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-white">Slot map</h2>
            <p className="text-sm text-slate-400">Items appear automatically when their location code matches a labeled slot.</p>
          </div>
        </div>
        <div className="flex gap-4 text-xs">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-emerald-400/40 bg-emerald-500/20" /> Occupied</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-line bg-white/5" /> Free</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-dashed border-slate-700" /> No ID</span>
        </div>
      </div>

      {error ? <p className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p> : null}

      {noLinks ? (
        <div className="rounded-lg border border-dashed border-line p-8 text-center">
          <Link2Off className="mx-auto mb-3 text-slate-500" size={28} />
          <p className="text-sm font-semibold text-slate-300">No inventory linked</p>
          <p className="mt-1 text-sm text-slate-500">Link an inventory table or group from the Linked inventory tab to see items on shelves.</p>
        </div>
      ) : null}

      {!noLinks && groups.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-8 text-center text-sm text-slate-400">
          No shelves yet. Use the Shelves tab to add rack levels and slots.
        </p>
      ) : null}

      <div className="space-y-2">
        {groups.map((group) => (
          <RackCard group={group} key={group.key} onSelect={setSelectedSlot} selectedSlot={selectedSlot} />
        ))}
      </div>

      {selectedSlot ? (
        <SlotDetailPanel onClose={() => setSelectedSlot(null)} slot={selectedSlot} />
      ) : null}
    </section>
  );
}

function RackCard({ group, onSelect, selectedSlot }: {
  group: RackGroup;
  onSelect: (slot: ShelfViewSlot) => void;
  selectedSlot: ShelfViewSlot | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const occupancyPct = group.totalSlots > 0 ? Math.round((group.occupiedSlots / group.totalSlots) * 100) : 0;

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-slate-950/40">
      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
        onClick={() => setExpanded((e) => !e)}
        type="button"
      >
        <span className="text-slate-500 transition-transform" style={{ transform: expanded ? "rotate(90deg)" : undefined }}>
          <ChevronRight size={16} />
        </span>
        <span className="flex-1 font-semibold text-white">{group.name}</span>
        <span className="text-xs text-slate-400">{group.occupiedSlots} / {group.totalSlots} slots occupied</span>
        <span className="ml-1 min-w-[34px] rounded-full border border-line px-2 py-0.5 text-center text-[11px] text-slate-500">
          {occupancyPct}%
        </span>
      </button>

      {expanded ? (
        <div className="border-t border-line px-4 pb-4 pt-3 space-y-4">
          {group.shelves.map((shelf) => (
            <ShelfLevelSection key={shelf.id} onSelect={onSelect} selectedSlot={selectedSlot} shelf={shelf} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ShelfLevelSection({ onSelect, selectedSlot, shelf }: {
  onSelect: (slot: ShelfViewSlot) => void;
  selectedSlot: ShelfViewSlot | null;
  shelf: ShelfViewShelf;
}) {
  const label = shelf.shelfKind === "rack_level" && shelf.levelNumber != null
    ? `Level ${shelf.levelNumber}`
    : shelf.displayName ?? shelf.code;

  const occupiedCount = shelf.slots.filter((s) => s.items.length > 0).length;

  if (shelf.slots.length === 0) return null;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <span className="text-xs text-slate-600">{occupiedCount} / {shelf.slots.length}</span>
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))" }}>
        {shelf.slots.map((slot) => (
          <WarehouseSlotCard
            isSelected={selectedSlot?.id === slot.id}
            items={slot.items}
            key={slot.id}
            onSelect={() => onSelect(slot)}
            slot={slot}
          />
        ))}
      </div>
    </div>
  );
}

function SlotDetailPanel({ onClose, slot }: { onClose: () => void; slot: ShelfViewSlot }) {
  const label = slot.displayName ?? slot.code ?? "Unlabeled slot";
  const fack = slot.compartment ? ` / FACK ${slot.compartment}` : "";

  return (
    <Modal maxWidth="max-w-2xl" onClose={onClose}>
      <div className="flex shrink-0 items-center justify-between border-b border-line p-4">
        <div>
          <h3 className="font-semibold text-white">{label}{fack}</h3>
          <p className="text-xs text-slate-400">{slot.items.length} item{slot.items.length !== 1 ? "s" : ""} at this slot</p>
        </div>
        <button className="rounded-md p-1.5 text-slate-400 hover:bg-white/5 hover:text-white" onClick={onClose} type="button">
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {slot.items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line p-6 text-center">
            <Package className="mx-auto mb-2 text-slate-600" size={24} />
            <p className="text-sm text-slate-500">
              {slot.locationAssigned
                ? "No items from linked tables found at this location."
                : "This slot has no location ID assigned yet."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {slot.items.map((item) => <ItemCard item={item} key={item.id} />)}
          </div>
        )}
      </div>
    </Modal>
  );
}

function ItemCard({ item }: { item: ShelfViewItem }) {
  return (
    <div className="rounded-lg border border-line bg-white/[0.03] p-3">
      <p className="font-semibold text-white">{item.itemName}</p>
      {item.manufacturer ? <p className="text-xs text-slate-400">{item.manufacturer}</p> : null}
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-sm text-slate-300">{item.quantity} {item.unit}</span>
        <span className="rounded-full border border-line px-2 py-0.5 text-[11px] text-slate-400">{item.tableName}</span>
      </div>
      {item.compartment ? <p className="mt-1 text-xs text-slate-500">FACK {item.compartment}</p> : null}
    </div>
  );
}

function groupByRack(shelves: ShelfViewShelf[]): RackGroup[] {
  const map = new Map<string, RackGroup>();

  for (const shelf of shelves) {
    const key = shelf.warehouseObject?.id ?? `standalone-${shelf.id}`;
    const name = shelf.warehouseObject?.name ?? shelf.displayName ?? shelf.code;

    if (!map.has(key)) {
      map.set(key, { key, name, shelves: [], totalSlots: 0, occupiedSlots: 0 });
    }
    const group = map.get(key)!;
    group.shelves.push(shelf);
    group.totalSlots += shelf.slots.length;
    group.occupiedSlots += shelf.slots.filter((s) => s.items.length > 0).length;
  }

  // Sort shelves within each rack by level number
  for (const group of map.values()) {
    group.shelves.sort((a, b) => (a.levelNumber ?? 0) - (b.levelNumber ?? 0));
  }

  return [...map.values()];
}
