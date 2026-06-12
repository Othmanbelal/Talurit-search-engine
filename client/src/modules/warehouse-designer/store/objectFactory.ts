import type { RackRowConfig, Room, SceneObject, StudioSettings, Vec2 } from "../types";
import { roundToGrid } from "../utils/units";

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function snapPoint(point: Vec2, settings: StudioSettings): Vec2 {
  if (!settings.snapToGrid) return point;
  return {
    x: roundToGrid(point.x, settings.gridSize),
    y: roundToGrid(point.y, settings.gridSize)
  };
}


export function createStraightWallFromPoints(start: Vec2, rawEnd: Vec2, count: number, room: Room, settings: StudioSettings): SceneObject {
  const snappedStart = snapPoint(start, settings);
  const snappedEnd = snapPoint(rawEnd, settings);
  const dx = snappedEnd.x - snappedStart.x;
  const dy = snappedEnd.y - snappedStart.y;
  const length = Math.max(0.2, Math.hypot(dx, dy));
  return {
    id: uid("wall"),
    name: `Wall ${count}`,
    type: "wall-segment",
    position: { x: (snappedStart.x + snappedEnd.x) / 2, y: (snappedStart.y + snappedEnd.y) / 2 },
    elevation: settings.activeElevation ?? 0,
    rotation: Math.atan2(dy, dx),
    width: length,
    depth: room.wallThickness,
    height: room.height,
    color: "#f1eee7",
    locked: false
  };
}

export function createRectangleWallObjects(origin: Vec2, width: number, depth: number, count: number, room: Room, settings: StudioSettings): SceneObject[] {
  const w = Math.max(settings.gridSize * 2, width);
  const d = Math.max(settings.gridSize * 2, depth);
  const left = origin.x;
  const top = origin.y;
  const right = origin.x + w;
  const bottom = origin.y + d;
  const walls = [
    createStraightWallFromPoints({ x: left, y: top }, { x: right, y: top }, count, room, settings),
    createStraightWallFromPoints({ x: right, y: top }, { x: right, y: bottom }, count + 1, room, settings),
    createStraightWallFromPoints({ x: right, y: bottom }, { x: left, y: bottom }, count + 2, room, settings),
    createStraightWallFromPoints({ x: left, y: bottom }, { x: left, y: top }, count + 3, room, settings)
  ];
  return walls.map((wall, index) => ({ ...wall, name: `Rectangle Wall ${count + index}` }));
}

export function createDefaultRackMeta(levels = 4, maxLoadPerLevelKg = 800) {
  return {
    levels,
    uprightThickness: 0.08,
    beamThickness: 0.09,
    shelfBoardThickness: 0.06,
    maxLoadPerLevelKg
  };
}

function stairMetaForActiveLevel(settings?: StudioSettings) {
  const levels = settings?.levels ?? [];
  const activeElevation = settings?.activeElevation ?? 0;
  const next = levels
    .filter((level) => level.elevation > activeElevation + 0.01)
    .sort((a, b) => a.elevation - b.elevation)[0];
  const targetElevation = next?.elevation ?? activeElevation + 3;
  const height = Math.max(0.3, targetElevation - activeElevation);
  const stepCount = Math.max(3, Math.ceil(height / 0.18));
  return {
    fromLevelId: settings?.activeLevelId,
    toLevelId: next?.id,
    targetElevation,
    stepCount,
    rise: height / stepCount,
    run: 0.28
  };
}

