import { AlertTriangle, Move, Ruler, Wand2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ValidationIssue } from "../types";
import { useStudioStore } from "../store/useStudioStore";

export function SmartSuggestions({ issues, openInspector, openIssues }: { issues: ValidationIssue[]; openInspector: () => void; openIssues: () => void }) {
  const { t } = useTranslation("warehouses");
  const selected = useStudioStore((state) => state.selectedObject());
  const room = useStudioStore((state) => state.room);
  const updateObject = useStudioStore((state) => state.updateObject);
  const moveObject = useStudioStore((state) => state.moveObject);
  const updateSettings = useStudioStore((state) => state.updateSettings);
  const settings = useStudioStore((state) => state.settings);

  if (!selected) return null;

  const selectedIssues = issues.filter((issue) => issue.objectId === selected.id && issue.severity !== "info");
  if (selectedIssues.length === 0) return null;

  const canFixHeight = selectedIssues.some((issue) => issue.message.toLowerCase().includes("ceiling"));
  const canMoveInside = selectedIssues.some((issue) => issue.message.toLowerCase().includes("outside"));
  const hasClearance = selectedIssues.some((issue) => issue.message.toLowerCase().includes("aisle") || issue.message.toLowerCase().includes("clearance"));

  return (
    <aside className="smart-suggestions glass-panel warning">
      <div className="suggestion-title">
        <AlertTriangle size={18} />
        <div>
          <strong>{t("designer.suggestions")}</strong>
          <span>{selectedIssues[0].message}</span>
        </div>
      </div>
      <div className="suggestion-actions">
        {canFixHeight ? (
          <button onClick={() => updateObject(selected.id, { height: Math.max(0.1, room.height - 0.05) })}>
            <Ruler size={14} /> Fit below ceiling
          </button>
        ) : null}
        {canMoveInside ? (
          <button onClick={() => moveObject(selected.id, Math.min(Math.max(selected.width / 2, selected.position.x), room.width - selected.width / 2), Math.min(Math.max(selected.depth / 2, selected.position.y), room.depth - selected.depth / 2))}>
            <Move size={14} /> Nudge inside room
          </button>
        ) : null}
        {hasClearance ? (
          <button onClick={() => updateSettings({ minAisleWidth: Math.max(0.8, settings.minAisleWidth - 0.1) })}>
            <Wand2 size={14} /> Relax aisle by 100 mm
          </button>
        ) : null}
        <button onClick={openInspector}>Edit exact values</button>
        <button onClick={openIssues}>Open issues</button>
      </div>
    </aside>
  );
}
