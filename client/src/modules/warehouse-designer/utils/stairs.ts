import type { SceneObject, StudioSettings } from "../types";

export function resolveStairObject(object: SceneObject, settings: StudioSettings): SceneObject {
  if (object.type !== "stair") return object;
  const base = object.elevation ?? settings.activeElevation ?? 0;
  const targetFromId = object.stair?.toLevelId
    ? settings.levels.find((level) => level.id === object.stair?.toLevelId)?.elevation
    : undefined;
  const target = targetFromId ?? settings.levels
    .filter((level) => level.elevation > base + 0.05)
    .sort((left, right) => left.elevation - right.elevation)[0]?.elevation ?? base + Math.max(3, object.height);
  const height = Math.max(0.3, target - base);
  const run = Math.max(0.2, object.stair?.run ?? 0.28);
  const stepCount = Math.max(3, Math.ceil(height / 0.18));
  return {
    ...object,
    height,
    depth: Math.max(1.2, stepCount * run),
    stair: {
      ...object.stair,
      fromLevelId: object.stair?.fromLevelId,
      toLevelId: object.stair?.toLevelId,
      targetElevation: target,
      stepCount,
      rise: height / stepCount,
      run
    }
  };
}

export function resolveStairs(objects: SceneObject[], settings: StudioSettings): SceneObject[] {
  return objects.map((object) => resolveStairObject(object, settings));
}
