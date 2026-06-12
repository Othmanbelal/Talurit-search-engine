import type { SceneObject, Vec2 } from "../types";

export type DetectedRoomLoop = {
  id: string;
  type: "warehouse" | "internal-room";
  points: Vec2[];
  wallIds: string[];
  name: string;
  area: number;
  perimeter: number;
  elevation: number;
  levelIndex: number;
  levelName: string;
  floorThickness: number;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  synthetic?: boolean; // true when derived from bounding box (T-junction fallback)
};

type RawLoop = Omit<DetectedRoomLoop, "id" | "type" | "name" | "levelIndex" | "levelName" | "floorThickness">;

const key = (point: Vec2) => `${point.x.toFixed(3)},${point.y.toFixed(3)}`;
const edgeKey = (a: string, b: string) => [a, b].sort().join("|");
export const elevationKey = (value = 0) => value.toFixed(3);

function wallEndpoints(wall: SceneObject): [Vec2, Vec2] {
  const half = wall.width / 2;
  const dx = Math.cos(wall.rotation) * half;
  const dy = Math.sin(wall.rotation) * half;
  return [
    { x: wall.position.x - dx, y: wall.position.y - dy },
    { x: wall.position.x + dx, y: wall.position.y + dy }
  ];
}


function orient(a: Vec2, b: Vec2, c: Vec2) {
  return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}

function between(a: number, b: number, c: number) {
  return Math.min(a, b) - 0.001 <= c && c <= Math.max(a, b) + 0.001;
}

function pointsEqual(a: Vec2, b: Vec2) {
  return Math.hypot(a.x - b.x, a.y - b.y) < 0.001;
}

function segmentIntersects(a: Vec2, b: Vec2, c: Vec2, d: Vec2) {
  if (pointsEqual(a, c) || pointsEqual(a, d) || pointsEqual(b, c) || pointsEqual(b, d)) return false;
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  if (Math.abs(o1) < 0.001 && between(a.x, b.x, c.x) && between(a.y, b.y, c.y)) return true;
  if (Math.abs(o2) < 0.001 && between(a.x, b.x, d.x) && between(a.y, b.y, d.y)) return true;
  if (Math.abs(o3) < 0.001 && between(c.x, d.x, a.x) && between(c.y, d.y, a.y)) return true;
  if (Math.abs(o4) < 0.001 && between(c.x, d.x, b.x) && between(c.y, d.y, b.y)) return true;
  return (o1 > 0) !== (o2 > 0) && (o3 > 0) !== (o4 > 0);
}

function polygonIsSimple(points: Vec2[]) {
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    for (let j = i + 1; j < points.length; j++) {
      if (Math.abs(i - j) <= 1 || (i === 0 && j === points.length - 1)) continue;
      const c = points[j];
      const d = points[(j + 1) % points.length];
      if (segmentIntersects(a, b, c, d)) return false;
    }
  }
  return true;
}

export function overlappingWallPairs(walls: SceneObject[]) {
  const pairs: Array<[SceneObject, SceneObject]> = [];
  for (let i = 0; i < walls.length; i++) {
    const [a1, a2] = wallEndpoints(walls[i]);
    for (let j = i + 1; j < walls.length; j++) {
      if (Math.abs((walls[i].elevation ?? 0) - (walls[j].elevation ?? 0)) > 0.001) continue;
      const [b1, b2] = wallEndpoints(walls[j]);
      if (segmentIntersects(a1, a2, b1, b2)) pairs.push([walls[i], walls[j]]);
    }
  }
  return pairs;
}

