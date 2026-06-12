import { Check, ChevronDown, ChevronUp, Save, X } from "lucide-react";
import { useState } from "react";
import type { SaveRackSlotLayoutFromSceneObjectInput, WarehouseSceneObject, WarehouseShelf } from "../../types/warehouse";

type Props = {
  availableCodes?: string[];
  existingShelves: WarehouseShelf[];
  object: WarehouseSceneObject;
  onCancel: () => void;
  onSave: (input: SaveRackSlotLayoutFromSceneObjectInput) => Promise<void>;
};

type EditableSlot = { slotIndex: number; code: string; compartment: string };
type EditableLevel = { levelNumber: number; slotCount: number; slots: EditableSlot[] };
type Selected = { levelNumber: number; slotIndex: number } | null;

export function WarehouseRackSlotDesigner({ availableCodes = [], existingShelves, object, onCancel, onSave }: Props) {
  const defaultSlotCount = Math.max(1, Math.round((object.width || 2.4) / 1.2));
  const [levels, setLevels] = useState(() => buildInitialLevels(object, existingShelves, defaultSlotCount));
  const [selected, setSelected] = useState<Selected>(null);
  const [isSaving, setIsSaving] = useState(false);
  const duplicates = findDuplicates(levels);
  const listId = "rack-location-codes";

  const selectedSlot = selected
    ? levels.find((l) => l.levelNumber === selected.levelNumber)?.slots.find((s) => s.slotIndex === selected.slotIndex)
    : undefined;

  function selectSlot(levelNumber: number, slotIndex: number) {
    setSelected((prev) =>
      prev?.levelNumber === levelNumber && prev?.slotIndex === slotIndex ? null : { levelNumber, slotIndex },
    );
  }

  function updateSelected(patch: Partial<EditableSlot>) {
    if (!selected) return;
    setLevels((prev) =>
      prev.map((l) =>
        l.levelNumber === selected.levelNumber
          ? { ...l, slots: l.slots.map((s) => (s.slotIndex === selected.slotIndex ? { ...s, ...patch } : s)) }
          : l,
      ),
    );
  }

  function setLevelCount(count: number) {
    const n = Math.max(1, Math.min(50, count));
    setLevels((prev) => Array.from({ length: n }, (_, i) => prev[i] ?? emptyLevel(i + 1, defaultSlotCount)));
    setSelected(null);
  }

  function setSlotCount(levelNumber: number, count: number) {
    const n = Math.max(1, Math.min(100, count));
    setLevels((prev) =>
      prev.map((l) => (l.levelNumber === levelNumber ? normalizeSlots({ ...l, slotCount: n }) : l)),
    );
    setSelected(null);
  }

  async function save() {
    if (duplicates.length > 0) return;
    setIsSaving(true);
    try {
      await onSave({
        externalObjectId: object.externalObjectId,
        palletWidth: 1.2,
        palletDepth: 0.8,
        shelfLevels: levels.map((l) => ({
          levelNumber: l.levelNumber,
          slotCount: l.slotCount,
          slots: l.slots.map((s) => ({ slotIndex: s.slotIndex, code: s.code.trim() || null, compartment: s.compartment.trim() || null })),
        })),
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-accent/40 bg-slate-950/70 p-4">
      {availableCodes.length > 0 ? (
        <datalist id={listId}>{availableCodes.map((c) => <option key={c} value={c} />)}</datalist>
      ) : null}

      <header className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
        <div>
          <h3 className="text-lg font-semibold text-white">{object.name}</h3>
          <p className="text-sm text-slate-400">
            {object.width} m wide · {object.height} m tall · click a slot to assign a location code
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            Levels
            <input
              className="w-16 rounded-md border border-line bg-slate-950 px-2 py-1.5 text-sm text-white"
              min={1}
              onChange={(e) => setLevelCount(Number(e.target.value))}
              type="number"
              value={levels.length}
            />
          </label>
        </div>
      </header>

      {/* Rack front-view diagram */}
      <div className="overflow-x-auto rounded-lg border border-line bg-slate-950/50 p-3">
        {/* Orientation guide */}
        <div className="mb-2 flex items-center justify-between px-1 text-xs font-semibold text-slate-400">
          <span>← LEFT (slot 1)</span>
          <span className="text-slate-500 uppercase tracking-widest text-[10px]">front view</span>
          <span>RIGHT (last slot) →</span>
        </div>

        <div className="space-y-2">
          {[...levels].reverse().map((level) => (
            <div className="flex items-start gap-2" key={level.levelNumber}>
              <div className="flex w-16 shrink-0 flex-col items-end pt-3">
                <span className="text-xs font-semibold text-slate-300">Level {level.levelNumber}</span>
                <span className="text-[10px] text-slate-500">{level.slotCount} slots</span>
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap gap-1.5">
                  {level.slots.map((slot) => {
                    const isSelected = selected?.levelNumber === level.levelNumber && selected?.slotIndex === slot.slotIndex;
                    const assigned = Boolean(slot.code.trim());
                    return (
                      <button
                        className={slotClass(isSelected, assigned)}
                        key={slot.slotIndex}
                        onClick={() => selectSlot(level.levelNumber, slot.slotIndex)}
                        type="button"
                      >
                        <span className="block text-[10px] text-slate-400">#{slot.slotIndex}</span>
                        <span className="mt-0.5 block truncate text-xs font-semibold">
                          {slot.code.trim() || "—"}
                        </span>
                        {slot.compartment.trim() ? (
                          <span className="block text-[10px] text-slate-400">F{slot.compartment}</span>
                        ) : null}
                      </button>
                    );
                  })}
                  <button
                    className="flex h-16 w-10 items-center justify-center rounded-md border border-dashed border-line text-slate-500 hover:border-accent hover:text-accent text-lg"
                    onClick={() => setSlotCount(level.levelNumber, level.slotCount + 1)}
                    title="Add slot"
                    type="button"
                  >
                    +
                  </button>
                  {level.slotCount > 1 ? (
                    <button
                      className="flex h-16 w-10 items-center justify-center rounded-md border border-dashed border-line text-slate-500 hover:border-red-400 hover:text-red-300 text-lg"
                      onClick={() => setSlotCount(level.levelNumber, level.slotCount - 1)}
                      title="Remove last slot"
                      type="button"
                    >
                      −
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Inline slot editor */}
      {selected && selectedSlot ? (
        <div className="rounded-lg border border-accent/30 bg-slate-900 p-3">
          <p className="mb-3 text-sm font-semibold text-white">
            Level {selected.levelNumber}, Slot {selected.slotIndex}
            {selected.slotIndex === 1 ? " (leftmost)" : selected.slotIndex === levels.find(l => l.levelNumber === selected.levelNumber)?.slotCount ? " (rightmost)" : ""}
          </p>
          <div className="flex flex-wrap gap-3">
            <label className="block flex-1 min-w-40 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
              Location code
              <input
                autoFocus
                className="mt-1.5 w-full rounded-md border border-line bg-slate-950 px-3 py-2 text-sm text-white"
                list={availableCodes.length > 0 ? listId : undefined}
                onChange={(e) => updateSelected({ code: e.target.value })}
                placeholder="e.g. P10A:1"
                value={selectedSlot.code}
              />
              {availableCodes.length > 0 ? <span className="mt-1 block text-[10px] text-slate-500">Suggestions from linked inventory</span> : null}
            </label>
            <label className="block w-28 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
              FACK
              <input
                className="mt-1.5 w-full rounded-md border border-line bg-slate-950 px-3 py-2 text-sm text-white"
                onChange={(e) => updateSelected({ compartment: e.target.value })}
                placeholder="1"
                value={selectedSlot.compartment}
              />
            </label>
            <div className="flex items-end">
              <button
                className="rounded-md border border-line px-3 py-2 text-sm text-slate-400 hover:border-red-400 hover:text-red-300"
                onClick={() => updateSelected({ code: "", compartment: "" })}
                type="button"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="rounded-md border border-line bg-white/[0.02] p-3 text-sm text-slate-400">
          Click a slot above to assign its inventory location code.
        </p>
      )}

      {duplicates.length > 0 ? (
        <p className="rounded-md border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
          Duplicate location/FACK combinations detected — fix before saving.
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <button className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate-200 hover:border-accent" onClick={onCancel} type="button">
          <X size={16} /> Cancel
        </button>
        <button className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60" disabled={isSaving || duplicates.length > 0} onClick={() => void save()} type="button">
          <Save size={16} /> {isSaving ? "Saving…" : "Save rack layout"}
        </button>
      </div>
    </div>
  );
}

function slotClass(selected: boolean, assigned: boolean) {
  const base = "h-16 w-20 rounded-md border p-2 text-left transition";
  if (selected) return `${base} border-accent bg-accent/15 text-accent`;
  if (assigned) return `${base} border-emerald-400/30 bg-emerald-500/10 text-emerald-100 hover:border-accent`;
  return `${base} border-line bg-white/[0.03] text-slate-400 hover:border-accent hover:text-slate-200`;
}

function buildInitialLevels(object: WarehouseSceneObject, existingShelves: WarehouseShelf[], defaultSlotCount: number): EditableLevel[] {
  const linked = existingShelves
    .filter((s) => s.shelfKind === "rack_level" && s.warehouseObject?.externalObjectId === object.externalObjectId)
    .sort((a, b) => (a.levelNumber ?? 0) - (b.levelNumber ?? 0));
  if (linked.length > 0) {
    return linked.map((shelf, i) => {
      const levelNumber = shelf.levelNumber ?? i + 1;
      const slotCount = Math.max(1, ...shelf.slots.map((s) => s.slotIndex ?? 1));
      return normalizeSlots({
        levelNumber,
        slotCount,
        slots: shelf.slots.map((s, si) => ({
          slotIndex: s.slotIndex ?? si + 1,
          code: s.locationAssigned ? s.code : "",
          compartment: s.locationAssigned && s.compartment ? s.compartment : "",
        })),
      });
    });
  }
  const levelCount = Math.max(1, Math.round(object.height || 4));
  return Array.from({ length: levelCount }, (_, i) => emptyLevel(i + 1, defaultSlotCount));
}

function emptyLevel(levelNumber: number, slotCount: number): EditableLevel {
  return normalizeSlots({ levelNumber, slotCount, slots: [] });
}

function normalizeSlots(level: EditableLevel): EditableLevel {
  const byIndex = new Map(level.slots.map((s) => [s.slotIndex, s]));
  return {
    ...level,
    slots: Array.from({ length: level.slotCount }, (_, i) => byIndex.get(i + 1) ?? { slotIndex: i + 1, code: "", compartment: "" }),
  };
}

function findDuplicates(levels: EditableLevel[]) {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const level of levels) {
    for (const slot of level.slots) {
      if (!slot.code.trim()) continue;
      const key = `${slot.code.trim().toUpperCase()}::${slot.compartment.trim() || "1"}`;
      if (seen.has(key)) dupes.add(key);
      seen.add(key);
    }
  }
  return [...dupes];
}
