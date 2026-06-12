import { Copy, Edit3, Info, Layers, Lock, PackagePlus, RectangleHorizontal, RotateCw, Search, Trash2, Unlock, X } from "lucide-react";
import type { ContextMenu } from "./planViewHelpers";
import type { SceneObject } from "../types";
import { useStudioStore } from "../store/useStudioStore";
import { formatLength } from "../utils/units";
import { createCategories, createChoices } from "./planViewHelpers";
import { nearestWallEndpoint } from "./wallDrawingHelpers";

function typeLabel(type: SceneObject["type"]): string {
  const map: Partial<Record<SceneObject["type"], string>> = {
    "pallet-rack": "Pallet rack", "storage-shelf": "Shelf", "euro-pallet": "Pallet",
    stair: "Stair", "wall-segment": "Wall", door: "Door", window: "Window",
    column: "Column", "no-go-zone": "No-go zone",
  };
  return map[type] ?? "Object";
}

type Props = {
  menu: ContextMenu | null;
  menuObject: SceneObject | null;
  hoveredObject: SceneObject | null;
  hoverCard: { x: number; y: number; objectId: string } | null;
  createFilter: string;
  createCategory: (typeof createCategories)[number];
  setCreateFilter: (value: string) => void;
  setCreateCategory: (value: (typeof createCategories)[number]) => void;
  closeMenu: () => void;
  onEditObject?: () => void;
};

