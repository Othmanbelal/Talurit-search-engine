import { MouseEvent, PointerEvent, WheelEvent, useMemo, useRef, useState } from "react";

import type { SceneObject } from "../types";
import { WD_TOKENS } from "../theme/designTokens";
import { useStudioStore } from "../store/useStudioStore";
import { snapPoint } from "../store/objectFactory";
import { formatLength } from "../utils/units";
import { activeWarehouseBoundary, objectCorners, polygonBounds, polygonCenter } from "../utils/geometry";
import { aisleGuidesForRows } from "../utils/warehouse";
import { angleLabel, createCategories, gridExtent, localToWorld, objectClass, objectLabel, polygonPoints, rowBounds, snapValue, visibleGridLines, worldToLocal, type ContextMenu, type DragState } from "./planViewHelpers";
import { PlanMenus } from "./PlanMenus";
import { PalletPlanSymbol } from "./PalletPlanSymbol";
import { nearestWallEndpoint, rectFromDraft, smartWallPoint, smartWallPointWithInfo, snapsToWallEndpoint, type RectDraft } from "./wallDrawingHelpers";
import { visibleObjects } from "../utils/levels";
import { resolveStairs } from "../utils/stairs";

export function PlanView({ onEditObject }: { onEditObject?: () => void }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [menu, setMenu] = useState<ContextMenu | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoverCard, setHoverCard] = useState<{ x: number; y: number; objectId: string } | null>(null);
  const [createFilter, setCreateFilter] = useState("");
  const [createCategory, setCreateCategory] = useState<(typeof createCategories)[number]>("All");
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [wallPreview, setWallPreview] = useState<{ x: number; y: number } | null>(null);
  const [wallSnapLabel, setWallSnapLabel] = useState<string | null>(null);
  const [rectDraft, setRectDraft] = useState<RectDraft | null>(null);
  const [dragLivePositions, setDragLivePositions] = useState<Record<string, { x: number; y: number }> | null>(null);

  const room = useStudioStore((state) => state.room);
  const objects = useStudioStore((state) => state.objects);
  const selectedId = useStudioStore((state) => state.selectedId);
  const selectedIds = useStudioStore((state) => state.selectedIds);
  const settings = useStudioStore((state) => state.settings);
  const activeTool = useStudioStore((state) => state.activeTool);
  const draftWallStart = useStudioStore((state) => state.draftWallStart);
  const selectObject = useStudioStore((state) => state.selectObject);
  const selectObjects = useStudioStore((state) => state.selectObjects);
  const toggleObjectInSelection = useStudioStore((state) => state.toggleObjectInSelection);
  const setActiveTool = useStudioStore((state) => state.setActiveTool);
  const updateObject = useStudioStore((state) => state.updateObject);
  const startWallAt = useStudioStore((state) => state.startWallAt);
  const finishWallAt = useStudioStore((state) => state.finishWallAt);
  const createRectangleWalls = useStudioStore((state) => state.createRectangleWalls);

  const displayObjects = useMemo(
    () => resolveStairs(visibleObjects(objects, settings), settings),
    [objects, settings]
  );
  const boundary = activeWarehouseBoundary(room, displayObjects);
  const aisleGuides = settings.showAisleGuides ? aisleGuidesForRows(displayObjects, settings) : [];
  const planPoints = [...boundary, ...displayObjects.flatMap((object) => objectCorners(object))];
  const extent = gridExtent(planPoints, room.width, room.depth);
  const padding = Math.max(8, Math.max(room.width, room.depth, 8) * 0.7);
  const boundaryBounds = polygonBounds(boundary);
  const selected = displayObjects.find((object) => object.id === selectedId) ?? null;
  const menuObject = menu?.kind === "object" ? displayObjects.find((object) => object.id === menu.objectId) ?? null : null;
  const hoveredObject = hoverCard ? displayObjects.find((object) => object.id === hoverCard.objectId) ?? null : null;
  const selectedRowBounds = selected?.row ? rowBounds(displayObjects, selected.row.rowGroupId) : null;

  const svgPoint = (event: PointerEvent<SVGSVGElement> | MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = svg.getScreenCTM()?.inverse();
    const transformed = matrix ? point.matrixTransform(matrix) : point;
    return { x: transformed.x, y: transformed.y };
  };

  const closeMenu = () => setMenu(null);
  const openObjectMenu = (event: PointerEvent<SVGGElement> | MouseEvent<SVGGElement>, object: SceneObject) => {
    event.stopPropagation();
    event.preventDefault();
    selectObject(object.id);
    setMenu({ kind: "object", x: event.clientX + 12, y: event.clientY - 8, objectId: object.id });
  };

  const beginResize = (event: PointerEvent<SVGElement>, object: SceneObject, axis: "width" | "depth" | "corner") => {
    event.stopPropagation();
    event.preventDefault();
    closeMenu();
    selectObject(object.id);
    (event.currentTarget as SVGElement).setPointerCapture(event.pointerId);
    setDrag({ kind: "resize", objectId: object.id, axis });
  };

  const beginRotate = (event: PointerEvent<SVGElement>, object: SceneObject) => {
    event.stopPropagation();
    event.preventDefault();
    closeMenu();
    selectObject(object.id);
    (event.currentTarget as SVGElement).setPointerCapture(event.pointerId);
    setDrag({ kind: "rotate", objectId: object.id });
  };

  const handlePlanPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button === 1 || event.altKey || event.shiftKey) {
      event.preventDefault();
      closeMenu();
      setDrag({ kind: "pan", startClient: { x: event.clientX, y: event.clientY }, startPan: pan });
      return;
    }
    if (event.button === 2) return;
    const point = svgPoint(event);
    if (activeTool === "draw-wall") {
      closeMenu();
      const nextPoint = draftWallStart ? smartWallPoint(draftWallStart, point, objects, settings) : nearestWallEndpoint(point, objects, settings) ?? point;
      const closesOnEndpoint = draftWallStart ? Boolean(snapsToWallEndpoint(draftWallStart, point, objects, settings)) : false;
      draftWallStart ? finishWallAt(nextPoint) : startWallAt(nextPoint);
      if (closesOnEndpoint) setActiveTool("select");
      setWallPreview(null);
      setWallSnapLabel(null);
      return;
    }
    if (activeTool === "rectangle-room") {
      closeMenu();
      (event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId);
      setRectDraft({ start: point, current: point });
      return;
    }
    closeMenu();
    selectObjects([]);
    setDrag({ kind: "marquee", startPlan: point, currentPlan: point });
  };

  const handlePlanContextMenu = (event: MouseEvent<SVGSVGElement>) => {
    event.preventDefault();
    if (activeTool === "draw-wall" || activeTool === "rectangle-room") return;
    selectObject(null);
    setCreateFilter("");
    setCreateCategory("All");
    setMenu({ kind: "create", x: event.clientX + 12, y: event.clientY - 8, point: svgPoint(event) });
  };

  const handleObjectPointerDown = (event: PointerEvent<SVGGElement>, object: SceneObject) => {
    if (activeTool !== "select") return;
    event.stopPropagation();
    if (object.locked) return openObjectMenu(event, object);
    const point = svgPoint(event as unknown as PointerEvent<SVGSVGElement>);
    if (event.shiftKey) {
      toggleObjectInSelection(object.id);
      return;
    }
    const offset = { x: point.x - object.position.x, y: point.y - object.position.y };
    if (selectedIds.includes(object.id) && selectedIds.length > 1) {
      const startPositions: Record<string, { x: number; y: number }> = {};
      displayObjects.forEach((o) => { if (selectedIds.includes(o.id)) startPositions[o.id] = { ...o.position }; });
      setDrag({ kind: "object", objectId: object.id, offset, startPositions });
      return;
    }
    selectObject(object.id);
    setDrag({ kind: "object", objectId: object.id, offset, startPositions: { [object.id]: { ...object.position } } });
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const point = svgPoint(event);
    if (activeTool === "draw-wall" || activeTool === "rectangle-room") { setHoveredId(null); setHoverCard(null); }
    if (activeTool === "draw-wall" && draftWallStart) {
      const preview = smartWallPointWithInfo(draftWallStart, point, objects, settings);
      setWallPreview(preview.point);
      setWallSnapLabel(preview.label);
    }
    if (activeTool === "rectangle-room" && rectDraft) setRectDraft({ ...rectDraft, current: point });
    if (!drag) return;
    if (drag.kind !== "object") closeMenu();
    if (drag.kind === "marquee") { setDrag({ ...drag, currentPlan: point }); return; }
    if (drag.kind === "pan") {
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        const baseW = (extent.maxX - extent.minX + padding * 2) / zoom;
        const baseH = (extent.maxY - extent.minY + padding * 2) / zoom;
        setPan({ x: drag.startPan.x - ((event.clientX - drag.startClient.x) / rect.width) * baseW, y: drag.startPan.y - ((event.clientY - drag.startClient.y) / rect.height) * baseH });
      }
      return;
    }
    if (drag.kind === "object") {
      const rawX = point.x - drag.offset.x;
      const rawY = point.y - drag.offset.y;
      const startPos = drag.startPositions[drag.objectId];
      if (startPos && Object.keys(drag.startPositions).length > 1) {
        // Multi-select drag: compute snapped delta from the primary object's start position
        const snapped = snapPoint({ x: rawX, y: rawY }, settings);
        const dx = snapped.x - startPos.x;
        const dy = snapped.y - startPos.y;
        const live: Record<string, { x: number; y: number }> = {};
        for (const [id, sp] of Object.entries(drag.startPositions)) {
          live[id] = { x: sp.x + dx, y: sp.y + dy };
        }
        setDragLivePositions(live);
      } else {
        // Single object drag: snap and store locally without touching the store
        const snapped = snapPoint({ x: rawX, y: rawY }, settings);
        setDragLivePositions({ [drag.objectId]: snapped });
      }
      return;
    }
    const object = objects.find((item) => item.id === drag.objectId);
    if (!object || object.locked) return;
    if (drag.kind === "resize") {
      const local = worldToLocal(object, point);
      const patch: Partial<SceneObject> = {};
      if (drag.axis === "width" || drag.axis === "corner") patch.width = snapValue(Math.abs(local.x) * 2, settings.gridSize, settings.snapToGrid);
      if (drag.axis === "depth" || drag.axis === "corner") patch.depth = snapValue(Math.abs(local.y) * 2, settings.gridSize, settings.snapToGrid);
      updateObject(object.id, patch);
      return;
    }
    if (drag.kind === "rotate") {
      const raw = Math.atan2(point.y - object.position.y, point.x - object.position.x) + Math.PI / 2;
      updateObject(object.id, { rotation: event.shiftKey ? Math.round(raw / (Math.PI / 12)) * (Math.PI / 12) : raw });
    }
  };

  const baseView = { x: extent.minX - padding, y: extent.minY - padding, w: extent.maxX - extent.minX + padding * 2, h: extent.maxY - extent.minY + padding * 2 };
  const viewW = baseView.w / zoom;
  const viewH = baseView.h / zoom;
  const viewOrigin = { x: baseView.x + (baseView.w - viewW) / 2 + pan.x, y: baseView.y + (baseView.h - viewH) / 2 + pan.y };
  const viewBox = `${viewOrigin.x} ${viewOrigin.y} ${viewW} ${viewH}`;
  const gridLines = useMemo(() => visibleGridLines(viewOrigin.x, viewOrigin.y, viewW, viewH, settings.gridSize), [viewOrigin.x, viewOrigin.y, viewW, viewH, settings.gridSize]);
  const handleWheel = (event: WheelEvent<SVGSVGElement>) => { event.preventDefault(); setZoom((value) => Math.min(18, Math.max(0.05, value * (event.deltaY > 0 ? 0.82 : 1.18)))); };
  const selectedHandles = selected && !selected.locked ? { width: localToWorld(selected, selected.width / 2 + 0.22, 0), depth: localToWorld(selected, 0, selected.depth / 2 + 0.22), corner: localToWorld(selected, selected.width / 2 + 0.2, selected.depth / 2 + 0.2), rotate: localToWorld(selected, 0, -selected.depth / 2 - 0.62) } : null;

  return <div className="plan-wrapper" onClick={(event) => event.stopPropagation()}>
    <svg ref={svgRef} className="plan-svg" viewBox={viewBox} onContextMenu={handlePlanContextMenu} onPointerMove={handlePointerMove} onPointerUp={() => { if (rectDraft) { const rect = rectFromDraft(rectDraft); if (rect.width > 0.15 && rect.depth > 0.15) createRectangleWalls({ x: rect.x, y: rect.y }, rect.width, rect.depth); setRectDraft(null); } if (drag?.kind === "marquee") { const minX = Math.min(drag.startPlan.x, drag.currentPlan.x); const minY = Math.min(drag.startPlan.y, drag.currentPlan.y); const maxX = Math.max(drag.startPlan.x, drag.currentPlan.x); const maxY = Math.max(drag.startPlan.y, drag.currentPlan.y); if (maxX - minX > 0.05 || maxY - minY > 0.05) { const ids = displayObjects.filter((o) => o.position.x >= minX && o.position.x <= maxX && o.position.y >= minY && o.position.y <= maxY).map((o) => o.id); if (ids.length > 0) selectObjects(ids); } } if (drag?.kind === "object" && dragLivePositions) { for (const [id, pos] of Object.entries(dragLivePositions)) { updateObject(id, { position: pos }); } setDragLivePositions(null); } setDrag(null); }} onPointerLeave={() => { setDragLivePositions(null); setDrag(null); setRectDraft(null); }} onPointerDown={handlePlanPointerDown} onWheel={handleWheel}>
      <defs>
        <filter id="planGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0.05" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <linearGradient id="planFloorGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={WD_TOKENS.floor} />
          <stop offset="55%" stopColor={WD_TOKENS.canvasDeck} />
          <stop offset="100%" stopColor={WD_TOKENS.canvas} />
        </linearGradient>
        <pattern id="planDots" width={settings.gridSize} height={settings.gridSize} patternUnits="userSpaceOnUse">
          <circle cx={settings.gridSize / 2} cy={settings.gridSize / 2} r={Math.max(0.008, settings.gridSize * 0.025)} fill={WD_TOKENS.grid} />
        </pattern>
      </defs>
      <rect x={viewOrigin.x} y={viewOrigin.y} width={viewW} height={viewH} className="plan-backdrop" />
      {boundary.length >= 3 ? <polygon points={polygonPoints(boundary)} className="plan-floor-surface" /> : null}
      <rect x={viewOrigin.x} y={viewOrigin.y} width={viewW} height={viewH} fill="url(#planDots)" className="plan-dot-field" />
      {gridLines.map((line, index) => <line key={index} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} className={line.major ? "grid-line major" : "grid-line"} />)}
      {boundary.length >= 3 ? <text x={(boundaryBounds.minX + boundaryBounds.maxX) / 2} y={boundaryBounds.minY - padding * 0.18} className="dimension-label top-dimension">{formatLength(boundaryBounds.maxX - boundaryBounds.minX, settings.unit)}</text> : null}
      {boundary.length >= 3 ? <text x={boundaryBounds.maxX + padding * 0.15} y={(boundaryBounds.minY + boundaryBounds.maxY) / 2} className="dimension-label side-dimension">{formatLength(boundaryBounds.maxY - boundaryBounds.minY, settings.unit)}</text> : null}
      {aisleGuides.map((guide) => { const center = polygonCenter(guide.points); return <g key={guide.id} className={guide.ok ? "aisle-guide" : "aisle-guide warning"}><polygon points={polygonPoints(guide.points)} /><text x={center.x} y={center.y} className="aisle-guide-label">{guide.clearWidth.toFixed(2)} m aisle</text></g>; })}
      {selected && settings.showClearances ? <polygon points={polygonPoints(objectCorners({ ...selected, width: selected.width + settings.minAisleWidth * 2, depth: selected.depth + settings.minAisleWidth * 2 }))} className="clearance-preview" /> : null}
      {selectedRowBounds ? <g className="row-group-halo"><rect x={selectedRowBounds.minX - 0.28} y={selectedRowBounds.minY - 0.28} width={selectedRowBounds.width + 0.56} height={selectedRowBounds.depth + 0.56} rx={0.14} /><text x={selectedRowBounds.minX} y={selectedRowBounds.minY - 0.52}>{selected?.row?.rowName} · {selectedRowBounds.count} racks</text></g> : null}
      {draftWallStart && wallPreview ? <g className="wall-draft-preview"><line x1={draftWallStart.x} y1={draftWallStart.y} x2={wallPreview.x} y2={wallPreview.y} /><circle cx={draftWallStart.x} cy={draftWallStart.y} r={0.09} /><circle cx={wallPreview.x} cy={wallPreview.y} r={0.09} /><text x={(draftWallStart.x + wallPreview.x) / 2} y={(draftWallStart.y + wallPreview.y) / 2 - 0.2}>{formatLength(Math.hypot(wallPreview.x - draftWallStart.x, wallPreview.y - draftWallStart.y), settings.unit, 2)}{wallSnapLabel ? ` · ${wallSnapLabel}` : ""}</text></g> : null}
      {rectDraft ? <g className="rectangle-draft-preview">{(() => { const rect = rectFromDraft(rectDraft); return <><rect x={rect.x} y={rect.y} width={rect.width} height={rect.depth} /><text x={rect.x + rect.width / 2} y={rect.y - 0.22}>{formatLength(rect.width, settings.unit, 2)} × {formatLength(rect.depth, settings.unit, 2)} · {rect.area.toFixed(1)} m²</text></>; })()}</g> : null}
      {drag?.kind === "marquee" ? (() => { const minX = Math.min(drag.startPlan.x, drag.currentPlan.x); const minY = Math.min(drag.startPlan.y, drag.currentPlan.y); const maxX = Math.max(drag.startPlan.x, drag.currentPlan.x); const maxY = Math.max(drag.startPlan.y, drag.currentPlan.y); return <rect x={minX} y={minY} width={maxX - minX} height={maxY - minY} className="selection-marquee" />; })() : null}
      {displayObjects.map((object) => { const livePos = dragLivePositions?.[object.id] ?? object.position; const displayObject = livePos !== object.position ? { ...object, position: livePos } : object; return <PlanObject key={object.id} object={displayObject} activeTool={activeTool} selectedIds={selectedIds} hoveredId={hoveredId} drag={drag} onEditObject={onEditObject} selectObject={selectObject} openObjectMenu={openObjectMenu} handleObjectPointerDown={handleObjectPointerDown} setHoveredId={setHoveredId} setHoverCard={setHoverCard} />; })}
      {selected && selectedHandles ? <g className="manipulation-layer"><line x1={selected.position.x} y1={selected.position.y} x2={selectedHandles.rotate.x} y2={selectedHandles.rotate.y} className="rotate-tether" /><circle cx={selectedHandles.rotate.x} cy={selectedHandles.rotate.y} r={0.17} className="manipulation-handle rotate" onPointerDown={(event) => beginRotate(event, selected)} /><rect x={selectedHandles.width.x - 0.15} y={selectedHandles.width.y - 0.15} width={0.3} height={0.3} rx={0.06} className="manipulation-handle resize" onPointerDown={(event) => beginResize(event, selected, "width")} /><rect x={selectedHandles.depth.x - 0.15} y={selectedHandles.depth.y - 0.15} width={0.3} height={0.3} rx={0.06} className="manipulation-handle resize" onPointerDown={(event) => beginResize(event, selected, "depth")} /><rect x={selectedHandles.corner.x - 0.17} y={selectedHandles.corner.y - 0.17} width={0.34} height={0.34} rx={0.07} className="manipulation-handle corner" onPointerDown={(event) => beginResize(event, selected, "corner")} /><text x={selectedHandles.rotate.x} y={selectedHandles.rotate.y - 0.32} className="handle-label">{angleLabel(selected.rotation)}</text></g> : null}
    </svg>
    <PlanMenus menu={menu} menuObject={menuObject} hoveredObject={hoveredObject} hoverCard={hoverCard} createFilter={createFilter} createCategory={createCategory} setCreateFilter={setCreateFilter} setCreateCategory={setCreateCategory} closeMenu={closeMenu} onEditObject={onEditObject} />
  </div>;
}

