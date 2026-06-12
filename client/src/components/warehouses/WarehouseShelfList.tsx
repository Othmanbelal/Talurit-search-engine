import { Edit3, Plus, Save, Trash2, X } from "lucide-react";
import { FormEvent, useState } from "react";
import type { UpdateWarehouseShelfInput, UpdateWarehouseSlotInput, WarehouseShelf, WarehouseSlot } from "../../types/warehouse";

type Props = {
  canEdit: boolean;
  onAddSlot: (shelfId: string, compartment: string) => Promise<void>;
  onDeleteShelf: (shelfId: string) => Promise<void>;
  onDeleteSlot: (slotId: string) => Promise<void>;
  onUpdateShelf: (shelfId: string, input: UpdateWarehouseShelfInput) => Promise<void>;
  onUpdateSlot: (slotId: string, input: UpdateWarehouseSlotInput) => Promise<void>;
  shelves: WarehouseShelf[];
};

export function WarehouseShelfList(props: Props) {
  if (props.shelves.length === 0) {
    return <div className="rounded-lg border border-dashed border-line p-8 text-center text-sm text-slate-400">No warehouse shelves yet.</div>;
  }

  return (
    <div className="grid gap-3 xl:grid-cols-2">
      {props.shelves.map((shelf) => <ShelfCard key={shelf.id} {...props} shelf={shelf} />)}
    </div>
  );
}

