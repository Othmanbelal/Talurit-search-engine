import type { Room, SceneObject, Vec2 } from "../types";
import { activeWarehouseLoop } from "./roomDetection";

export function rectangularBoundary(room: Pick<Room, "width" | "depth">): Vec2[] {
  if (room.width <= 0 || room.depth <= 0) return [];
  return [
    { x: 0, y: 0 },
    { x: room.width, y: 0 },
    { x: room.width, y: room.depth },
    { x: 0, y: room.depth }
  ];
}

export function roomBoundary(room: Room): Vec2[] {
  return rectangularBoundary(room);
}

function key(point: Vec2) {
  return `${point.x.toFixed(3)},${point.y.toFixed(3)}`;
}

export function wallCenterlineEndpoints(wall: SceneObject): [Vec2, Vec2] {
  const half = wall.width / 2;
  const dx = Math.cos(wall.rotation) * half;
  const dy = Math.sin(wall.rotation) * half;
  return [
    { x: wall.position.x - dx, y: wall.position.y - dy },
    { x: wall.position.x + dx, y: wall.position.y + dy }
  ];
}

export function warehouseBoundaryFromWalls(objects: SceneObject[]): Vec2[] {
  const walls = objects.filter((object) => object.type === "wall-segment");
  if (walls.length < 3) return [];
  const edges = walls.map((wall) => wallCenterlineEndpoints(wall));
  const nodes = new Map<string, Vec2>();
  const graph = new Map<string, string[]>();
  edges.forEach(([a, b]) => {
    const ka = key(a); const kb = key(b);
    nodes.set(ka, a); nodes.set(kb, b);
    graph.set(ka, [...(graph.get(ka) ?? []), kb]);
    graph.set(kb, [...(graph.get(kb) ?? []), ka]);
  });
  if ([...graph.values()].some((links) => links.length !== 2)) return [];
  const start = [...graph.keys()][0];
  const loop: string[] = [start];
  let previous = "";
  let current = start;
  for (let i = 0; i < graph.size + 2; i++) {
    const next = (graph.get(current) ?? []).find((candidate) => candidate !== previous);
    if (!next) return [];
    if (next === start) return loop.length >= 3 ? loop.map((item) => nodes.get(item)!) : [];
    previous = current;
    current = next;
    if (loop.includes(current)) return [];
    loop.push(current);
  }
  return [];
}

export function activeWarehouseBoundary(room: Room, objects: SceneObject[] = []): Vec2[] {
  const loop = activeWarehouseLoop(objects);
  if (loop) return loop.points;
  return roomBoundary(room);
}

export function objectCorners(object: SceneObject): Vec2[] {
  const hw = object.width / 2;
  const hd = object.depth / 2;
  const local = [
    { x: -hw, y: -hd },
    { x: hw, y: -hd },
    { x: hw, y: hd },
    { x: -hw, y: hd }
  ];
  const cos = Math.cos(object.rotation);
  const sin = Math.sin(object.rotation);

  return local.map((point) => ({
    x: object.position.x + point.x * cos - point.y * sin,
    y: object.position.y + point.x * sin + point.y * cos
  }));
}

export function polygonCenter(points: Vec2[]): Vec2 {
  if (points.length === 0) return { x: 0, y: 0 };
  const sum = points.reduce((acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

export function polygonBounds(points: Vec2[]) {
  if (points.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  return points.reduce((bounds, point) => ({
    minX: Math.min(bounds.minX, point.x), maxX: Math.max(bounds.maxX, point.x),
    minY: Math.min(bounds.minY, point.y), maxY: Math.max(bounds.maxY, point.y)
  }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
}

export function pointInPolygon(point: Vec2, polygon: Vec2[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i]; const pj = polygon[j];
    if (pi.y > point.y !== pj.y > point.y && point.x < ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y || Number.EPSILON) + pi.x) inside = !inside;
  }
  return inside;
}

function projectPolygon(axis: Vec2, points: Vec2[]) {
  let min = Infinity; let max = -Infinity;
  for (const point of points) { const value = point.x * axis.x + point.y * axis.y; min = Math.min(min, value); max = Math.max(max, value); }
  return { min, max };
}

function polygonAxes(points: Vec2[]) {
  const axes: Vec2[] = [];
  for (let i = 0; i < points.length; i++) {
    const current = points[i]; const next = points[(i + 1) % points.length];
    const edge = { x: next.x - current.x, y: next.y - current.y };
    const normal = { x: -edge.y, y: edge.x };
    const length = Math.hypot(normal.x, normal.y) || 1;
    axes.push({ x: normal.x / length, y: normal.y / length });
  }
  return axes;
}

export function polygonsOverlap(a: Vec2[], b: Vec2[]) {
  const axes = [...polygonAxes(a), ...polygonAxes(b)];
  for (const axis of axes) {
    const pa = projectPolygon(axis, a); const pb = projectPolygon(axis, b);
    if (pa.max < pb.min || pb.max < pa.min) return false;
  }
  return true;
}

export function cornersInsideRoom(object: SceneObject, boundaryOrRoom: Room | Vec2[]) {
  const boundary = Array.isArray(boundaryOrRoom) ? boundaryOrRoom : roomBoundary(boundaryOrRoom);
  if (boundary.length < 3) return true;
  return objectCorners(object).every((corner) => pointInPolygon(corner, boundary));
}

export function distanceBetweenObjects(a: SceneObject, b: SceneObject) {
  const centerDistance = Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y);
  return Math.max(0, centerDistance - Math.hypot(a.width, a.depth) / 2 - Math.hypot(b.width, b.depth) / 2);
}
