import type { ObjectType, SceneObject, Vec2 } from "../types";
import { objectCorners, polygonBounds } from "../utils/geometry";

export type DragState =
  | { kind: "object"; objectId: string; offset: Vec2; startPositions: Record<string, Vec2> }
  | { kind: "resize"; objectId: string; axis: "width" | "depth" | "corner" }
  | { kind: "rotate"; objectId: string }
  | { kind: "pan"; startClient: Vec2; startPan: Vec2 }
  | { kind: "marquee"; startPlan: Vec2; currentPlan: Vec2 };

export type ContextMenu =
  | { kind: "object"; x: number; y: number; objectId: string }
  | { kind: "create"; x: number; y: number; point: Vec2 };

export const createChoices: Array<{ type: ObjectType; title: string; hint: string; category: "Warehouse" | "Room" | "Safety" }> = [
  { type: "pallet-rack", title: "Pallet rack", hint: "Parametric rack bay", category: "Warehouse" },
  { type: "storage-shelf", title: "Storage shelf", hint: "Adjustable shelf", category: "Warehouse" },
  { type: "euro-pallet", title: "Euro pallet", hint: "800 × 1200 × 144 mm", category: "Warehouse" },
  { type: "stair", title: "Adaptive stair", hint: "Level-to-level stair", category: "Warehouse" },
  { type: "door", title: "Door", hint: "Opening marker", category: "Room" },
  { type: "window", title: "Window", hint: "Window marker", category: "Room" },
  { type: "column", title: "Column", hint: "Obstacle / pillar", category: "Room" },
  { type: "no-go-zone", title: "No-go zone", hint: "Restricted area", category: "Safety" }
];

export const createCategories = ["All", "Warehouse", "Room", "Safety"] as const;

export function polygonPoints(points: Vec2[]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

export function objectClass(object: SceneObject, selectedIds: string[], hoveredId?: string | null) {
  const classes = ["plan-object", `type-${object.type}`];
  if (selectedIds.includes(object.id)) classes.push("selected");
  if (object.id === hoveredId) classes.push("hovered");
  if (object.locked) classes.push("locked");
  if (object.row) classes.push("generated-row-object");
  return classes.join(" ");
}

export function objectLabel(object: SceneObject) {
  if (object.type === "pallet-rack") return object.row ? `R${object.row.rowIndex + 1}-${object.row.rackIndex + 1}` : "Rack";
  if (object.type === "storage-shelf") return "Shelf";
  if (object.type === "euro-pallet") return "Pallet";
  if (object.type === "stair") return "Stair";
  if (object.type === "wall-segment") return "Wall";
  if (object.type === "door") return "Door";
  if (object.type === "window") return "Window";
  if (object.type === "column") return "Column";
  return "No-go";
}

export function gridExtent(points: Vec2[], roomWidth: number, roomDepth: number) {
  if (points.length === 0 && roomWidth <= 0 && roomDepth <= 0) {
    return { minX: -10, maxX: 10, minY: -7, maxY: 7 };
  }
  const bounds = polygonBounds(points);
  return {
    minX: Math.min(0, bounds.minX),
    maxX: Math.max(roomWidth, bounds.maxX),
    minY: Math.min(0, bounds.minY),
    maxY: Math.max(roomDepth, bounds.maxY)
  };
}

export function visibleGridLines(x: number, y: number, width: number, height: number, gridSize: number) {
  const step = Math.max(gridSize, 0.05);
  const majorStep = Math.max(1, step);
  const pad = Math.max(width, height) * 0.35;
  const minX = Math.floor((x - pad) / step) * step;
  const maxX = Math.ceil((x + width + pad) / step) * step;
  const minY = Math.floor((y - pad) / step) * step;
  const maxY = Math.ceil((y + height + pad) / step) * step;
  const lines: Array<{ x1: number; y1: number; x2: number; y2: number; major: boolean }> = [];
  for (let gx = minX; gx <= maxX + 0.0001; gx += step) {
    lines.push({ x1: gx, y1: minY, x2: gx, y2: maxY, major: Math.abs(gx / majorStep - Math.round(gx / majorStep)) < 0.001 });
  }
  for (let gy = minY; gy <= maxY + 0.0001; gy += step) {
    lines.push({ x1: minX, y1: gy, x2: maxX, y2: gy, major: Math.abs(gy / majorStep - Math.round(gy / majorStep)) < 0.001 });
  }
  return lines;
}

export function localToWorld(object: SceneObject, x: number, y: number): Vec2 {
  const cos = Math.cos(object.rotation);
  const sin = Math.sin(object.rotation);
  return { x: object.position.x + x * cos - y * sin, y: object.position.y + x * sin + y * cos };
}

export function worldToLocal(object: SceneObject, point: Vec2): Vec2 {
  const dx = point.x - object.position.x;
  const dy = point.y - object.position.y;
  const cos = Math.cos(object.rotation);
  const sin = Math.sin(object.rotation);
  return { x: dx * cos + dy * sin, y: -dx * sin + dy * cos };
}

export function snapValue(value: number, gridSize: number, snap: boolean) {
  const safe = Math.max(0.1, value);
  if (!snap) return Math.round(safe * 100) / 100;
  return Math.max(gridSize, Math.round(safe / gridSize) * gridSize);
}

export function angleLabel(radians: number) {
  const degrees = ((radians * 180) / Math.PI) % 360;
  return `${Math.round(degrees < 0 ? degrees + 360 : degrees)}°`;
}

export function rowBounds(objects: SceneObject[], rowGroupId: string) {
  const rowObjects = objects.filter((object) => object.row?.rowGroupId === rowGroupId);
  const points = rowObjects.flatMap((object) => objectCorners(object));
  if (points.length === 0) return null;
  const bounds = polygonBounds(points);
  return { ...bounds, width: bounds.maxX - bounds.minX, depth: bounds.maxY - bounds.minY, count: rowObjects.length };
}
