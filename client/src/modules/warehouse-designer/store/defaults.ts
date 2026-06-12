import type { ProjectMeta, Room, SceneObject, StudioSettings } from "../types";

export const defaultRoom: Room = {
  width: 0,
  depth: 0,
  height: 5,
  wallThickness: 0.12
};

export const defaultMeta: ProjectMeta = {
  customerName: "",
  siteName: "",
  preparedBy: "",
  revision: "A",
  notes: ""
};

export const defaultSettings: StudioSettings = {
  unit: "m",
  gridSize: 0.25,
  snapToGrid: true,
  showClearances: true,
  minAisleWidth: 1.2,
  showRoomVertices: false,
  showAisleGuides: true,
  palletPreset: "eur-1200x800",
  palletWidth: 1.2,
  palletDepth: 0.8,
  visualTheme: "midnight-gold",
  ambienceLevel: "calm",
  activeElevation: 0,
  activeLevelId: "level-ground",
  levels: [{ id: "level-ground", name: "Ground Floor", elevation: 0, visible: true }],
  showOnlyActiveLevel: false,
  levelViewMode: "stack",
  snapToEndpoints: true,
  snapToStraightAngles: true,
  snapToEqualWallLength: true
};

export const starterObjects: SceneObject[] = [];
