import { Copy, Edit3, RotateCw, Trash2, X } from "lucide-react";
import { useStudioStore } from "../store/useStudioStore";
import { formatLength } from "../utils/units";
import { angleLabel } from "./planViewHelpers";

type SelectionChipProps = {
  onEdit: () => void;
};

export function SelectionChip({ onEdit }: SelectionChipProps) {
  const selected = useStudioStore((state) => state.selectedObject());
  const selectedIds = useStudioStore((state) => state.selectedIds);
  const settings = useStudioStore((state) => state.settings);
  const selectObject = useStudioStore((state) => state.selectObject);
  const selectObjects = useStudioStore((state) => state.selectObjects);
  const rotateObject = useStudioStore((state) => state.rotateObject);
  const duplicateObject = useStudioStore((state) => state.duplicateObject);
  const deleteObject = useStudioStore((state) => state.deleteObject);
  const deleteSelected = useStudioStore((state) => state.deleteSelected);

  if (selectedIds.length > 1) {
    return (
      <div className="context-selection-chip glass-panel multi-select-chip" aria-label="Multi-select actions">
        <div className="selection-chip-main">
          <strong>{selectedIds.length} objects selected</strong>
        </div>
        <button className="danger" onClick={() => deleteSelected()} title="Delete all selected"><Trash2 size={14} /> Delete all</button>
        <button className="selection-chip-close" onClick={() => selectObjects([])} title="Clear selection"><X size={14} /></button>
      </div>
    );
  }

  if (!selected) return null;

  return (
    <div className="context-selection-chip glass-panel" aria-label="Selected object actions">
      <div className="selection-chip-main">
        <strong>{selected.name}</strong>
        <span>
          {formatLength(selected.width, settings.unit, 1)} × {formatLength(selected.depth, settings.unit, 1)} × {formatLength(selected.height, settings.unit, 1)} · Z {formatLength(selected.elevation ?? 0, settings.unit, 1)} · {angleLabel(selected.rotation)}
        </span>
      </div>
      <button className="selection-chip-primary" onClick={onEdit} title="Open exact editor"><Edit3 size={14} /> Edit</button>
      <button onClick={() => rotateObject(selected.id, Math.PI / 2)} disabled={selected.locked} title="Rotate 90°"><RotateCw size={14} /></button>
      <button onClick={() => duplicateObject(selected.id)} title="Duplicate"><Copy size={14} /></button>
      <button className="danger" onClick={() => deleteObject(selected.id)} title="Delete"><Trash2 size={14} /></button>
      <button className="selection-chip-close" onClick={() => selectObject(null)} title="Clear selection"><X size={14} /></button>
    </div>
  );
}
