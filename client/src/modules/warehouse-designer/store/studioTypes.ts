import type { ActiveTool, ProjectData, ProjectMeta, RackRowConfig, Room, SceneObject, StudioSettings, Vec2 } from "../types";

export type StudioState = {
  projectName: string;
  projectMeta: ProjectMeta;
  room: Room;
  objects: SceneObject[];
  settings: StudioSettings;
  selectedId: string | null;
  activeTool: ActiveTool;
  draftWallStart: Vec2 | null;
  spaceNames: Record<string, string>;

  selectedIds: string[];
  selectedObject: () => SceneObject | null;
  selectObjects: (ids: string[]) => void;
  toggleObjectInSelection: (id: string) => void;
  deleteSelected: () => void;
  setProjectName: (name: string) => void;
  updateProjectMeta: (patch: Partial<ProjectMeta>) => void;
  updateRoom: (patch: Partial<Room>) => void;
  updateSettings: (patch: Partial<StudioSettings>) => void;
  addLevel: (name: string, elevation: number) => void;
  setActiveLevel: (id: string) => void;
  showLevelStackToIndex: (index: number) => void;
  toggleLevelVisibility: (id: string) => void;
  deleteLevel: (id: string) => void;
  duplicateWallsToLevel: (fromElevation: number, toElevation: number) => void;
  updateSpaceName: (id: string, name: string) => void;
  selectObject: (id: string | null) => void;
  setActiveTool: (tool: ActiveTool) => void;
  startWallAt: (point: Vec2) => void;
  finishWallAt: (point: Vec2) => void;
  createRectangleWalls: (origin: Vec2, width?: number, depth?: number) => void;
  cancelWall: () => void;
  addObject: (type: SceneObject["type"], position?: Vec2) => void;
  createRackRows: (config: RackRowConfig) => string;
  deleteRackRowGroup: (rowGroupId: string) => void;
  duplicateRackRowGroup: (rowGroupId: string) => void;
  moveRackRowGroup: (rowGroupId: string, dx: number, dy: number) => void;
  updateObject: (id: string, patch: Partial<SceneObject>) => void;
  moveObject: (id: string, x: number, y: number) => void;
  rotateObject: (id: string, deltaRadians: number) => void;
  duplicateObject: (id: string) => void;
  deleteObject: (id: string) => void;
  resetProject: () => void;
  exportProject: () => ProjectData;
  importProject: (project: ProjectData) => void;
  applyTemplate: (templateId: string) => void;
};

export type InitialStudioState = Pick<
  StudioState,
  "projectName" | "projectMeta" | "room" | "objects" | "settings" | "selectedId" | "selectedIds" | "activeTool" | "draftWallStart" | "spaceNames"
>;