export function PlanMenus(props: Props) {
  const settings = useStudioStore((s) => s.settings);
  const objects = useStudioStore((s) => s.objects);
  const addObject = useStudioStore((s) => s.addObject);
  const setActiveTool = useStudioStore((s) => s.setActiveTool);
  const startWallAt = useStudioStore((s) => s.startWallAt);
  const rotateObject = useStudioStore((s) => s.rotateObject);
  const duplicateObject = useStudioStore((s) => s.duplicateObject);
  const deleteObject = useStudioStore((s) => s.deleteObject);
  const updateObject = useStudioStore((s) => s.updateObject);
  const deleteRackRowGroup = useStudioStore((s) => s.deleteRackRowGroup);
  const duplicateRackRowGroup = useStudioStore((s) => s.duplicateRackRowGroup);

  const filtered = createChoices.filter((c) => {
    const catOk = props.createCategory === "All" || c.category === props.createCategory;
    const q = props.createFilter.trim().toLowerCase();
    return catOk && (!q || `${c.title} ${c.hint} ${c.category}`.toLowerCase().includes(q));
  });
  const createPoint = props.menu?.kind === "create" ? props.menu.point : null;
  const obj = props.menuObject;

  return <>
    {/* ── Object context menu ─────────────────────────── */}
    {props.menu?.kind === "object" && obj ? (
      <div className="obj-ctx-menu" style={{ left: props.menu.x, top: props.menu.y }} onPointerDown={(e) => e.stopPropagation()}>
        {/* Header: name + type badge */}
        <div className="obj-ctx-header">
          <div>
            <strong>{obj.name}</strong>
            <span className="obj-ctx-badge">{typeLabel(obj.type)}</span>
          </div>
          <button className="obj-ctx-close" onClick={props.closeMenu} aria-label="Close"><X size={13} /></button>
        </div>
        {/* Dimensions row */}
        <div className="obj-ctx-dims">
          <span>{formatLength(obj.width, settings.unit, 1)} × {formatLength(obj.depth, settings.unit, 1)} × {formatLength(obj.height, settings.unit, 1)}</span>
          {(obj.elevation ?? 0) > 0 && <span>Z {formatLength(obj.elevation ?? 0, settings.unit, 1)}</span>}
        </div>
        {/* Base actions — type-aware */}
        <div className="obj-ctx-section">
          <button onClick={() => { props.onEditObject?.(); props.closeMenu(); }}><Edit3 size={14} /> Edit</button>
          {obj.type !== "wall-segment" && (
            <button disabled={obj.locked} onClick={() => { rotateObject(obj.id, Math.PI / 2); props.closeMenu(); }}><RotateCw size={14} /> Rotate 90°</button>
          )}
          <button onClick={() => { duplicateObject(obj.id); props.closeMenu(); }}><Copy size={14} /> Duplicate</button>
          <button onClick={() => { updateObject(obj.id, { locked: !obj.locked }); props.closeMenu(); }}>
            {obj.locked ? <><Unlock size={14} /> Unlock</> : <><Lock size={14} /> Lock</>}
          </button>
          <button className="danger" onClick={() => { deleteObject(obj.id); props.closeMenu(); }}><Trash2 size={14} /> Delete</button>
        </div>
        {/* Row section — pallet-rack row members only */}
        {obj.row && (
          <>
            <div className="obj-ctx-divider"><Layers size={11} /> {obj.row.rowName}</div>
            <div className="obj-ctx-section">
              <button onClick={() => { duplicateRackRowGroup(obj.row!.rowGroupId); props.closeMenu(); }}><Copy size={14} /> Duplicate row</button>
              <button className="danger" onClick={() => { deleteRackRowGroup(obj.row!.rowGroupId); props.closeMenu(); }}><Trash2 size={14} /> Delete row</button>
            </div>
          </>
        )}
      </div>
    ) : null}

    {/* ── Create menu (right-click empty space) ───────── */}
    {props.menu?.kind === "create" ? (
      <div className="premium-create-menu" style={{ left: props.menu.x, top: props.menu.y }} onPointerDown={(e) => e.stopPropagation()}>
        <div className="context-menu-title create-title">
          <span>Add object</span>
          <small>{props.menu.point.x.toFixed(2)} m, {props.menu.point.y.toFixed(2)} m</small>
          <button onClick={props.closeMenu} aria-label="Close"><X size={14} /></button>
        </div>
        <label className="create-search"><Search size={14} /><input value={props.createFilter} onChange={(e) => props.setCreateFilter(e.target.value)} placeholder="Search…" autoFocus /></label>
        <div className="create-tabs">{createCategories.map((cat) => <button key={cat} className={props.createCategory === cat ? "active" : ""} onClick={() => props.setCreateCategory(cat)}>{cat}</button>)}</div>
        <div className="create-choice-grid">{filtered.map((c) => <button key={c.type} onClick={() => { addObject(c.type, createPoint!); props.closeMenu(); }}><PackagePlus size={16} /><span><strong>{c.title}</strong><small>{c.hint}</small></span></button>)}</div>
        <button className="create-shortcut" onClick={() => { setActiveTool("draw-wall"); startWallAt(nearestWallEndpoint(createPoint!, objects, settings) ?? createPoint!); props.closeMenu(); }}><Edit3 size={15} /> Draw wall here</button>
        <button className="create-shortcut" onClick={() => { setActiveTool("rectangle-room"); props.closeMenu(); }}><RectangleHorizontal size={15} /> Drag rectangle room</button>
      </div>
    ) : null}

    {/* ── Hover card ───────────────────────────────────── */}
    {props.hoveredObject && !props.menu ? (
      <div className="object-hover-card" style={{ left: props.hoverCard?.x ?? 0, top: props.hoverCard?.y ?? 0 }}>
        <div className="hover-title"><Info size={14} /> <strong>{props.hoveredObject.name}</strong></div>
        <div className="hover-metrics">
          <span>W {formatLength(props.hoveredObject.width, settings.unit, 1)}</span>
          <span>D {formatLength(props.hoveredObject.depth, settings.unit, 1)}</span>
          <span>H {formatLength(props.hoveredObject.height, settings.unit, 1)}</span>
        </div>
        {props.hoveredObject.rack ? <p>{props.hoveredObject.rack.levels} levels · {props.hoveredObject.rack.maxLoadPerLevelKg} kg/level</p> : null}
        {props.hoveredObject.row ? <p className="hover-row"><Layers size={12} /> {props.hoveredObject.row.rowName}</p> : null}
      </div>
    ) : null}
  </>;
}
