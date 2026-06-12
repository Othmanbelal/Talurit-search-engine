import { Maximize2, X } from "lucide-react";
import { useRef, useState } from "react";
import type { LevelDefinition, SceneObject } from "../../modules/warehouse-designer/types";
import type { WarehouseSceneObject } from "../../types/warehouse";

type Room = { width: number; depth: number; wallThickness?: number };
type VB = { x: number; y: number; w: number; h: number };

type Props = {
  layoutData: Record<string, unknown>;
  onRackSelect?: (id: string) => void;
  sceneObjects: WarehouseSceneObject[];
  selectedRackId: string | null;
  warehouseName?: string;
};

const DIM_OFFSET = 0.7;
const DIM_COLOR = "#3a6080";
const DIM_TEXT = "#4a7898";
const LEVEL_EPS = 0.001;

export function WarehousePlanView({ layoutData, onRackSelect, sceneObjects, selectedRackId, warehouseName }: Props) {
  const { room, objects, levels } = parseLayout(layoutData);
  const wt = room.wallThickness ?? 0.12;
  const linkedMap = new Map(sceneObjects.map((o) => [o.externalObjectId, o.linkedShelfCount]));

  // All wall-segments (used for bounding box regardless of active level)
  const wallSegs = objects.filter((o) => o.type === "wall-segment");
  const designObjects = objects.filter((o) => o.type !== "euro-pallet" && o.type !== "wall-segment");

  // Compute scene bounds from ALL wall-segments so the viewBox is stable across levels
  let minX = 0, minY = 0, maxX = room.width, maxY = room.depth;
  if (wallSegs.length >= 2) {
    minX = Infinity; minY = Infinity; maxX = -Infinity; maxY = -Infinity;
    for (const ws of wallSegs) {
      const c = Math.cos(ws.rotation), s = Math.sin(ws.rotation), hw = ws.width / 2;
      for (const sign of [-1, 1] as const) {
        const px = ws.position.x + sign * hw * c;
        const py = ws.position.y + sign * hw * s;
        if (px < minX) minX = px; if (px > maxX) maxX = px;
        if (py < minY) minY = py; if (py > maxY) maxY = py;
      }
    }
    // Grow by half wall-thickness so walls sit inside the dim lines
    minX -= wt / 2; minY -= wt / 2; maxX += wt / 2; maxY += wt / 2;
  }
  const sceneW = maxX - minX;
  const sceneD = maxY - minY;

  const pad = wt + DIM_OFFSET + 0.6;
  const initVB = (): VB => ({ x: minX - pad, y: minY - pad, w: sceneW + pad * 2, h: sceneD + pad * 2 });

  const [vb, setVb] = useState<VB>(initVB);
  const [fullscreen, setFullscreen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const vbRef = useRef(vb);
  vbRef.current = vb;
  const dragRef = useRef<{ mx: number; my: number; vbx: number; vby: number; vbw: number; vbh: number } | null>(null);

  // Level tabs: filter both walls and design objects to the selected level
  const showLevelTabs = levels.length >= 2;
  const [selectedLevelId, setSelectedLevelId] = useState(levels[0]?.id ?? "level-ground");
  const selectedLevel = levels.find((l) => l.id === selectedLevelId) ?? levels[0];
  const selectedElevation = selectedLevel?.elevation ?? 0;
  // Walls rendered for this level; bounding box still uses all wallSegs above
  const levelWallSegs = wallSegs.filter((o) => Math.abs((o.elevation ?? 0) - selectedElevation) < LEVEL_EPS);
  const showGhostOutline = levelWallSegs.length === 0 && wallSegs.length > 0;
  const visibleDesignObjects = designObjects.filter((o) => Math.abs((o.elevation ?? 0) - selectedElevation) < LEVEL_EPS);

  const dimY = maxY + DIM_OFFSET;
  const dimX = maxX + DIM_OFFSET;
  const tickH = 0.14;
  const arrowS = 0.18;

  function handleWheel(e: React.WheelEvent<SVGSVGElement>) {
    e.preventDefault();
    const v = vbRef.current;
    const factor = e.deltaY > 0 ? 1.15 : 1 / 1.15;
    const rect = svgRef.current!.getBoundingClientRect();
    const wx = ((e.clientX - rect.left) / rect.width) * v.w + v.x;
    const wy = ((e.clientY - rect.top) / rect.height) * v.h + v.y;
    setVb({ x: wx - (wx - v.x) * factor, y: wy - (wy - v.y) * factor, w: v.w * factor, h: v.h * factor });
  }

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if ((e.target as Element).closest("[data-rack]")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { mx: e.clientX, my: e.clientY, vbx: vb.x, vby: vb.y, vbw: vb.w, vbh: vb.h };
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const d = dragRef.current;
    if (!d) return;
    const rect = svgRef.current!.getBoundingClientRect();
    setVb((v) => ({
      ...v,
      x: d.vbx - (e.clientX - d.mx) * (d.vbw / rect.width),
      y: d.vby - (e.clientY - d.my) * (d.vbh / rect.height),
    }));
  }

  function handlePointerUp() { dragRef.current = null; }

  const svgNode = (
    <svg
      ref={svgRef}
      className="select-none touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: fullscreen ? "calc(100vh - 52px)" : 480, display: "block", cursor: "grab" }}
      viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
    >
      <defs>
        <pattern height={1} id="dots" patternUnits="userSpaceOnUse" width={1}>
          <circle cx={0.5} cy={0.5} fill="#2a4a6e" r={0.048} />
        </pattern>
        <filter height="300%" id="glow" width="300%" x="-100%" y="-100%">
          <feGaussianBlur in="SourceGraphic" result="blur" stdDeviation="0.16" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Floor background */}
      <rect fill="#0c1a2c" height={sceneD} width={sceneW} x={minX} y={minY} />
      <rect fill="url(#dots)" height={sceneD} width={sceneW} x={minX} y={minY} />

      {/* Ghost footprint: building outline visible on upper levels that have no own walls */}
      {showGhostOutline ? (
        <rect fill="none" height={sceneD} stroke="#2a4060" strokeDasharray="0.4 0.25" strokeWidth={0.04} width={sceneW} x={minX} y={minY} />
      ) : null}

      {/* Walls for the selected level only */}
      {levelWallSegs.map((ws) => (
        <rect
          key={ws.id}
          fill="#1e3a56"
          height={ws.depth ?? wt}
          stroke="#3a6090"
          strokeWidth={0.03}
          transform={`translate(${ws.position.x},${ws.position.y}) rotate(${ws.rotation * (180 / Math.PI)})`}
          width={ws.width}
          x={-ws.width / 2}
          y={-(ws.depth ?? wt) / 2}
        />
      ))}

      {/* Fallback: room rect when no wall-segments exist at all */}
      {wallSegs.length === 0 ? (
        <rect fill="none" height={sceneD} stroke="#3a6090" strokeWidth={0.055} width={sceneW} x={minX} y={minY} />
      ) : null}

      {/* WIDTH dimension line (below scene) */}
      <g fill={DIM_COLOR} stroke={DIM_COLOR} strokeWidth={0.03}>
        <line x1={minX} x2={minX} y1={maxY + 0.1} y2={dimY + tickH} />
        <line x1={maxX} x2={maxX} y1={maxY + 0.1} y2={dimY + tickH} />
        <line x1={minX} x2={maxX} y1={dimY} y2={dimY} />
        <line x1={minX} x2={minX} y1={dimY - tickH} y2={dimY + tickH} />
        <line x1={maxX} x2={maxX} y1={dimY - tickH} y2={dimY + tickH} />
        <polygon fill={DIM_COLOR} points={`${minX},${dimY} ${minX + arrowS},${dimY - arrowS * 0.4} ${minX + arrowS},${dimY + arrowS * 0.4}`} />
        <polygon fill={DIM_COLOR} points={`${maxX},${dimY} ${maxX - arrowS},${dimY - arrowS * 0.4} ${maxX - arrowS},${dimY + arrowS * 0.4}`} />
      </g>
      <text dominantBaseline="hanging" fill={DIM_TEXT} fontSize={0.3} fontWeight="600" textAnchor="middle" x={(minX + maxX) / 2} y={dimY + 0.1}>
        {sceneW.toFixed(1)} m
      </text>

      {/* DEPTH dimension line (right of scene) */}
      <g fill={DIM_COLOR} stroke={DIM_COLOR} strokeWidth={0.03}>
        <line x1={maxX + 0.1} x2={dimX + tickH} y1={minY} y2={minY} />
        <line x1={maxX + 0.1} x2={dimX + tickH} y1={maxY} y2={maxY} />
        <line x1={dimX} x2={dimX} y1={minY} y2={maxY} />
        <line x1={dimX - tickH} x2={dimX + tickH} y1={minY} y2={minY} />
        <line x1={dimX - tickH} x2={dimX + tickH} y1={maxY} y2={maxY} />
        <polygon fill={DIM_COLOR} points={`${dimX},${minY} ${dimX - arrowS * 0.4},${minY + arrowS} ${dimX + arrowS * 0.4},${minY + arrowS}`} />
        <polygon fill={DIM_COLOR} points={`${dimX},${maxY} ${dimX - arrowS * 0.4},${maxY - arrowS} ${dimX + arrowS * 0.4},${maxY - arrowS}`} />
      </g>
      <text
        dominantBaseline="middle"
        fill={DIM_TEXT}
        fontSize={0.3}
        fontWeight="600"
        textAnchor="middle"
        transform={`rotate(-90, ${dimX + 0.38}, ${(minY + maxY) / 2})`}
        x={dimX + 0.38}
        y={(minY + maxY) / 2}
      >
        {sceneD.toFixed(1)} m
      </text>

      {/* Objects on floor — filtered to selected level */}
      {visibleDesignObjects.map((obj) => {
        const isRack = obj.type === "pallet-rack" || obj.type === "storage-shelf";
        const isSelected = isRack && obj.id === selectedRackId;
        const isHovered = isRack && obj.id === hoveredId;
        const linked = linkedMap.get(obj.id) ?? 0;
        const rotDeg = obj.rotation * (180 / Math.PI);
        const fs = Math.max(0.13, Math.min(Math.min(obj.width, obj.depth) * 0.28, 0.44));
        return (
          <g
            data-rack={isRack ? obj.id : undefined}
            key={obj.id}
            onClick={isRack && onRackSelect ? () => onRackSelect(obj.id) : undefined}
            onPointerEnter={isRack ? () => setHoveredId(obj.id) : undefined}
            onPointerLeave={isRack ? () => setHoveredId(null) : undefined}
            style={{ cursor: isRack && onRackSelect ? "pointer" : "default" }}
            transform={`translate(${obj.position.x},${obj.position.y}) rotate(${rotDeg})`}
          >
            <rect
              fill={objFill(obj.type, isSelected, isHovered)}
              filter={isSelected ? "url(#glow)" : undefined}
              height={obj.depth}
              opacity={obj.type === "no-go-zone" ? 0.65 : 1}
              rx={isRack ? 0.08 : 0.04}
              stroke={objStroke(obj.type, isSelected, isHovered)}
              strokeWidth={isSelected ? 0.09 : isHovered ? 0.07 : 0.05}
              width={obj.width}
              x={-obj.width / 2}
              y={-obj.depth / 2}
            />
            {isRack ? (
              <>
                <line stroke={isSelected ? "rgba(251,191,36,0.4)" : "rgba(212,160,23,0.22)"} strokeWidth={0.025} x1={-obj.width / 2 + 0.1} x2={obj.width / 2 - 0.1} y1={0} y2={0} />
                <text dominantBaseline="middle" fill={isSelected ? "#fbbf24" : isHovered ? "#e0b020" : "#5a7a96"} fontSize={fs} fontWeight={isSelected || isHovered ? "600" : "400"} pointerEvents="none" textAnchor="middle" y={0}>
                  {linked > 0 ? `${linked} lvl` : "+"}
                </text>
              </>
            ) : null}
          </g>
        );
      })}

      {/* North indicator */}
      <g transform={`translate(${vb.x + 0.45}, ${vb.y + 0.55})`}>
        <circle cx={0} cy={0} fill="none" r={0.28} stroke="#2a4060" strokeWidth={0.03} />
        <polygon fill="#3a6090" points="0,-0.22 0.08,0.1 0,0.04 -0.08,0.1" />
        <text dominantBaseline="middle" fill="#4a7898" fontSize={0.18} fontWeight="700" textAnchor="middle" y={0.02}>N</text>
      </g>
    </svg>
  );

  const header = (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-slate-900/80 px-4 py-2.5 backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Floor plan</span>
        {warehouseName ? <span className="text-sm font-semibold text-white">{warehouseName}</span> : null}
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-slate-500">{sceneW.toFixed(1)} × {sceneD.toFixed(1)} m</span>
      </div>
      <div className="flex items-center gap-2">
        {onRackSelect ? <span className="text-[11px] text-accent/70">Click rack to configure</span> : null}
        <span className="hidden text-[11px] text-slate-600 sm:block">Scroll · Drag</span>
        <button className="rounded border border-white/10 px-2 py-0.5 text-[11px] text-slate-500 hover:text-white" onClick={() => setVb(initVB())} type="button">Reset</button>
        <button className="rounded border border-white/10 p-1.5 text-slate-400 hover:border-accent/50 hover:text-accent" onClick={() => setFullscreen((f) => !f)} title={fullscreen ? "Exit fullscreen" : "Fullscreen"} type="button">
          {fullscreen ? <X size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>
    </div>
  );

  const levelTabs = showLevelTabs ? (
    <div className="flex gap-1 border-b border-white/10 bg-slate-900/60 px-4 py-1.5">
      {[...levels].sort((a, b) => a.elevation - b.elevation).map((level) => (
        <button
          key={level.id}
          className={`rounded px-2.5 py-0.5 text-xs font-medium transition-colors ${
            level.id === selectedLevelId
              ? "bg-accent/20 text-accent"
              : "text-slate-500 hover:text-slate-300"
          }`}
          onClick={() => setSelectedLevelId(level.id)}
          type="button"
        >
          {level.name}
          {level.elevation > 0 ? <span className="ml-1 opacity-60">+{level.elevation.toFixed(1)}m</span> : null}
        </button>
      ))}
    </div>
  ) : null;

  if (fullscreen) {
    return <div className="fixed inset-0 z-[9999] flex flex-col bg-[#060d18]">{header}{levelTabs}{svgNode}</div>;
  }
  return <div className="overflow-hidden rounded-xl border border-white/10 bg-[#060d18]">{header}{levelTabs}{svgNode}</div>;
}

function objFill(type: string, selected: boolean, hovered: boolean) {
  if (selected) return "rgba(212,160,23,0.30)";
  if (hovered && (type === "pallet-rack" || type === "storage-shelf")) return "rgba(212,160,23,0.18)";
  switch (type) {
    case "pallet-rack": case "storage-shelf": return "rgba(212,160,23,0.10)";
    case "door": case "window": return "#0f2a4a";
    case "column": return "#1c3048";
    case "no-go-zone": return "rgba(220,38,38,0.25)";
    default: return "#0e1e30";
  }
}

function objStroke(type: string, selected: boolean, hovered: boolean) {
  if (selected) return "#fbbf24";
  if (hovered && (type === "pallet-rack" || type === "storage-shelf")) return "#e0b020";
  switch (type) {
    case "pallet-rack": case "storage-shelf": return "#9a7a18";
    case "door": case "window": return "#2060b0";
    case "column": return "#305070";
    case "no-go-zone": return "#dc2626";
    default: return "#1e3050";
  }
}

function parseLayout(layout: Record<string, unknown>): { room: Room; objects: SceneObject[]; levels: LevelDefinition[] } {
  const defaultLevels: LevelDefinition[] = [{ id: "level-ground", name: "Ground Floor", elevation: 0, visible: true }];
  if (layout && typeof layout === "object" && layout.room) {
    const p = layout as unknown as { room: Room; objects?: unknown; settings?: { levels?: unknown } };
    const rawLevels = p.settings?.levels;
    const levels = Array.isArray(rawLevels) && rawLevels.length > 0
      ? rawLevels as LevelDefinition[]
      : defaultLevels;
    return { room: p.room, objects: Array.isArray(p.objects) ? p.objects as SceneObject[] : [], levels };
  }
  return { room: { width: 0, depth: 0, wallThickness: 0.12 }, objects: [], levels: defaultLevels };
}
