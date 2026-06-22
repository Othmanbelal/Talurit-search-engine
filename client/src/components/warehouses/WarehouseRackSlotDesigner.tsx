import { Save, X } from "lucide-react";
import { useState } from "react";
import type { SaveRackSlotLayoutFromSceneObjectInput, WarehouseSceneObject, WarehouseShelf } from "../../types/warehouse";

type Props = {
  existingShelves: WarehouseShelf[];
  object: WarehouseSceneObject;
  onCancel: () => void;
  onSave: (input: SaveRackSlotLayoutFromSceneObjectInput) => Promise<void>;
};

type EditableSlot = { slotIndex: number };
type EditableLevel = { levelNumber: number; slotCount: number; slots: EditableSlot[] };

export function WarehouseRackSlotDesigner({ existingShelves, object, onCancel, onSave }: Props) {
  const defaultSlotCount = Math.max(1, Math.round((object.width || 2.4) / 1.2));
  const [levels, setLevels] = useState(() => buildInitialLevels(object, existingShelves, defaultSlotCount));
  const [isSaving, setIsSaving] = useState(false);

  function setLevelCount(count: number) {
    const nextCount = Math.max(1, Math.min(50, count));
    setLevels((current) =>
      Array.from({ length: nextCount }, (_, index) => current[index] ?? emptyLevel(index + 1, defaultSlotCount)),
    );
  }

  function setSlotCount(levelNumber: number, count: number) {
    const nextCount = Math.max(1, Math.min(100, count));
    setLevels((current) =>
      current.map((level) =>
        level.levelNumber === levelNumber ? normalizeSlots({ ...level, slotCount: nextCount }) : level,
      ),
    );
  }

  async function save() {
    setIsSaving(true);
    try {
      await onSave({
        externalObjectId: object.externalObjectId,
        palletWidth: 1.2,
        palletDepth: 0.8,
        shelfLevels: levels.map((level) => ({
          levelNumber: level.levelNumber,
          slotCount: level.slotCount,
          slots: level.slots.map((slot) => ({
            slotIndex: slot.slotIndex,
            code: null,
            compartment: null,
          })),
        })),
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-accent/40 bg-slate-950/70 p-4">
      <header className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
        <div>
          <h3 className="text-lg font-semibold text-white">{object.name}</h3>
          <p className="text-sm text-slate-400">
            {object.width} m wide | {object.height} m tall | configure physical levels and pallet slots
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          Levels
          <input
            className="w-16 rounded-md border border-line bg-slate-950 px-2 py-1.5 text-sm text-white"
            min={1}
            onChange={(event) => setLevelCount(Number(event.target.value))}
            type="number"
            value={levels.length}
          />
        </label>
      </header>

      <p className="rounded-md border border-line bg-white/[0.02] p-3 text-sm text-slate-400">
        Location IDs are assigned automatically from the placement of the inventory item attached to each slot.
      </p>

      <div className="overflow-x-auto rounded-lg border border-line bg-slate-950/50 p-3">
        <div className="mb-2 flex items-center justify-between px-1 text-xs font-semibold text-slate-400">
          <span>LEFT (slot 1)</span>
          <span className="text-[10px] uppercase tracking-widest text-slate-500">front view</span>
          <span>RIGHT (last slot)</span>
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
                  {level.slots.map((slot) => (
                    <div
                      className="flex h-16 w-20 flex-col justify-center rounded-md border border-line bg-white/[0.03] p-2 text-center"
                      key={slot.slotIndex}
                    >
                      <span className="text-xs font-semibold text-slate-200">Slot #{slot.slotIndex}</span>
                      <span className="mt-1 text-[10px] text-slate-500">Item placement</span>
                    </div>
                  ))}
                  <button
                    className="flex h-16 w-10 items-center justify-center rounded-md border border-dashed border-line text-lg text-slate-500 hover:border-accent hover:text-accent"
                    onClick={() => setSlotCount(level.levelNumber, level.slotCount + 1)}
                    title="Add slot"
                    type="button"
                  >
                    +
                  </button>
                  {level.slotCount > 1 ? (
                    <button
                      className="flex h-16 w-10 items-center justify-center rounded-md border border-dashed border-line text-lg text-slate-500 hover:border-red-400 hover:text-red-300"
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

      <div className="flex flex-wrap justify-end gap-2">
        <button
          className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate-200 hover:border-accent"
          onClick={onCancel}
          type="button"
        >
          <X size={16} /> Cancel
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
          disabled={isSaving}
          onClick={() => void save()}
          type="button"
        >
          <Save size={16} /> {isSaving ? "Saving…" : "Save rack layout"}
        </button>
      </div>
    </div>
  );
}

function buildInitialLevels(object: WarehouseSceneObject, existingShelves: WarehouseShelf[], defaultSlotCount: number): EditableLevel[] {
  const linked = existingShelves
    .filter((shelf) => shelf.shelfKind === "rack_level" && shelf.warehouseObject?.externalObjectId === object.externalObjectId)
    .sort((left, right) => (left.levelNumber ?? 0) - (right.levelNumber ?? 0));

  if (linked.length > 0) {
    return linked.map((shelf, index) => {
      const levelNumber = shelf.levelNumber ?? index + 1;
      const slotCount = Math.max(1, ...shelf.slots.map((slot) => slot.slotIndex ?? 1));
      return normalizeSlots({
        levelNumber,
        slotCount,
        slots: shelf.slots.map((slot, slotIndex) => ({ slotIndex: slot.slotIndex ?? slotIndex + 1 })),
      });
    });
  }

  const levelCount = Math.max(1, Math.round(object.height || 4));
  return Array.from({ length: levelCount }, (_, index) => emptyLevel(index + 1, defaultSlotCount));
}

function emptyLevel(levelNumber: number, slotCount: number): EditableLevel {
  return normalizeSlots({ levelNumber, slotCount, slots: [] });
}

function normalizeSlots(level: EditableLevel): EditableLevel {
  const byIndex = new Map(level.slots.map((slot) => [slot.slotIndex, slot]));
  return {
    ...level,
    slots: Array.from({ length: level.slotCount }, (_, index) => byIndex.get(index + 1) ?? { slotIndex: index + 1 }),
  };
}