export function createDefaultObject(type: SceneObject["type"], count: number, room: Room, settings?: StudioSettings): SceneObject {
  const elev = settings?.activeElevation ?? 0;
  if (type === "pallet-rack") {
    return {
      id: uid("rack"),
      name: `Pallet Rack ${count}`,
      type,
      position: { x: 2 + count * 0.35, y: 2 + count * 0.25 },
      elevation: elev,
      rotation: 0,
      width: 2.7,
      depth: 1.1,
      height: 4.2,
      color: "#d9a441",
      locked: false,
      rack: createDefaultRackMeta()
    };
  }

  if (type === "storage-shelf") {
    return {
      id: uid("shelf"),
      name: `Storage Shelf ${count}`,
      type,
      position: { x: 2 + count * 0.35, y: 1.5 + count * 0.2 },
      elevation: elev,
      rotation: 0,
      width: 1.5,
      depth: 0.5,
      height: 2,
      color: "#6ba6ff",
      locked: false,
      rack: {
        levels: 5,
        uprightThickness: 0.035,
        beamThickness: 0.04,
        shelfBoardThickness: 0.035,
        maxLoadPerLevelKg: 120
      }
    };
  }

  if (type === "euro-pallet") {
    return {
      id: uid("pallet"),
      name: `Euro Pallet ${count}`,
      type,
      position: { x: 2 + count * 0.25, y: 2 + count * 0.2 },
      elevation: elev,
      rotation: 0,
      width: 0.8,
      depth: 1.2,
      height: 0.144,
      color: "#c9955c",
      locked: false
    };
  }

  if (type === "stair") {
    const stair = stairMetaForActiveLevel(settings);
    const height = Math.max(0.3, stair.targetElevation - (settings?.activeElevation ?? 0));
    return {
      id: uid("stair"),
      name: `Level Stair ${count}`,
      type,
      position: { x: 2 + count * 0.25, y: 2 + count * 0.2 },
      elevation: settings?.activeElevation ?? 0,
      rotation: 0,
      width: 1.1,
      depth: Math.max(1.2, stair.stepCount * stair.run),
      height,
      color: "#d6a94a",
      locked: false,
      stair
    };
  }


  if (type === "column") {
    return {
      id: uid("column"),
      name: `Column ${count}`,
      type,
      position: { x: Math.min(4, room.width * 0.45), y: Math.min(3, room.depth * 0.45) },
      elevation: elev,
      rotation: 0,
      width: 0.45,
      depth: 0.45,
      height: room.height,
      color: "#9aa4b2",
      locked: false
    };
  }

  if (type === "wall-segment") {
    return {
      id: uid("wall"),
      name: `Interior Wall ${count}`,
      type,
      position: { x: room.width / 2, y: room.depth / 2 },
      elevation: elev,
      rotation: 0,
      width: 3,
      depth: room.wallThickness,
      height: room.height,
      color: "#516985",
      locked: false
    };
  }

  if (type === "door") {
    return {
      id: uid("door"),
      name: `Door ${count}`,
      type,
      position: { x: room.width / 2, y: Math.max(0.2, room.wallThickness / 2) },
      elevation: elev,
      rotation: 0,
      width: 0.9,
      depth: Math.max(room.wallThickness, 0.12),
      height: 2.1,
      color: "#63d297",
      locked: false,
      opening: { sillHeight: 0, swingDirection: "left" }
    };
  }

  if (type === "window") {
    return {
      id: uid("window"),
      name: `Window ${count}`,
      type,
      position: { x: room.width - Math.max(0.2, room.wallThickness / 2), y: room.depth / 2 },
      elevation: elev,
      rotation: Math.PI / 2,
      width: 1.4,
      depth: Math.max(room.wallThickness, 0.12),
      height: 1.1,
      color: "#7dd3fc",
      locked: false,
      opening: { sillHeight: 0.9, swingDirection: "sliding" }
    };
  }

  return {
    id: uid("zone"),
    name: `No-go Zone ${count}`,
    type,
    position: { x: 5, y: 2.2 },
    elevation: elev,
    rotation: 0,
    width: 2,
    depth: 1.2,
    height: 0.05,
    color: "#ef6461",
    locked: false
  };
}

export function buildRackRowObjects(config: RackRowConfig, existingCount: number, activeElevation = 0): { groupId: string; objects: SceneObject[] } {
  const groupId = uid("row");
  const objects: SceneObject[] = [];
  const rowStep = config.rackDepth + config.aisleWidth;
  const rackStep = config.rackWidth + config.rackGap;
  const rotation = config.orientation === "horizontal" ? 0 : Math.PI / 2;

  for (let rowIndex = 0; rowIndex < config.rows; rowIndex++) {
    for (let rackIndex = 0; rackIndex < config.racksPerRow; rackIndex++) {
      const horizontal = config.orientation === "horizontal";
      const x = horizontal ? config.startX + rackIndex * rackStep : config.startX + rowIndex * rowStep;
      const y = horizontal ? config.startY + rowIndex * rowStep : config.startY + rackIndex * rackStep;
      const displayRow = rowIndex + 1;
      const displayRack = rackIndex + 1;
      objects.push({
        id: uid("rack"),
        name: `${config.rowName} R${displayRow}-${displayRack}`,
        type: "pallet-rack",
        position: { x, y },
        elevation: activeElevation,
        rotation,
        width: config.rackWidth,
        depth: config.rackDepth,
        height: config.rackHeight,
        color: config.color,
        locked: false,
        rack: createDefaultRackMeta(config.levels, config.maxLoadPerLevelKg),
        row: {
          rowGroupId: groupId,
          rowName: config.rowName || `Rack Row ${existingCount + 1}`,
          rowIndex,
          rackIndex,
          totalRows: config.rows,
          racksPerRow: config.racksPerRow,
          orientation: config.orientation,
          aisleWidth: config.aisleWidth,
          rackGap: config.rackGap
        }
      });
    }
  }

  return { groupId, objects };
}
