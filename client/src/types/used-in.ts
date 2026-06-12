import type { DynamicInventoryColumn, DynamicInventoryRow } from "./inventory";
import type { StructuredStockRow, TableColumnSettings } from "./structured-inventory";

export type UsedInCard = {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  spots: UsedInSpot[];
  _count?: {
    assignments: number;
    stockAssignments: number;
  };
};

export type UsedInSpot = {
  id: string;
  name: string;
  sortOrder: number;
  isOccupied?: boolean;
};

export type UsedInCardInput = {
  name: string;
  description?: string | null;
  spotNames?: string[];
};

export type UsedInCardUpdateInput = {
  name: string;
  description?: string | null;
  spots: { id?: string; name: string }[];
};

export type UsedInAssignment = {
  id: string;
  inventoryId: string;
  rowId: string;
  quantity?: number | null;
  notes?: string | null;
  row: DynamicInventoryRow;
};

export type UsedInGroup = {
  inventoryId: string;
  inventoryName: string;
  columns: DynamicInventoryColumn[];
  assignments: UsedInAssignment[];
};

export type UsedInCardDetails = UsedInCard & {
  groups: UsedInGroup[];
  structuredGroups: StructuredUsedInGroup[];
};

export type StructuredUsedInAssignment = {
  id: string;
  quantity: number;
  notes?: string | null;
  spot?: { id: string; name: string } | null;
  sourceRow: StructuredStockRow;
};

export type StructuredUsedInGroup = {
  tableId: string;
  tableName: string;
  columns: TableColumnSettings;
  assignments: StructuredUsedInAssignment[];
};
