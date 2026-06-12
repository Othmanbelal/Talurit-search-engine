import type { LevelDefinition, SceneObject, StudioSettings } from "../types";

export const LEVEL_EPSILON = 0.001;

export function sameLevel(a = 0, b = 0) {
  return Math.abs(a - b) < LEVEL_EPSILON;
}

export function sortedLevels(settings: StudioSettings) {
  return [...settings.levels].sort((a, b) => a.elevation - b.elevation);
}

export function levelAt(settings: StudioSettings, elevation = 0) {
  return settings.levels.find((level) => sameLevel(level.elevation, elevation));
}

export function activeLevel(settings: StudioSettings): LevelDefinition {
  return settings.levels.find((level) => level.id === settings.activeLevelId)
    ?? settings.levels[0]
    ?? { id: "level-ground", name: "Ground", elevation: 0, visible: true };
}

export function visibleTopLevel(settings: StudioSettings) {
  const levels = sortedLevels(settings);
  const top = levels.reduce<LevelDefinition | null>((current, level) => level.visible ? level : current, null);
  return top ?? levels[0] ?? activeLevel(settings);
}

export function levelVisibilityLabel(settings: StudioSettings) {
  const levels = sortedLevels(settings);
  const visible = levels.filter((level) => level.visible).length;
  const top = visibleTopLevel(settings);
  if (settings.levelViewMode === "all") return `All ${levels.length} levels visible`;
  if (settings.levelViewMode === "current") return `Current only · ${activeLevel(settings).name}`;
  return `Showing up to ${top.name} · ${visible}/${levels.length}`;
}

export function isLevelVisible(settings: StudioSettings, elevation = 0) {
  const mode = settings.levelViewMode ?? (settings.showOnlyActiveLevel ? "current" : "stack");
  if (mode === "all") return true;
  const current = activeLevel(settings);
  if (mode === "current") return sameLevel(elevation, current.elevation);
  return levelAt(settings, elevation)?.visible ?? true;
}

export function visibleObjects(objects: SceneObject[], settings: StudioSettings) {
  return objects.filter((object) => isLevelVisible(settings, object.elevation ?? 0));
}

export function nextLevelName(levels: LevelDefinition[]) {
  if (levels.length === 0) return "Ground Floor";
  return `Level ${levels.length + 1}`;
}