function ShelfCard({ canEdit, onAddSlot, onDeleteShelf, onDeleteSlot, onUpdateShelf, onUpdateSlot, shelf }: Props & { shelf: WarehouseShelf }) {
  const [editing, setEditing] = useState(false);
  const [slotInput, setSlotInput] = useState("");

  async function addSlot(event: FormEvent) {
    event.preventDefault();
    if (!slotInput.trim()) return;
    await onAddSlot(shelf.id, slotInput.trim());
    setSlotInput("");
  }

  return (
    <article className="rounded-lg border border-line bg-slate-950/30 p-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
        {editing ? <ShelfEditForm onCancel={() => setEditing(false)} onSave={(input) => onUpdateShelf(shelf.id, input).then(() => setEditing(false))} shelf={shelf} /> : <ShelfHeader shelf={shelf} />}
        {canEdit ? (
          <div className="flex shrink-0 items-center gap-2">
            <button className="rounded-md border border-line p-2 text-slate-300 hover:text-white" onClick={() => setEditing(true)} title="Edit shelf" type="button"><Edit3 size={15} /></button>
            <button className="rounded-md border border-red-400/40 p-2 text-red-100 hover:bg-red-500/10" onClick={() => confirmDeleteShelf(shelf, onDeleteShelf)} title="Delete shelf" type="button"><Trash2 size={15} /></button>
          </div>
        ) : null}
      </div>
      {canEdit ? (
        <form className="mt-3 flex gap-2" onSubmit={addSlot}>
          <input className="min-w-0 flex-1 rounded-md border border-line bg-slate-950 px-3 py-2 text-sm text-white" onChange={(event) => setSlotInput(event.target.value)} placeholder="Add FACK" value={slotInput} />
          <button className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate-200" type="submit"><Plus size={15} /> Slot</button>
        </form>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {shelf.slots.map((slot) => <SlotChip canEdit={canEdit} key={slot.id} onDeleteSlot={onDeleteSlot} onUpdateSlot={onUpdateSlot} slot={slot} />)}
      </div>
    </article>
  );
}

function ShelfHeader({ shelf }: { shelf: WarehouseShelf }) {
  const title = shelf.shelfKind === "rack_level" && shelf.levelNumber ? `${shelf.warehouseObject?.name ?? "Rack"} / Level ${shelf.levelNumber}` : shelf.code;
  return (
    <div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="text-sm text-slate-400">{shelf.shelfKind === "rack_level" ? "Physical rack shelf level" : shelf.displayName || shelf.storageLocation?.displayName || "Warehouse shelf"}</p>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-line px-2 py-1 text-slate-300">{shelf.shelfKind}</span>
        <span className="rounded-full border border-line px-2 py-1 text-slate-300">{shelf.counts.slots} slots</span>
        <span className="rounded-full border border-emerald-400/30 px-2 py-1 text-emerald-100">{shelf.counts.assignments} assigned</span>
      </div>
    </div>
  );
}

function ShelfEditForm({ onCancel, onSave, shelf }: { onCancel: () => void; onSave: (input: UpdateWarehouseShelfInput) => Promise<void>; shelf: WarehouseShelf }) {
  const [code, setCode] = useState(shelf.code);
  const [displayName, setDisplayName] = useState(shelf.displayName ?? "");
  return (
    <form className="grid flex-1 gap-2 md:grid-cols-[1fr_1fr_auto_auto]" onSubmit={(event) => { event.preventDefault(); void onSave({ code, displayName: displayName || null }); }}>
      <input className="rounded-md border border-line bg-slate-950 px-3 py-2 text-sm text-white" onChange={(event) => setCode(event.target.value)} value={code} />
      <input className="rounded-md border border-line bg-slate-950 px-3 py-2 text-sm text-white" onChange={(event) => setDisplayName(event.target.value)} placeholder="Display name" value={displayName} />
      <button className="rounded-md border border-emerald-400/40 p-2 text-emerald-100" title="Save" type="submit"><Save size={15} /></button>
      <button className="rounded-md border border-line p-2 text-slate-300" onClick={onCancel} title="Cancel" type="button"><X size={15} /></button>
    </form>
  );
}

function SlotChip({ canEdit, onDeleteSlot, onUpdateSlot, slot }: { canEdit: boolean; onDeleteSlot: (slotId: string) => Promise<void>; onUpdateSlot: (slotId: string, input: UpdateWarehouseSlotInput) => Promise<void>; slot: WarehouseSlot }) {
  const [editing, setEditing] = useState(false);
  const [compartment, setCompartment] = useState(slot.compartment);
  const label = slot.locationAssigned ? `${slot.code} / FACK ${slot.compartment}` : "No location ID assigned";
  if (editing) {
    return (
      <form className="inline-flex items-center gap-1 rounded-md border border-line bg-slate-950 p-1" onSubmit={(event) => { event.preventDefault(); void onUpdateSlot(slot.id, { compartment }).then(() => setEditing(false)); }}>
        <input className="w-20 rounded bg-slate-900 px-2 py-1 text-sm text-white" onChange={(event) => setCompartment(event.target.value)} value={compartment} />
        <button className="p-1 text-emerald-100" title="Save slot" type="submit"><Save size={14} /></button>
        <button className="p-1 text-slate-400" onClick={() => setEditing(false)} title="Cancel" type="button"><X size={14} /></button>
      </form>
    );
  }
  return (
    <span className={`inline-flex items-center gap-2 rounded-md border px-2 py-1 text-sm ${slot.assignmentCount ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-100" : "border-line bg-slate-950/70 text-slate-200"}`}>
      {slot.slotIndex ? `Slot ${slot.slotIndex}: ` : null}{label}
      {slot.assignmentCount ? <span className="text-xs text-emerald-200">{slot.assignmentCount}</span> : null}
      {canEdit ? <button className="text-slate-400 hover:text-white" onClick={() => setEditing(true)} title="Rename slot" type="button"><Edit3 size={13} /></button> : null}
      {canEdit ? <button className="text-red-200 hover:text-red-100" onClick={() => confirmDeleteSlot(slot, onDeleteSlot)} title="Delete slot" type="button"><Trash2 size={13} /></button> : null}
    </span>
  );
}

function confirmDeleteShelf(shelf: WarehouseShelf, onDelete: (id: string) => Promise<void>) {
  if (window.confirm(`Delete shelf ${shelf.code}? This is only allowed when it has no assigned stock.`)) void onDelete(shelf.id);
}

function confirmDeleteSlot(slot: WarehouseSlot, onDelete: (id: string) => Promise<void>) {
  if (window.confirm(`Delete FACK ${slot.compartment}? This is only allowed when it has no assigned stock.`)) void onDelete(slot.id);
}
