import { Copy, Eye, EyeOff, Layers, Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { useStudioStore } from "../store/useStudioStore";
import { formatLength, metersToUnit, unitToMeters } from "../utils/units";
import { sortedLevels } from "../utils/levels";
import type { LevelViewMode } from "../types";

function fallbackLevelName(index: number, elevation: number) {
  if (Math.abs(elevation) < 0.001) return "Ground Floor";
  return `Level ${index + 1}`;
}

const viewModes: Array<{ id: LevelViewMode; label: string; help: string }> = [
  { id: "stack", label: "Show levels below", help: "Arrow up/down reveals or hides floors as a stack." },
  { id: "current", label: "Show current level only", help: "Focus on the active drawing level." },
  { id: "all", label: "Show all levels", help: "Useful for checking the whole building." }
];

export function LevelManager() {
  const settings = useStudioStore((state) => state.settings);
  const objects = useStudioStore((state) => state.objects);
  const addLevel = useStudioStore((state) => state.addLevel);
  const setActiveLevel = useStudioStore((state) => state.setActiveLevel);
  const updateSettings = useStudioStore((state) => state.updateSettings);
  const showLevelStackToIndex = useStudioStore((state) => state.showLevelStackToIndex);
  const toggleLevelVisibility = useStudioStore((state) => state.toggleLevelVisibility);
  const deleteLevel = useStudioStore((state) => state.deleteLevel);
  const duplicateWallsToLevel = useStudioStore((state) => state.duplicateWallsToLevel);
  const [newName, setNewName] = useState("");
  const [newElevation, setNewElevation] = useState(() => metersToUnit(3, settings.unit));
  const levels = useMemo(() => sortedLevels(settings), [settings]);
  const visibleTopIndex = Math.max(0, levels.reduce((top, level, index) => level.visible ? index : top, -1));
  const topLevel = levels[visibleTopIndex] ?? levels[0];
  const active = levels.find((level) => level.id === settings.activeLevelId) ?? topLevel;
  const levelStats = useMemo(() => levels.map((level) => ({
    ...level,
    walls: objects.filter((object) => object.type === "wall-segment" && Math.abs((object.elevation ?? 0) - level.elevation) < 0.001).length,
    objects: objects.filter((object) => Math.abs((object.elevation ?? 0) - level.elevation) < 0.001).length
  })), [objects, levels]);

  const createLevel = () => {
    const elevationMeters = Math.max(0, unitToMeters(Number(newElevation), settings.unit));
    addLevel(newName || fallbackLevelName(settings.levels.length, elevationMeters), elevationMeters);
    setNewName("");
    setNewElevation(metersToUnit(elevationMeters + 3, settings.unit));
  };
  const setViewMode = (levelViewMode: LevelViewMode) => updateSettings({ levelViewMode, showOnlyActiveLevel: levelViewMode === "current" });
  const stepStack = (direction: -1 | 1) => { setViewMode("stack"); showLevelStackToIndex(visibleTopIndex + direction); };

  return <section className="level-manager tool-card polished-level-manager">
    <div className="level-manager-header"><div><p className="eyebrow">Floor visibility</p><h3><Layers size={15} /> Level stack</h3></div></div>
    {topLevel ? <div className="level-stepper polished-stepper">
      <button disabled={visibleTopIndex <= 0} onClick={() => stepStack(-1)} title="Hide the highest visible level"><ChevronDown size={16} /></button>
      <div><strong>Showing up to {topLevel.name}</strong><span>{visibleTopIndex + 1} of {levels.length} levels visible · top Z {formatLength(topLevel.elevation, settings.unit, 2)}</span></div>
      <button disabled={visibleTopIndex >= levels.length - 1} onClick={() => stepStack(1)} title="Show one more level above"><ChevronUp size={16} /></button>
    </div> : null}
    <div className="level-view-modes">{viewModes.map((mode) => <button key={mode.id} className={settings.levelViewMode === mode.id ? "active" : ""} onClick={() => setViewMode(mode.id)}><strong>{mode.label}</strong><span>{mode.help}</span></button>)}</div>
    <p className="level-help">A level name is optional. Use names like Ground Floor, Mezzanine, or Office Level so stacked floors are easier to find later.</p>
    <div className="level-create-row"><input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Optional level name" /><input type="number" step={settings.unit === "m" ? 0.25 : 100} value={newElevation} onChange={(event) => setNewElevation(Number(event.target.value))} /><button onClick={createLevel}><Plus size={14} /> Add level</button></div>
    <div className="level-list">{levelStats.map((level) => {
      const isActive = level.id === settings.activeLevelId;
      return <div key={level.id} className={isActive ? "level-card active" : "level-card"}>
        <button className="level-main" onClick={() => setActiveLevel(level.id)}><strong>{level.name}</strong><span>{formatLength(level.elevation, settings.unit, 2)} · {level.walls} walls · {level.objects} objects · {level.visible ? "visible in stack" : "hidden above cut"}</span></button>
        <button title="Show/hide this level manually" onClick={() => toggleLevelVisibility(level.id)}>{level.visible ? <Eye size={14} /> : <EyeOff size={14} />}</button>
        {active && active.id !== level.id ? <button title="Duplicate current level walls here" onClick={() => duplicateWallsToLevel(active.elevation, level.elevation)}><Copy size={14} /></button> : null}
        <button title="Delete level definition" disabled={settings.levels.length <= 1} onClick={() => deleteLevel(level.id)}><Trash2 size={14} /></button>
      </div>;
    })}</div>
  </section>;
}
