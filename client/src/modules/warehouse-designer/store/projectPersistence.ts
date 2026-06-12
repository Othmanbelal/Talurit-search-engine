import type { ProjectData } from "../types";
import type { InitialStudioState } from "./studioTypes";
import { defaultMeta, defaultRoom, defaultSettings, starterObjects } from "./defaults";

function normalizeSettings(settings: ProjectData["settings"] | undefined) {
  const merged = { ...defaultSettings, ...(settings ?? {}) };
  const levels = Array.isArray(merged.levels) && merged.levels.length
    ? merged.levels.map((level) => ({ ...level, elevation: level.elevation ?? 0, visible: level.visible !== false }))
    : defaultSettings.levels;
  const active = levels.find((level) => level.id === merged.activeLevelId) ?? levels[0];
  return {
    ...merged,
    levels,
    activeLevelId: active.id,
    activeElevation: active.elevation,
    showOnlyActiveLevel: Boolean(merged.showOnlyActiveLevel),
    levelViewMode: merged.levelViewMode ?? (merged.showOnlyActiveLevel ? "current" : "stack"),
    snapToEndpoints: merged.snapToEndpoints !== false,
    snapToStraightAngles: merged.snapToStraightAngles !== false,
    snapToEqualWallLength: merged.snapToEqualWallLength !== false
  };
}

export function normalizeProject(data: unknown): ProjectData | null {
  if (!data || typeof data !== "object") return null;
  const project = data as ProjectData;
  if (!project.room || !Array.isArray(project.objects)) return null;
  return {
    version: 23,
    name: project.name || "Imported Warehouse Project",
    meta: { ...defaultMeta, ...(project.meta ?? {}) },
    room: { ...defaultRoom, ...project.room },
    objects: project.objects.map((object) => ({
      ...object,
      elevation: object.elevation ?? 0,
      row: object.row ? { ...object.row } : undefined,
      stair: object.stair ? { ...object.stair } : undefined
    })),
    settings: normalizeSettings(project.settings),
    spaceNames: project.spaceNames ?? {}
  };
}

export function loadInitialProject(): InitialStudioState {
  return {
    projectName: "Untitled room layout",
    projectMeta: defaultMeta,
    room: defaultRoom,
    objects: starterObjects,
    settings: defaultSettings,
    selectedId: null,
    selectedIds: [],
    activeTool: "select",
    draftWallStart: null,
    spaceNames: {}
  };
}