function PlanObject(props: { object: SceneObject; activeTool: string; selectedIds: string[]; hoveredId: string | null; drag: DragState | null; onEditObject?: () => void; selectObject: (id: string) => void; openObjectMenu: (event: PointerEvent<SVGGElement> | MouseEvent<SVGGElement>, object: SceneObject) => void; handleObjectPointerDown: (event: PointerEvent<SVGGElement>, object: SceneObject) => void; setHoveredId: (id: string | null) => void; setHoverCard: (card: { x: number; y: number; objectId: string } | null) => void; }) {
  const { object } = props;
  const corners = objectCorners(object);
  return <g className={objectClass(object, props.selectedIds, props.hoveredId)} onPointerDown={(event) => props.handleObjectPointerDown(event, object)} onContextMenu={(event) => props.openObjectMenu(event, object)} onDoubleClick={() => { props.selectObject(object.id); props.onEditObject?.(); }} onPointerEnter={(event) => { props.setHoveredId(object.id); props.setHoverCard({ x: event.clientX + 14, y: event.clientY + 14, objectId: object.id }); }} onPointerMove={(event) => { if (!props.drag) props.setHoverCard({ x: event.clientX + 14, y: event.clientY + 14, objectId: object.id }); }} onPointerLeave={() => { props.setHoveredId(null); props.setHoverCard(null); }} style={{ cursor: props.activeTool === "select" ? (object.locked ? "not-allowed" : "grab") : "crosshair", pointerEvents: props.activeTool === "select" ? "auto" : "none" }}>
    {object.type === "door" ? <g transform={`rotate(${(object.rotation * 180) / Math.PI} ${object.position.x} ${object.position.y})`}><rect x={object.position.x - object.width / 2} y={object.position.y - object.depth / 2} width={object.width} height={object.depth} className="door-cut" /><path d={`M ${object.position.x - object.width / 2} ${object.position.y} A ${object.width} ${object.width} 0 0 1 ${object.position.x + object.width / 2} ${object.position.y - object.width}`} className="door-swing-2d" /><line x1={object.position.x - object.width / 2} y1={object.position.y} x2={object.position.x + object.width / 2} y2={object.position.y} className="door-leaf-2d" /></g> : object.type === "window" ? <g transform={`rotate(${(object.rotation * 180) / Math.PI} ${object.position.x} ${object.position.y})`}><rect x={object.position.x - object.width / 2} y={object.position.y - object.depth / 2} width={object.width} height={object.depth} className="window-cut" /><line x1={object.position.x - object.width / 2} y1={object.position.y - object.depth * 0.35} x2={object.position.x + object.width / 2} y2={object.position.y - object.depth * 0.35} className="window-line-2d" /><line x1={object.position.x - object.width / 2} y1={object.position.y + object.depth * 0.35} x2={object.position.x + object.width / 2} y2={object.position.y + object.depth * 0.35} className="window-line-2d" /></g> : object.type === "euro-pallet" ? <PalletPlanSymbol object={object} /> : object.type === "stair" ? <StairPlanSymbol object={object} /> : <polygon points={polygonPoints(corners)} fill={object.color} filter="url(#planGlow)" />}
    <circle cx={object.position.x} cy={object.position.y} r={0.06} />
    <line x1={object.position.x} y1={object.position.y} x2={object.position.x + Math.cos(object.rotation) * object.width * 0.45} y2={object.position.y + Math.sin(object.rotation) * object.width * 0.45} className="object-direction" />
    <text x={object.position.x} y={object.position.y - 0.12} className="object-text">{objectLabel(object)}</text>
    <text x={object.position.x} y={object.position.y + 0.16} className="object-measure">{formatLength(object.width, "m", 1)} × {formatLength(object.depth, "m", 1)}</text>
  </g>;
}


function StairPlanSymbol({ object }: { object: SceneObject }) {
  const corners = objectCorners(object);
  const count = Math.min(12, Math.max(4, object.stair?.stepCount ?? 10));
  const lines = Array.from({ length: count }, (_, index) => {
    const y = -object.depth / 2 + ((index + 1) / (count + 1)) * object.depth;
    return { a: localToWorld(object, -object.width / 2, y), b: localToWorld(object, object.width / 2, y) };
  });
  const arrowA = localToWorld(object, 0, object.depth * 0.34);
  const arrowB = localToWorld(object, 0, -object.depth * 0.34);
  return <g className="stair-plan-symbol"><polygon points={polygonPoints(corners)} fill={object.color} filter="url(#planGlow)" />{lines.map((line, index) => <line key={index} x1={line.a.x} y1={line.a.y} x2={line.b.x} y2={line.b.y} className="stair-step-line" />)}<line x1={arrowA.x} y1={arrowA.y} x2={arrowB.x} y2={arrowB.y} className="stair-arrow-line" /></g>;
}
