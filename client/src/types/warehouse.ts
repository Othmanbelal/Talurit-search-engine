export type WarehouseCounts = {
  assignments: number;
  groupLinks: number;
  objects: number;
  shelves: number;
  slots: number;
  tableLinks: number;
};

export type WarehouseSummary = {
  id: string;
  name: string;
  description?: string | null;
  version: number;
  isArchived: boolean;
  counts: WarehouseCounts;
  createdAt: string;
  updatedAt: string;
};

export type WarehouseLayout = WarehouseSummary & {
  layoutData: Record<string, unknown>;
  createdByUser?: { id: string; name: string; email: string } | null;
};

export type CreateWarehouseInput = {
  name: string;
  description?: string | null;
  layoutData?: Record<string, unknown>;
};

export type UpdateWarehouseInput = {
  name?: string;
  description?: string | null;
  isArchived?: boolean;
};

export type SaveWarehouseLayoutInput = {
  layoutData: Record<string, unknown>;
};

export type WarehouseArchiveMode = "active" | "archived" | "all";

export type WarehouseSlot = {
  id: string;
  warehouseId: string;
  shelfId: string;
  code: string;
  normalizedCode: string;
  compartment: string;
  slotIndex?: number | null;
  displayName?: string | null;
  sortOrder: number;
  isActive: boolean;
  maxAssignments: number;
  fackEnabled: boolean;
  fackCount?: number | null;
  capacity: number;
  usedCount: number;
  freeCount: number;
  palletWidth: number;
  palletDepth: number;
  locationAssigned: boolean;
  assignmentCount: number;
  assignedPlacement?: {
    locationCode?: string | null;
    compartment?: string | null;
  } | null;
  storageLocation?: { id: string; code: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type WarehouseShelf = {
  id: string;
  warehouseId: string;
  code: string;
  normalizedCode: string;
  shelfKind: string;
  levelNumber?: number | null;
  displayName?: string | null;
  sortOrder: number;
  storageLocation?: { id: string; code: string; displayName?: string | null } | null;
  warehouseObject?: { id: string; externalObjectId?: string | null; name: string; objectType: string } | null;
  counts: { assignments: number; slots: number };
  slots: WarehouseSlot[];
  createdAt: string;
  updatedAt: string;
};

export type GenerateWarehouseShelvesInput = {
  planNumber: number;
  sectionLetter: string;
  positionStart: number;
  positionEnd: number;
  compartmentStart: number;
  compartmentEnd: number;
  room?: string;
};

export type WarehouseSceneObject = {
  externalObjectId: string;
  name: string;
  objectType: string;
  positionX: number;
  positionY: number;
  elevation: number;
  rotation: number;
  width: number;
  depth: number;
  height: number;
  color?: string | null;
  locked: boolean;
  warehouseObjectId?: string | null;
  linkedShelfCount: number;
};

export type GenerateShelvesFromSceneObjectInput = GenerateWarehouseShelvesInput & {
  externalObjectId: string;
};

export type GenerateRackSlotsFromSceneObjectInput = {
  externalObjectId: string;
  shelfLevelCount: number;
  slotsPerShelf: number;
  planNumber: number;
  sectionLetter: string;
  locationStartPosition: number;
  compartment: string;
  palletWidth: number;
  palletDepth: number;
  room?: string;
};

export type RackSlotLayoutSlotInput = {
  slotIndex: number;
  code?: string | null;
  compartment?: string | null;
  displayName?: string | null;
};

export type RackSlotLayoutLevelInput = {
  levelNumber: number;
  slotCount: number;
  slots: RackSlotLayoutSlotInput[];
};

export type SaveRackSlotLayoutFromSceneObjectInput = {
  externalObjectId: string;
  shelfLevels: RackSlotLayoutLevelInput[];
  palletWidth: number;
  palletDepth: number;
  room?: string;
};

export type WarehouseGroupLink = {
  id: string;
  groupId: string;
  name: string;
  tableCount: number;
};

export type WarehouseTableLink = {
  id: string;
  tableId: string;
  name: string;
  groupId?: string | null;
};

export type WarehouseInventoryLinks = {
  groupLinks: WarehouseGroupLink[];
  tableLinks: WarehouseTableLink[];
};

export type AvailableInventoryGroup = { id: string; name: string };
export type AvailableInventoryTable = { id: string; name: string; groupId?: string | null };

export type AvailableInventory = {
  groups: AvailableInventoryGroup[];
  tables: AvailableInventoryTable[];
};

export type WarehouseSlotAssignment = {
  id: string;
  warehouseId: string;
  slotId: string;
  activeSlotKey?: string | null;
  containerType: "pallet" | "box";
  fackNumber?: string | null;
  assignedAt: string;
  slot: {
    id: string;
    code: string;
    compartment: string;
    displayName?: string | null;
    storageLocation?: { id: string; code: string } | null;
    shelfLabel: string;
  };
  stockBalance: {
    id: string;
    itemName: string;
    manufacturer?: string | null;
    articleNumber?: string | null;
    quantity: number;
    unit: string;
    location?: { id: string; code: string; displayName?: string | null } | null;
    compartment?: string | null;
    inventoryTable?: { id: string; name: string } | null;
  };
  assignedByUserId?: string | null;
  assignedByUserName?: string | null;
};

export type AssignableInventoryRow = {
  id: string;
  itemName: string;
  manufacturer?: string | null;
  articleNumber?: string | null;
  quantity: number;
  unit: string;
  locationCode?: string | null;
  compartment?: string | null;
  tableId?: string | null;
  tableName?: string | null;
  currentWarehousePlacement?: {
    assignmentId: string;
    warehouseId: string;
    warehouseName: string;
    slotId: string;
    slotIndex?: number | null;
  } | null;
};

export type WarehouseStockPlacement = {
  assignmentId: string;
  warehouseId: string;
  warehouseName: string;
  slotId: string;
  slotCode: string;
  slotCompartment: string;
  slotDisplayName?: string | null;
};

export type AssignSlotInput = {
  stockBalanceId: string;
  inventoryTableId?: string;
  containerType?: "pallet" | "box";
  notes?: string;
};

export type ShelfViewItem = {
  id: string;
  assignmentId: string;
  containerType: "pallet" | "box";
  itemName: string;
  imageUrl?: string | null;
  manufacturer?: string | null;
  quantity: number;
  unit: string;
  compartment?: string | null;
  locationCode?: string | null;
  tableId: string;
  tableName: string;
};

export type ShelfViewSlot = {
  id: string;
  code: string;
  displayName?: string | null;
  compartment?: string | null;
  slotIndex?: number | null;
  locationAssigned: boolean;
  palletWidth: number;
  palletDepth: number;
  items: ShelfViewItem[];
};

export type ShelfViewObject = {
  id: string;
  name: string;
  externalObjectId?: string | null;
  positionX: number;
  positionY: number;
  elevation: number;
  rotation: number;
  width: number;
  depth: number;
  height: number;
};

export type ShelfViewShelf = {
  id: string;
  code: string;
  displayName?: string | null;
  shelfKind: string;
  levelNumber?: number | null;
  warehouseObject?: ShelfViewObject | null;
  slots: ShelfViewSlot[];
};

export type ShelfView = {
  shelves: ShelfViewShelf[];
  linkedTableCount: number;
};

export type CreateWarehouseShelfInput = {
  code: string;
  displayName?: string | null;
  compartments?: string[];
};

export type UpdateWarehouseShelfInput = {
  code?: string;
  displayName?: string | null;
};

export type CreateWarehouseSlotInput = {
  compartment: string;
  displayName?: string | null;
};

export type UpdateWarehouseSlotInput = {
  compartment?: string;
  displayName?: string | null;
  isActive?: boolean;
  fackEnabled?: boolean;
  fackCount?: number | null;
};

export type ShelfFackInput = { enabled: boolean; count?: number };
