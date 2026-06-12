import { create } from "zustand";
import type { ProjectData, SceneObject } from "../types";
import { defaultMeta, defaultRoom, defaultSettings, starterObjects } from "./defaults";
import type { StudioState } from "./studioTypes";
import { buildRackRowObjects, createDefaultObject, createRectangleWallObjects, createStraightWallFromPoints, snapPoint, uid } from "./objectFactory";
import { buildTemplateProject } from "./templates";
import { loadInitialProject, normalizeProject } from "./projectPersistence";

export const useStudioStore = create<StudioState>((set, get) => ({
  ...loadInitialProject(),

  selectedIds: [],
  selectedObject: () => get().objects.find((object) => object.id === get().selectedId) ?? null,
  selectObjects: (ids) => set({ selectedIds: ids, selectedId: ids[0] ?? null }),
  toggleObjectInSelection: (id) => set((state) => {
    const next = state.selectedIds.includes(id)
      ? state.selectedIds.filter((x) => x !== id)
      : [...state.selectedIds, id];
    return { selectedIds: next, selectedId: next[0] ?? null };
  }),
  deleteSelected: () => set((state) => {
    const ids = new Set(state.selectedIds);
    const objects = state.objects.filter((o) => !ids.has(o.id));
    return { objects, selectedIds: [], selectedId: objects[0]?.id ?? null };
  }),
  setProjectName: (name) => set({ projectName: name }),
  updateProjectMeta: (patch) => set((state) => ({ projectMeta: { ...state.projectMeta, ...patch } })),
  updateRoom: (patch) => set((state) => ({ room: { ...state.room, ...patch } })),
  updateSettings: (patch) => set((state) => ({ settings: { ...state.settings, ...patch } })),

  addLevel: (name, elevation) => set((state) => {
    const id = uid("level");
    const levelName = name || (Math.abs(elevation) < 0.001 ? "Ground Floor" : `Level ${state.settings.levels.length + 1}`);
    const level = { id, name: levelName, elevation: Math.max(0, elevation), visible: true };
    return { settings: { ...state.settings, levels: [...state.settings.levels, level], activeLevelId: id, activeElevation: level.elevation, levelViewMode: "stack", showOnlyActiveLevel: false } };
  }),
  setActiveLevel: (id) => set((state) => {
    const level = state.settings.levels.find((item) => item.id === id);
    return level ? { settings: { ...state.settings, activeLevelId: id, activeElevation: level.elevation } } : state;
  }),
  showLevelStackToIndex: (index) => set((state) => {
    const sorted = [...state.settings.levels].sort((a, b) => a.elevation - b.elevation);
    const clamped = Math.max(0, Math.min(index, sorted.length - 1));
    const top = sorted[clamped] ?? sorted[0];
    const visibleIds = new Set(sorted.slice(0, clamped + 1).map((level) => level.id));
    return {
      settings: {
        ...state.settings,
        levels: state.settings.levels.map((level) => ({ ...level, visible: visibleIds.has(level.id) })),
        activeLevelId: top.id,
        activeElevation: top.elevation,
        showOnlyActiveLevel: false,
        levelViewMode: "stack"
      },
      selectedId: state.objects.find((object) => object.id === state.selectedId && (object.elevation ?? 0) <= top.elevation + 0.001)?.id ?? null
    };
  }),
  toggleLevelVisibility: (id) => set((state) => ({
    settings: { ...state.settings, levels: state.settings.levels.map((level) => level.id === id ? { ...level, visible: !level.visible } : level) }
  })),
  deleteLevel: (id) => set((state) => {
    if (state.settings.levels.length <= 1) return state;
    const removed = state.settings.levels.find((level) => level.id === id);
    const levels = state.settings.levels.filter((level) => level.id !== id);
    const active = state.settings.activeLevelId === id ? levels[0] : levels.find((level) => level.id === state.settings.activeLevelId) ?? levels[0];
    return {
      settings: { ...state.settings, levels, activeLevelId: active.id, activeElevation: active.elevation },
      selectedId: removed && Math.abs((state.objects.find((object) => object.id === state.selectedId)?.elevation ?? 0) - removed.elevation) < 0.001 ? null : state.selectedId
    };
  }),
  duplicateWallsToLevel: (fromElevation, toElevation) => set((state) => {
    const walls = state.objects.filter((object) => object.type === "wall-segment" && Math.abs((object.elevation ?? 0) - fromElevation) < 0.001);
    const copies = walls.map((wall) => ({ ...wall, id: uid("wall"), name: `${wall.name} Copy`, elevation: toElevation, locked: false }));
    return { objects: [...state.objects, ...copies], selectedId: copies[0]?.id ?? state.selectedId };
  }),
  updateSpaceName: (id, name) => set((state) => ({ spaceNames: { ...state.spaceNames, [id]: name } })),
  selectObject: (id) => set({ selectedId: id, selectedIds: id ? [id] : [] }),
  setActiveTool: (tool) => set({ activeTool: tool, selectedId: tool === "select" ? get().selectedId : null, draftWallStart: tool === "draw-wall" ? get().draftWallStart : null }),

  startWallAt: (point) => set((state) => ({ draftWallStart: snapPoint(point, state.settings), activeTool: "draw-wall", selectedId: null })),

  finishWallAt: (point) => set((state) => {
    const end = snapPoint(point, state.settings);
    if (!state.draftWallStart) return { draftWallStart: end, activeTool: "draw-wall", selectedId: null };
    const length = Math.hypot(end.x - state.draftWallStart.x, end.y - state.draftWallStart.y);
    if (length < 0.02) return { draftWallStart: state.draftWallStart, activeTool: "draw-wall", selectedId: null };
    const wall = createStraightWallFromPoints(state.draftWallStart, end, state.objects.length + 1, state.room, state.settings);
    return { objects: [...state.objects, wall], selectedId: null, activeTool: "draw-wall", draftWallStart: end };
  }),

  createRectangleWalls: (origin, width = 4, depth = 3) => set((state) => {
    const walls = createRectangleWallObjects(snapPoint(origin, state.settings), width, depth, state.objects.length + 1, state.room, state.settings);
    return { objects: [...state.objects, ...walls], selectedId: walls[0]?.id ?? state.selectedId, activeTool: "select", draftWallStart: null };
  }),

  cancelWall: () => set({ activeTool: "select", draftWallStart: null }),

  addObject: (type, position) => set((state) => {
    const object = createDefaultObject(type, state.objects.length + 1, state.room, state.settings);
    const placedObject = position ? { ...object, position: snapPoint(position, state.settings) } : object;
    return { objects: [...state.objects, placedObject], selectedId: placedObject.id, activeTool: "select" };
  }),

  createRackRows: (config) => {
    const state = get();
    const { groupId, objects } = buildRackRowObjects(config, state.objects.length, state.settings.activeElevation);
    set({
      objects: [...state.objects, ...objects],
      selectedId: objects[0]?.id ?? state.selectedId,
      activeTool: "select",
      settings: { ...state.settings, minAisleWidth: Math.max(state.settings.minAisleWidth, config.aisleWidth) }
    });
    return groupId;
  },

  deleteRackRowGroup: (rowGroupId) => set((state) => {
    const objects = state.objects.filter((object) => object.row?.rowGroupId !== rowGroupId);
    const selectedDeleted = state.objects.find((object) => object.id === state.selectedId)?.row?.rowGroupId === rowGroupId;
    return { objects, selectedId: selectedDeleted ? objects[0]?.id ?? null : state.selectedId };
  }),

  duplicateRackRowGroup: (rowGroupId) => set((state) => {
    const originals = state.objects.filter((object) => object.row?.rowGroupId === rowGroupId);
    if (originals.length === 0) return state;
    const newGroupId = uid("row");
    const copies = originals.map((object) => ({
      ...object,
      id: uid("rack"),
      name: `${object.name} Copy`,
      position: { x: object.position.x + state.settings.gridSize * 4, y: object.position.y + state.settings.gridSize * 4 },
      locked: false,
      rack: object.rack ? { ...object.rack } : undefined,
      row: object.row ? { ...object.row, rowGroupId: newGroupId, rowName: `${object.row.rowName} Copy` } : undefined
    }));
    return { objects: [...state.objects, ...copies], selectedId: copies[0]?.id ?? state.selectedId };
  }),

  moveRackRowGroup: (rowGroupId, dx, dy) => set((state) => ({
    objects: state.objects.map((object) => object.row?.rowGroupId === rowGroupId && !object.locked
      ? { ...object, position: snapPoint({ x: object.position.x + dx, y: object.position.y + dy }, state.settings) }
      : object)
  })),

  updateObject: (id, patch) => set((state) => ({ objects: state.objects.map((object) => (object.id === id ? { ...object, ...patch } : object)) })),

  moveObject: (id, x, y) => set((state) => {
    const point = snapPoint({ x, y }, state.settings);
    return { objects: state.objects.map((object) => object.id === id && !object.locked ? { ...object, position: point } : object) };
  }),

  rotateObject: (id, deltaRadians) => set((state) => ({ objects: state.objects.map((object) => object.id === id && !object.locked ? { ...object, rotation: object.rotation + deltaRadians } : object) })),

  duplicateObject: (id) => set((state) => {
    const original = state.objects.find((object) => object.id === id);
    if (!original) return state;
    const copy: SceneObject = {
      ...original,
      id: uid(original.type),
      name: `${original.name} Copy`,
      position: { x: original.position.x + state.settings.gridSize * 2, y: original.position.y + state.settings.gridSize * 2 },
      locked: false,
      rack: original.rack ? { ...original.rack } : undefined,
      opening: original.opening ? { ...original.opening } : undefined,
      row: original.row ? { ...original.row, rowGroupId: uid("row"), rowName: `${original.row.rowName} Single Copy` } : undefined
    };
    return { objects: [...state.objects, copy], selectedId: copy.id };
  }),

  deleteObject: (id) => set((state) => {
    const objects = state.objects.filter((object) => object.id !== id);
    const nextId = state.selectedId === id ? null : state.selectedId;
    return { objects, selectedId: nextId, selectedIds: nextId ? [nextId] : [] };
  }),

  resetProject: () => set({
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
  }),

  exportProject: () => ({ version: 23, name: get().projectName, meta: get().projectMeta, room: get().room, objects: get().objects, settings: get().settings, spaceNames: get().spaceNames }),

  importProject: (project) => {
    const safe = normalizeProject(project);
    if (!safe) return;
    set({ projectName: safe.name, projectMeta: safe.meta ?? defaultMeta, room: safe.room, objects: safe.objects, settings: safe.settings, spaceNames: safe.spaceNames ?? {}, selectedId: safe.objects[0]?.id ?? null, selectedIds: [], activeTool: "select", draftWallStart: null });
  },

  applyTemplate: (templateId) => {
    const template = buildTemplateProject(templateId);
    if (template) set(template);
  }
}));
