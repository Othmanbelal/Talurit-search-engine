export type Unit = "m" | "cm" | "mm";
export type ObjectType =
  | "pallet-rack"
  | "storage-shelf"
  | "euro-pallet"
  | "box"
  | "stair"
  | "column"
  | "no-go-zone"
  | "wall-segment"
  | "door"
  | "window";

export type ActiveTool = "select" | "draw-wall" | "rectangle-room";
export type RackRowOrientation = "horizontal" | "vertical";
export type PalletPreset = "eur-1200x800" | "us-48x40" | "custom";
export type VisualTheme = "midnight-gold" | "arctic-graphite" | "emerald-logistics" | "light-presentation";
export type LevelViewMode = "stack" | "current" | "all";

export type Vec2 = { x: number; y: number };

export type Room = {
  width: number;
  depth: number;
  height: number;
  wallThickness: number;
};

export type ProjectMeta = {
  customerName: string;
  siteName: string;
  preparedBy: string;
  revision: string;
  notes: string;
};

export type RackMeta = {
  levels: number;
  uprightThickness: number;
  beamThickness: number;
  shelfBoardThickness: number;
  maxLoadPerLevelKg: number;
};

export type OpeningMeta = {
  sillHeight: number;
  swingDirection?: "left" | "right" | "sliding";
};

export type StairMeta = {
  fromLevelId?: string;
  toLevelId?: string;
  rise: number;
  run: number;
  stepCount: number;
  targetElevation: number;
};

export type RackRowMeta = {
  rowGroupId: string;
  rowName: string;
  rowIndex: number;
  rackIndex: number;
  totalRows: number;
  racksPerRow: number;
  orientation: RackRowOrientation;
  aisleWidth: number;
  rackGap: number;
};

export type SceneObject = {
  id: string;
  name: string;
  type: ObjectType;
  position: Vec2;
  elevation?: number;
  rotation: number;
  width: number;
  depth: number;
  height: number;
  color: string;
  locked: boolean;
  rack?: RackMeta;
  opening?: OpeningMeta;
  stair?: StairMeta;
  row?: RackRowMeta;
};

export type LevelDefinition = {
  id: string;
  name: string;
  elevation: number;
  visible: boolean;
};

export type StudioSettings = {
  unit: Unit;
  gridSize: number;
  snapToGrid: boolean;
  showClearances: boolean;
  minAisleWidth: number;
  showRoomVertices: boolean;
  showAisleGuides: boolean;
  palletPreset: PalletPreset;
  palletWidth: number;
  palletDepth: number;
  visualTheme: VisualTheme;
  ambienceLevel: "calm" | "technical" | "presentation";
  activeElevation: number;
  activeLevelId: string;
  levels: LevelDefinition[];
  showOnlyActiveLevel: boolean;
  levelViewMode: LevelViewMode;
  snapToEndpoints: boolean;
  snapToStraightAngles: boolean;
  snapToEqualWallLength: boolean;
};

export type RackRowConfig = {
  rowName: string;
  rows: number;
  racksPerRow: number;
  startX: number;
  startY: number;
  orientation: RackRowOrientation;
  rackWidth: number;
  rackDepth: number;
  rackHeight: number;
  levels: number;
  rackGap: number;
  aisleWidth: number;
  color: string;
  maxLoadPerLevelKg: number;
};

export type ValidationIssue = {
  id: string;
  objectId?: string;
  severity: "info" | "warning" | "error";
  message: string;
};

export type SavedProjectSummary = {
  id: string;
  name: string;
  customerName: string;
  siteName: string;
  updatedAt: string;
  objectCount: number;
  rackCount: number;
};

export type ProjectData = {
  version: number;
  name: string;
  meta?: ProjectMeta;
  room: Room;
  objects: SceneObject[];
  settings: StudioSettings;
  spaceNames?: Record<string, string>;
};