function bounds(points: Vec2[]) {
  return points.reduce((b, p) => ({
    minX: Math.min(b.minX, p.x), maxX: Math.max(b.maxX, p.x),
    minY: Math.min(b.minY, p.y), maxY: Math.max(b.maxY, p.y)
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
}

export function polygonArea(points: Vec2[]) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

function perimeter(points: Vec2[]) {
  return points.reduce((total, point, index) => {
    const next = points[(index + 1) % points.length];
    return total + Math.hypot(next.x - point.x, next.y - point.y);
  }, 0);
}

function loopsForWalls(walls: SceneObject[], elevation: number): RawLoop[] {
  const nodes = new Map<string, Vec2>();
  const graph = new Map<string, Array<{ node: string; wallId: string }>>();
  const edges = walls.map((wall) => {
    const [a, b] = wallEndpoints(wall);
    const ka = key(a);
    const kb = key(b);
    nodes.set(ka, a); nodes.set(kb, b);
    graph.set(ka, [...(graph.get(ka) ?? []), { node: kb, wallId: wall.id }]);
    graph.set(kb, [...(graph.get(kb) ?? []), { node: ka, wallId: wall.id }]);
    return { a: ka, b: kb };
  });

  const visited = new Set<string>();
  const loops: RawLoop[] = [];
  for (const edge of edges) {
    if (visited.has(edgeKey(edge.a, edge.b))) continue;
    const start = edge.a;
    let previous = "";
    let current = edge.a;
    const path: string[] = [];
    const wallIds: string[] = [];

    for (let guard = 0; guard <= walls.length + 2; guard++) {
      path.push(current);
      const links = graph.get(current) ?? [];
      if (links.length !== 2) break;
      const next = links.find((link) => link.node !== previous) ?? links[0];
      visited.add(edgeKey(current, next.node));
      wallIds.push(next.wallId);
      previous = current;
      current = next.node;
      if (current === start) {
        const points = path.map((node) => nodes.get(node)!).filter(Boolean);
        const area = polygonArea(points);
        if (points.length >= 3 && area > 0.02 && polygonIsSimple(points)) loops.push({ points, wallIds: [...new Set(wallIds)], area, perimeter: perimeter(points), bounds: bounds(points), elevation });
        break;
      }
      if (path.includes(current)) break;
    }
  }
  return loops;
}

function levelName(elevation: number, index: number) {
  if (Math.abs(elevation) < 0.001) return "Ground level";
  return `Level ${index + 1} · Z ${elevation.toFixed(2)} m`;
}

function classifyLevelLoops(levelLoops: RawLoop[], levelIndex: number, spaceNames: Record<string, string>, synthetic = false) {
  let roomNumber = 0;
  return levelLoops.sort((a, b) => b.area - a.area).map((loop, index): DetectedRoomLoop => {
    const level = elevationKey(loop.elevation);
    const type = index === 0 ? "warehouse" : "internal-room";
    const id = type === "warehouse" ? `warehouse-${level}` : `room-${level}-${++roomNumber}`;
    const fallbackName = type === "warehouse" ? `Warehouse ${String(levelIndex + 1).padStart(2, "0")}` : `Room ${String(roomNumber).padStart(2, "0")}`;
    return { ...loop, id, type, levelIndex, levelName: levelName(loop.elevation, levelIndex), floorThickness: 0.16, name: spaceNames[id] || fallbackName, synthetic };
  });
}

export function detectRoomLoops(objects: SceneObject[], spaceNames: Record<string, string> = {}): DetectedRoomLoop[] {
  const wallsByElevation = new Map<string, SceneObject[]>();
  objects.filter((object) => object.type === "wall-segment").forEach((wall) => {
    const keyValue = elevationKey(wall.elevation ?? 0);
    wallsByElevation.set(keyValue, [...(wallsByElevation.get(keyValue) ?? []), wall]);
  });

  return [...wallsByElevation.entries()]
    .sort(([a], [b]) => Number(a) - Number(b))
    .flatMap(([level, walls], levelIndex) => {
      const unsafe = overlappingWallPairs(walls).length > 0;
      const raw = !unsafe && walls.length >= 3 ? loopsForWalls(walls, Number(level)) : [];
      const unique = new Map<string, RawLoop>();
      raw.forEach((loop) => unique.set(`${elevationKey(loop.elevation)}:${loop.points.map(key).sort().join(";")}`, loop));

      // Fallback: when T-junctions or open walls prevent loop detection, derive a
      // bounding-box synthetic "warehouse" loop so the label is still rendered.
      if (unique.size === 0 && walls.length >= 2) {
        const allPoints = walls.flatMap((w) => wallEndpoints(w));
        const b = bounds(allPoints);
        const bw = b.maxX - b.minX;
        const bd = b.maxY - b.minY;
        const area = bw * bd;
        if (area > 0.1) {
          const bbox: Vec2[] = [
            { x: b.minX, y: b.minY }, { x: b.maxX, y: b.minY },
            { x: b.maxX, y: b.maxY }, { x: b.minX, y: b.maxY },
          ];
          unique.set(`bbox-${level}`, {
            points: bbox, wallIds: walls.map((w) => w.id),
            area, perimeter: 2 * (bw + bd), bounds: b, elevation: Number(level),
          });
        }
      }

      const synthetic = raw.length === 0 && unique.size > 0;
      return classifyLevelLoops([...unique.values()], levelIndex, spaceNames, synthetic);
    });
}

export function activeWarehouseLoop(objects: SceneObject[]) {
  return detectRoomLoops(objects).find((loop) => loop.type === "warehouse") ?? null;
}
