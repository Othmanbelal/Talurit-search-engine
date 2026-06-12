import { Check, Grid3X3, Magnet, MousePointer2, Ruler, Slash, X } from "lucide-react";
import { useStudioStore } from "../store/useStudioStore";
import { formatLength } from "../utils/units";
import { activeLevel } from "../utils/levels";

const labels = {
  "draw-wall": { title: "Drawing connected walls", hint: "Click to place the next endpoint. Snap closes loops cleanly." },
  "rectangle-room": { title: "Drawing rectangle room", hint: "Click and drag like a Paint rectangle, then release to create four walls." }
};

export function DrawingFocusBar() {
  const activeTool = useStudioStore((state) => state.activeTool);
  const draftWallStart = useStudioStore((state) => state.draftWallStart);
  const settings = useStudioStore((state) => state.settings);
  const updateSettings = useStudioStore((state) => state.updateSettings);
  const cancelWall = useStudioStore((state) => state.cancelWall);
  const copy = activeTool === "draw-wall" || activeTool === "rectangle-room" ? labels[activeTool] : null;
  if (!copy) return null;
  const level = activeLevel(settings);
  const snapItems = [
    { key: "snapToGrid", label: "Grid", icon: <Grid3X3 size={14} /> },
    { key: "snapToEndpoints", label: "Endpoints", icon: <Magnet size={14} /> },
    { key: "snapToStraightAngles", label: "Straight", icon: <Slash size={14} /> },
    { key: "snapToEqualWallLength", label: "Equal length", icon: <Ruler size={14} /> }
  ] as const;

  return <div className="drawing-focus-bar glass-panel" role="status" aria-live="polite">
    <div className="drawing-focus-main">
      <span className="drawing-focus-icon"><MousePointer2 size={17} /></span>
      <div><strong>{copy.title}</strong><span>{copy.hint}</span></div>
    </div>
    <div className="drawing-focus-state">
      <span>{level.name}</span>
      <em>Z {formatLength(level.elevation, settings.unit, 2)}</em>
      <em>{draftWallStart ? "Next endpoint" : activeTool === "draw-wall" ? "First point" : "Drag rectangle"}</em>
    </div>
    <div className="drawing-snap-pills">
      {snapItems.map((item) => <button key={item.key} className={settings[item.key] === false ? "" : "active"} onClick={() => updateSettings({ [item.key]: settings[item.key] === false } as Partial<typeof settings>)} title={`Toggle ${item.label} snap`}>{item.icon}{item.label}</button>)}
    </div>
    <button className="drawing-done" onClick={cancelWall}><Check size={15} /> Finish</button>
    <button className="drawing-cancel" onClick={cancelWall} title="Esc also cancels drawing"><X size={17} /></button>
  </div>;
}
