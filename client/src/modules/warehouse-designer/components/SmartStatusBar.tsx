import { AlertTriangle, CheckCircle2, Command, MousePointer2, Ruler, Save, Sparkles } from "lucide-react";
import type { ValidationIssue } from "../types";
import { useStudioStore } from "../store/useStudioStore";
import { formatLength } from "../utils/units";
import { levelVisibilityLabel } from "../utils/levels";

type SmartStatusBarProps = {
  issues: ValidationIssue[];
  mode: string;
  lastMessage?: string;
};

export function SmartStatusBar({ issues, mode, lastMessage }: SmartStatusBarProps) {
  const selected = useStudioStore((state) => state.selectedObject());
  const settings = useStudioStore((state) => state.settings);
  const errors = issues.filter((issue) => issue.severity === "error").length;
  const warnings = issues.filter((issue) => issue.severity === "warning").length;

  return (
    <footer className="smart-status-bar glass-panel">
      <div className="status-left">
        <span className="status-chip premium-chip"><Sparkles size={14} /> {mode}</span>
        {selected ? (
          <span className="status-selection">
            <MousePointer2 size={14} />
            <strong>{selected.name}</strong>
            <em>{formatLength(selected.width, settings.unit, 1)} × {formatLength(selected.depth, settings.unit, 1)} × {formatLength(selected.height, settings.unit, 1)} · Z {formatLength(selected.elevation ?? 0, settings.unit, 1)}</em>
          </span>
        ) : (
          <span className="status-selection muted"><MousePointer2 size={14} /> Right-click empty plan space to create. Click an object for actions.</span>
        )}
      </div>

      <div className="status-right">
        {lastMessage ? <span className="status-chip message-chip"><Save size={14} /> {lastMessage}</span> : null}
        <span className="status-chip"><Ruler size={14} /> Grid {formatLength(settings.gridSize, settings.unit, 0)} · {levelVisibilityLabel(settings)}</span>
        <span className={errors ? "status-chip error" : warnings ? "status-chip warning" : "status-chip ok"}>
          {errors ? <AlertTriangle size={14} /> : warnings ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
          {errors} errors · {warnings} warnings
        </span>
        <span className="status-chip shortcut-chip"><Command size={14} /> Ctrl+K · Ctrl+Z/Y</span>
      </div>
    </footer>
  );
}
