import type { SceneObject, StudioSettings, Vec2 } from "../types";
import { wallCenterlineEndpoints } from "../utils/geometry";
import { roundToGrid } from "../utils/units";

const ENDPOINT_SNAP = 0.28;
const EQUAL_LENGTH_SNAP = 0.18;

export type RectDraft = { start: Vec2; current: Vec2 };
export type WallSnapInfo = { point: Vec2; label: string | null };

export function snapToGrid(point: Vec2, settings: StudioSettings): Vec2 {
  if (!settings.snapToGrid) return point;
  return { x: roundToGrid(point.x, settings.gridSize), y: roundToGrid(point.y, settings.gridSize) };
}

export function samePoint(a: Vec2, b: Vec2, tolerance = 0.001) {
  return Math.hypot(a.x - b.x, a.y - b.y) <= tolerance;
}

function isOnActiveLevel(wall: SceneObject, settings: StudioSettings) {
  return Math.abs((wall.elevation ?? 0) - (settings.activeElevation ?? 0)) < 0.001;
}

function activeWalls(objects: SceneObject[], settings: StudioSettings) {
  return objects.filter((object) => object.type === "wall-segment" && isOnActiveLevel(object, settings));
}

export function nearestWallEndpoint(point: Vec2, objects: SceneObject[], settings: StudioSettings, maxDistance = ENDPOINT_SNAP, ignore?: Vec2): Vec2 | null {
  if (settings.snapToEndpoints === false) return null;
  let bestPoint: Vec2 | null = null;
  let bestDistance = maxDistance;
  for (const wall of activeWalls(objects, settings)) {
    for (const endpoint of wallCenterlineEndpoints(wall)) {
      if (ignore && samePoint(endpoint, ignore)) continue;
      const distance = Math.hypot(endpoint.x - point.x, endpoint.y - point.y);
      if (distance <= bestDistance) { bestPoint = endpoint; bestDistance = distance; }
    }
  }
  return bestPoint;
}

function equalLengthPoint(start: Vec2, point: Vec2, objects: SceneObject[], settings: StudioSettings): WallSnapInfo | null {
  if (settings.snapToEqualWallLength === false) return null;
  const dx = point.x - start.x;
  const dy = point.y - start.y;
  const currentLength = Math.hypot(dx, dy);
  if (currentLength < 0.05) return null;
  const lengths = activeWalls(objects, settings).map((wall) => wall.width).filter((length) => length > 0.05);
  const match = lengths.find((length) => Math.abs(length - currentLength) <= EQUAL_LENGTH_SNAP);
  if (!match) return null;
  const scale = match / currentLength;
  return { point: { x: start.x + dx * scale, y: start.y + dy * scale }, label: `Equal length ${match.toFixed(2)} m` };
}

export function smartWallPointWithInfo(start: Vec2, raw: Vec2, objects: SceneObject[], settings: StudioSettings): WallSnapInfo {
  const endpoint = nearestWallEndpoint(raw, objects, settings, ENDPOINT_SNAP, start);
  if (endpoint) return { point: endpoint, label: "Endpoint snap" };
  let snapped = snapToGrid(raw, settings);
  const dx = snapped.x - start.x;
  const dy = snapped.y - start.y;
  if (settings.snapToStraightAngles !== false && Math.abs(dx) > 0.001 && Math.abs(dy) > 0.001) {
    if (Math.abs(dx) > Math.abs(dy) * 1.45) snapped = { x: snapped.x, y: start.y };
    if (Math.abs(dy) > Math.abs(dx) * 1.45) snapped = { x: start.x, y: snapped.y };
  }
  return equalLengthPoint(start, snapped, objects, settings) ?? { point: snapped, label: null };
}

export function smartWallPoint(start: Vec2, raw: Vec2, objects: SceneObject[], settings: StudioSettings): Vec2 {
  return smartWallPointWithInfo(start, raw, objects, settings).point;
}

export function snapsToWallEndpoint(start: Vec2, raw: Vec2, objects: SceneObject[], settings: StudioSettings) {
  return nearestWallEndpoint(raw, objects, settings, ENDPOINT_SNAP, start);
}

export function rectFromDraft(draft: RectDraft) {
  const x = Math.min(draft.start.x, draft.current.x);
  const y = Math.min(draft.start.y, draft.current.y);
  const width = Math.abs(draft.current.x - draft.start.x);
  const depth = Math.abs(draft.current.y - draft.start.y);
  return { x, y, width, depth, area: width * depth };
}
