import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Maximize2, X } from "lucide-react";
import type { LevelDefinition, SceneObject } from "../../modules/warehouse-designer/types";
import type { ShelfViewShelf, WarehouseLayout } from "../../types/warehouse";
import { useWarehouseShelfView } from "../../hooks/useWarehouseShelfView";
import { useWarehouseSceneObjects } from "../../hooks/useWarehouseSceneObjects";

const LEVEL_EPS = 0.001;

const Warehouse3DView = lazy(() =>
  import("./Warehouse3DView").then((m) => ({ default: m.Warehouse3DView }))
);

type Props = {
  onRackSelect?: (id: string) => void;
  reloadSignal?: number;
  warehouse: WarehouseLayout;
};

export function WarehouseViewerPanel({ onRackSelect, reloadSignal, warehouse }: Props) {
  const shelfView = useWarehouseShelfView(warehouse.id);
  const scene = useWarehouseSceneObjects(warehouse.id);
  const [expanded, setExpanded] = useState(false);

  // Extract levels from saved layoutData
  const levels = useMemo<LevelDefinition[]>(() => {
    const layout = warehouse.layoutData as Record<string, unknown>;
    const raw = (layout?.settings as { levels?: unknown } | undefined)?.levels;
    if (Array.isArray(raw) && raw.length > 0) return raw as LevelDefinition[];
    return [{ id: "level-ground", name: "Ground Floor", elevation: 0, visible: true }];
  }, [warehouse.layoutData]);

  const showLevelTabs = levels.length >= 2;
  const [selectedLevelId, setSelectedLevelId] = useState(levels[0]?.id ?? "level-ground");
  // Reset to ground floor if warehouse changes and new levels don't include current selection
  useEffect(() => {
    if (!levels.find((l) => l.id === selectedLevelId)) setSelectedLevelId(levels[0]?.id ?? "level-ground");
  }, [levels, selectedLevelId]);

  const sortedLevels = useMemo(() => [...levels].sort((a, b) => a.elevation - b.elevation), [levels]);
  const selectedLevel = sortedLevels.find((l) => l.id === selectedLevelId) ?? sortedLevels[0];
  const selectedElevation = selectedLevel?.elevation ?? 0;
  const levelIdx = sortedLevels.findIndex((l) => l.id === selectedLevelId);
  // Upper bound for pallet elevation: anything below the next level counts as this level
  const nextElevation = levelIdx < sortedLevels.length - 1 ? sortedLevels[levelIdx + 1].elevation : selectedElevation + 100;

  // Reload pallet positions and rack list when a rack layout is saved
  useEffect(() => {
    if (!reloadSignal) return;
    void shelfView.reload();
    void scene.load();
  }, [reloadSignal, shelfView.reload, scene.load]);

  const rackIds = useMemo(
    () => new Set(scene.sceneObjects.map((o) => o.externalObjectId)),
    [scene.sceneObjects],
  );

  const mergedLayout = useMemo(() => {
    const layout = warehouse.layoutData as Record<string, unknown>;
    const baseObjects = (layout?.objects as SceneObject[] | undefined) ?? [];
    if (!shelfView.data) return layout;
    const pallets = buildPalletObjects(shelfView.data.shelves, baseObjects);
    return { ...layout, objects: [...baseObjects, ...pallets] };
  }, [warehouse.layoutData, shelfView.data]);

  // Filter objects to the selected level for the 3D view
  const filteredLayout = useMemo(() => {
    if (!showLevelTabs) return mergedLayout;
    const all = (mergedLayout.objects as SceneObject[] | undefined) ?? [];
    const filtered = all.filter((obj) => {
      if (obj.type === "euro-pallet") {
        // Pallets sit above their rack; include them if they belong to this level's vertical range
        const elev = obj.elevation ?? 0;
        return elev >= selectedElevation - LEVEL_EPS && elev < nextElevation;
      }
      return Math.abs((obj.elevation ?? 0) - selectedElevation) < LEVEL_EPS;
    });
    return { ...mergedLayout, objects: filtered };
  }, [mergedLayout, showLevelTabs, selectedElevation, nextElevation]);

  const occupiedCount = shelfView.data?.shelves.reduce(
    (sum, shelf) => sum + shelf.slots.filter((s) => s.items.length > 0).length,
    0,
  ) ?? 0;

  const header = (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-slate-900/80 px-4 py-2.5 backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">3D view</span>
        <span className="text-sm font-semibold text-white">{warehouse.name}</span>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-slate-500">{occupiedCount} occupied slots</span>
        {onRackSelect ? <span className="text-[11px] text-accent/70">Click rack to configure</span> : null}
      </div>
      <button
        className="rounded border border-white/10 p-1.5 text-slate-400 hover:border-accent/50 hover:text-accent"
        onClick={() => setExpanded((e) => !e)}
        title={expanded ? "Exit fullscreen" : "Fullscreen"}
        type="button"
      >
        {expanded ? <X size={14} /> : <Maximize2 size={14} />}
      </button>
    </div>
  );

  const levelTabs = showLevelTabs ? (
    <div className="flex gap-1 border-b border-white/10 bg-slate-900/60 px-4 py-1.5">
      {sortedLevels.map((level) => (
        <button
          key={level.id}
          className={`rounded px-2.5 py-0.5 text-xs font-medium transition-colors ${
            level.id === selectedLevelId ? "bg-accent/20 text-accent" : "text-slate-500 hover:text-slate-300"
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

  const canvas3d = (
    <Suspense fallback={<div className="animate-pulse bg-white/[0.03]" style={{ height: expanded ? "calc(100vh - 52px)" : 520 }} />}>
      <Warehouse3DView
        height={expanded ? (typeof window !== "undefined" ? window.innerHeight - 52 : 760) : 520}
        layout={filteredLayout}
        onRackClick={onRackSelect}
        rackIds={rackIds}
      />
    </Suspense>
  );

  if (expanded) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col bg-[#060d18]">
        {header}
        {levelTabs}
        {canvas3d}
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-xl border border-white/10 bg-[#060d18]">
      {header}
      {levelTabs}
      {canvas3d}
    </section>
  );
}

/**
 * Compute synthetic euro-pallet SceneObjects for all occupied slots.
 * Uses each rack's saved position/rotation/dimensions to place pallets.
 */
function buildPalletObjects(shelves: ShelfViewShelf[], baseObjects: SceneObject[]): SceneObject[] {
  const pallets: SceneObject[] = [];

  const byObject = new Map<string, ShelfViewShelf[]>();
  for (const shelf of shelves) {
    if (shelf.shelfKind !== "rack_level" || !shelf.warehouseObject?.externalObjectId) continue;
    const oid = shelf.warehouseObject.externalObjectId;
    const list = byObject.get(oid) ?? [];
    list.push(shelf);
    byObject.set(oid, list);
  }

  for (const [extId, rackShelves] of byObject.entries()) {
    const rack = rackShelves[0].warehouseObject!;
    // Prefer the live SceneObject from layoutData — it's always in sync with the designer
    const base = baseObjects.find((o) => o.id === extId);
    const rackWidth = base?.width ?? rack.width ?? 2.4;
    const rackHeight = base?.height ?? rack.height ?? 4;
    const rackPosX = base?.position.x ?? rack.positionX ?? 0;
    const rackPosY = base?.position.y ?? rack.positionY ?? 0;
    const rackElevation = base?.elevation ?? rack.elevation ?? 0;
    const rackRotation = base?.rotation ?? rack.rotation ?? 0;
    const maxLevel = Math.max(...rackShelves.map((s) => s.levelNumber ?? 1));
    // Level N board sits at N/maxLevel * rackHeight (same as createRackMesh shelf board y)
    const levelSpacing = rackHeight / Math.max(maxLevel, 1);

    for (const shelf of rackShelves) {
      const levelNumber = shelf.levelNumber ?? 1;
      // Pallet sits on top of the shelf board: board y = levelNumber * levelSpacing
      const elevation = rackElevation + levelNumber * levelSpacing;

      // Divide shelf width equally: each slot owns rackWidth/totalSlots metres
      const totalSlots = Math.max(...shelf.slots.map((s) => s.slotIndex ?? 1), 1);
      const sectionWidth = rackWidth / totalSlots;
      const cos = Math.cos(rackRotation);
      const sin = Math.sin(rackRotation);

      for (const slot of shelf.slots) {
        if (slot.items.length === 0) continue;
        const slotIndex = slot.slotIndex ?? 1;
        // Centre of section i (1-based): left-edge + (i - 0.5) * sectionWidth
        const localX = -rackWidth / 2 + (slotIndex - 0.5) * sectionWidth;

        pallets.push({
          id: `pallet-${slot.id}`,
          name: slot.items.length === 1 ? slot.items[0].itemName : `${slot.items.length} items`,
          type: "euro-pallet",
          position: { x: rackPosX + localX * cos, y: rackPosY + localX * sin },
          elevation,
          rotation: rackRotation,
          width: sectionWidth - 0.04, // 4 cm gap between adjacent pallets
          depth: slot.palletDepth - 0.04,
          height: 0.15,
          color: "#f0a500",
          locked: true,
        });
      }
    }
  }

  return pallets;
}
