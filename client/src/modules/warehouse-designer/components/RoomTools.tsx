import { Layers, MousePointer2, PencilRuler, RectangleHorizontal, X } from "lucide-react";
import { useStudioStore } from "../store/useStudioStore";
import { formatLength } from "../utils/units";

export function RoomTools() {
  const activeTool = useStudioStore((state) => state.activeTool);
  const draftWallStart = useStudioStore((state) => state.draftWallStart);
  const settings = useStudioStore((state) => state.settings);
  const setActiveTool = useStudioStore((state) => state.setActiveTool);
  const setActiveLevel = useStudioStore((state) => state.setActiveLevel);
  const updateSettings = useStudioStore((state) => state.updateSettings);
  const cancelWall = useStudioStore((state) => state.cancelWall);
  const isWallDrawing = activeTool === "draw-wall";
  const isRectangleDrawing = activeTool === "rectangle-room";

  const snapToggle = (key: "snapToGrid" | "snapToEndpoints" | "snapToStraightAngles" | "snapToEqualWallLength", label: string) => (
    <label className="snap-toggle"><input type="checkbox" checked={settings[key] !== false} onChange={(event) => updateSettings({ [key]: event.target.checked } as Partial<typeof settings>)} /><span>{label}</span></label>
  );

  return <section className="room-tools">
    <div className="section-heading"><p className="eyebrow">Wall tools</p><h3>Interactive wall drawing</h3></div>
    <div className="tool-card">
      <p>Click to place connected walls. Snap modes help endpoints close, walls stay straight, and opposite walls match length.</p>
      <label className="field full-width"><span><Layers size={14} /> Draw on level</span><select value={settings.activeLevelId} onChange={(event) => setActiveLevel(event.target.value)}>{settings.levels.map((level) => <option key={level.id} value={level.id}>{level.name} · {formatLength(level.elevation, settings.unit, 2)}</option>)}</select></label>
      <div className="snap-row">{snapToggle("snapToGrid", "Grid")}{snapToggle("snapToEndpoints", "Endpoints")}{snapToggle("snapToStraightAngles", "Straight")}{snapToggle("snapToEqualWallLength", "Equal length")}</div>
      <div className="tool-actions"><button className={isWallDrawing ? "active" : ""} onClick={() => setActiveTool(isWallDrawing ? "select" : "draw-wall")}>{isWallDrawing ? <MousePointer2 size={15} /> : <PencilRuler size={15} />}{isWallDrawing ? "Select" : "Draw connected walls"}</button><button className={isRectangleDrawing ? "active" : ""} onClick={() => setActiveTool(isRectangleDrawing ? "select" : "rectangle-room")}><RectangleHorizontal size={15} /> Drag rectangle room</button><button onClick={cancelWall} disabled={!isWallDrawing && !draftWallStart}><X size={15} /> Cancel</button></div>
      <div className="tool-meta"><span>{draftWallStart ? "Click next endpoint" : "No wall draft"}</span><span>Drawing Z {formatLength(settings.activeElevation ?? 0, settings.unit, 2)}</span></div>
    </div>
  </section>;
}
