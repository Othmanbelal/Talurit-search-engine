import { ChevronDown, ChevronUp, Layers3 } from "lucide-react";
import { useMemo } from "react";
import { useStudioStore } from "../store/useStudioStore";
import { formatLength } from "../utils/units";
import { levelVisibilityLabel, sortedLevels } from "../utils/levels";

type Props = { openLevels: () => void };

export function LevelQuickControl({ openLevels }: Props) {
  const settings = useStudioStore((state) => state.settings);
  const showLevelStackToIndex = useStudioStore((state) => state.showLevelStackToIndex);
  const updateSettings = useStudioStore((state) => state.updateSettings);
  const levels = useMemo(() => sortedLevels(settings), [settings]);
  const topIndex = Math.max(0, levels.reduce((top, level, index) => level.visible ? index : top, -1));
  const top = levels[topIndex] ?? levels[0];
  const go = (direction: -1 | 1) => {
    updateSettings({ levelViewMode: "stack", showOnlyActiveLevel: false });
    showLevelStackToIndex(topIndex + direction);
  };
  return <div className="level-quick-control" aria-label="Visible floor stack">
    <button onClick={() => go(-1)} disabled={topIndex <= 0} title="Hide the highest visible level"><ChevronDown size={15} /></button>
    <button className="level-quick-main" onClick={openLevels} title="Open level manager">
      <Layers3 size={15} />
      <span><strong>{top ? `Up to ${top.name}` : "Levels"}</strong><em>{levelVisibilityLabel(settings)}{top ? ` · Z ${formatLength(top.elevation, settings.unit, 2)}` : ""}</em></span>
    </button>
    <button onClick={() => go(1)} disabled={topIndex >= levels.length - 1} title="Show one more upper level"><ChevronUp size={15} /></button>
  </div>;
}
