import type { SceneObject } from "../../modules/warehouse-designer/types";
import type { ShelfViewShelf } from "../../types/warehouse";

const GAP = 0.04; // gap between adjacent containers (metres)

/**
 * Build synthetic box/pallet SceneObjects for every assigned slot. A slot's
 * width is shared between its FACK items, each rendered as the container type
 * chosen at link time. Box size/offset vary deterministically by item id.
 */
export function buildContainerObjects(
  shelves: ShelfViewShelf[],
  baseObjects: SceneObject[],
  focusSlotId?: string | null,
): SceneObject[] {
  const containers: SceneObject[] = [];
  const byObject = groupByRack(shelves);

  for (const [extId, rackShelves] of byObject.entries()) {
    const rack = rackShelves[0].warehouseObject!;
    const base = baseObjects.find((o) => o.id === extId);
    const rackWidth = base?.width ?? rack.width ?? 2.4;
    const rackHeight = base?.height ?? rack.height ?? 4;
    const rackPosX = base?.position.x ?? rack.positionX ?? 0;
    const rackPosY = base?.position.y ?? rack.positionY ?? 0;
    const rackElevation = base?.elevation ?? rack.elevation ?? 0;
    const rackRotation = base?.rotation ?? rack.rotation ?? 0;
    const maxLevel = Math.max(...rackShelves.map((s) => s.levelNumber ?? 1));
    const levelSpacing = rackHeight / Math.max(maxLevel, 1);
    const cos = Math.cos(rackRotation);
    const sin = Math.sin(rackRotation);

    for (const shelf of rackShelves) {
      const elevation = rackElevation + (shelf.levelNumber ?? 1) * levelSpacing;
      const totalSlots = Math.max(...shelf.slots.map((s) => s.slotIndex ?? 1), 1);
      const sectionWidth = rackWidth / totalSlots;

      for (const slot of shelf.slots) {
        if (slot.items.length === 0) continue;
        const focused = slot.id === focusSlotId;
        const sectionCenter = -rackWidth / 2 + ((slot.slotIndex ?? 1) - 0.5) * sectionWidth;
        const subWidth = sectionWidth / slot.items.length;

        slot.items.forEach((item, index) => {
          const single = slot.items.length === 1;
          const localX = sectionCenter - sectionWidth / 2 + (index + 0.5) * subWidth;
          const id = single ? `pallet-${slot.id}` : `pallet-${slot.id}__${index}`;
          containers.push(
            item.containerType === "box"
              ? boxObject({ id, name: item.itemName, seed: item.id, localX, subWidth, depth: slot.palletDepth, elevation, focused, rackPosX, rackPosY, rackRotation, cos, sin })
              : palletObject({ id, name: item.itemName, localX, subWidth, depth: slot.palletDepth, elevation, focused, rackPosX, rackPosY, rackRotation, cos, sin }),
          );
        });
      }
    }
  }

  return containers;
}

type Placed = {
  id: string; name: string; localX: number; subWidth: number; depth: number;
  elevation: number; focused: boolean; rackPosX: number; rackPosY: number;
  rackRotation: number; cos: number; sin: number;
};

function palletObject(p: Placed): SceneObject {
  return baseObject(p, {
    type: "euro-pallet",
    width: p.subWidth - GAP,
    depth: p.depth - GAP,
    height: 0.15,
    color: p.focused ? "#22c55e" : "#f0a500",
    offsetX: 0,
  });
}

function boxObject(p: Placed & { seed: string }): SceneObject {
  const rng = seededUnit(p.seed);
  // Box fills 55–85% of its cell with slight height variety and a small offset.
  const widthFactor = 0.55 + rng() * 0.3;
  const depthFactor = 0.55 + rng() * 0.3;
  const width = (p.subWidth - GAP) * widthFactor;
  const offsetX = ((p.subWidth - GAP - width) / 2) * (rng() * 2 - 1);
  return baseObject(p, {
    type: "box",
    width,
    depth: (p.depth - GAP) * depthFactor,
    height: 0.2 + rng() * 0.18,
    color: p.focused ? "#22c55e" : "#b08a52",
    offsetX,
  });
}

function baseObject(p: Placed, opts: { type: string; width: number; depth: number; height: number; color: string; offsetX: number }): SceneObject {
  const x = p.localX + opts.offsetX;
  return {
    id: p.id,
    name: p.name,
    type: opts.type,
    position: { x: p.rackPosX + x * p.cos, y: p.rackPosY + x * p.sin },
    elevation: p.elevation,
    rotation: p.rackRotation,
    width: opts.width,
    depth: opts.depth,
    height: opts.height,
    color: opts.color,
    locked: true,
  } as SceneObject;
}

function groupByRack(shelves: ShelfViewShelf[]) {
  const byObject = new Map<string, ShelfViewShelf[]>();
  for (const shelf of shelves) {
    if (shelf.shelfKind !== "rack_level" || !shelf.warehouseObject?.externalObjectId) continue;
    const oid = shelf.warehouseObject.externalObjectId;
    const list = byObject.get(oid) ?? [];
    list.push(shelf);
    byObject.set(oid, list);
  }
  return byObject;
}

/** Deterministic PRNG seeded by a string, so a box looks identical across reloads. */
function seededUnit(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
