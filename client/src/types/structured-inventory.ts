export type CustomColumn = { key: string; name: string; label: string };
export type TableWidgets = { itemCount: boolean; balance: boolean };
export type TableColumnSettings = {
  visibleColumns: string[];
  customColumns: CustomColumn[];
  columnLabels: Record<string, string>;
  widgets: TableWidgets;
  allowedSearchAttributes?: string[] | null;
};

export type StructuredInventoryTableSummary = {
  id: string;
  groupId?: string | null;
  name: string;
  sourceSheetName?: string | null;
  tableType: string;
  columnSettings: TableColumnSettings;
  rowCount: number;
  createdAt: string;
  updatedAt: string;
};

export type StructuredInventoryGroup = {
  id: string;
  name: string;
  description?: string | null;
  tableCount: number;
  rowCount: number;
  tables: StructuredInventoryTableSummary[];
  createdAt: string;
  updatedAt: string;
};

export type StructuredInventoryTable = StructuredInventoryTableSummary & {
  group?: { id: string; name: string; description?: string | null } | null;
};

export type StructuredInventoryOverview = {
  groups: StructuredInventoryGroup[];
  ungroupedTables: StructuredInventoryTableSummary[];
};

export type CreateInventoryGroupInput = {
  name: string;
  description?: string | null;
};

export type CreateInventoryTableInput = {
  groupId?: string | null;
  name: string;
  tableType?: string;
};

export type AddStockRowInput = {
  itemName: string;
  manufacturerName?: string | null;
  categoryName?: string | null;
  articleNumber?: string | null;
  alternativeArticleNumber?: string | null;
  grade?: string | null;
  locationCode?: string | null;
  locationType: "stockroom_position" | "used_in" | "location_in";
  compartment?: string | null;
  quantity: number;
  unit: string;
  unitPrice?: number | null;
  currency: string;
  notes?: string | null;
  imageUrl?: string | null;
  qrCodeImageUrl?: string | null;
  attributes: ItemAttributeInput[];
};

export type ItemAttributeInput = {
  name: string;
  rawValue?: string | null;
  unit?: string | null;
};

export type StructuredStockRow = {
  id: string;
  publicId: string;
  compartment?: string | null;
  quantity: number;
  unit: string;
  unitPrice?: number | null;
  currency: string;
  totalValue?: number | null;
  status: "active" | "archived" | string;
  notes?: string | null;
  archivedAt?: string | null;
  usageTags: { cardId: string; cardName: string; quantity: number }[];
  item: {
    id: string;
    name: string;
    grade?: string | null;
    imageUrl?: string | null;
    qrCodeImageUrl?: string | null;
    articleNumber?: string | null;
    alternativeArticleNumber?: string | null;
    manufacturer?: string | null;
    category?: string | null;
    attributes: { name: string; rawValue?: string | null; numericValue?: number | null; unit?: string | null }[];
  };
  location?: { id: string; code: string; displayName?: string | null; locationType: string; room: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type StructuredStockRowsResponse = {
  items: StructuredStockRow[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  stats: { itemCount: number; differentItems: number; balance: number; currency: string; duplicateGroups: number; duplicateRows: number };
  filterOptions: StructuredTableFilterOptions;
};

export type AttributeFilter = {
  name: string;
  value: string;
};

export type StructuredTableFilters = {
  itemName?: string;
  manufacturerName?: string;
  categoryName?: string;
  attributeFilters?: AttributeFilter[];
};

export type StructuredTableFilterOptions = {
  itemNames: string[];
  manufacturers: string[];
  categories: string[];
  attributes: { name: string; label: string; values: string[] }[];
};

export type ColumnSettingsInput = TableColumnSettings;

export type UpdateStockRowInput = Partial<AddStockRowInput> & {
  status?: "active" | "archived";
};

export type StockMovementInput = {
  quantity: number;
  notes?: string | null;
};

export type UseInCardInput = StockMovementInput & {
  cardId: string;
  spotIds?: string[];
};

export type TakenStockItem = {
  id: string;
  quantity: number;
  notes?: string | null;
  createdAt: string;
  sourceTable: { id: string; name: string; columnSettings: TableColumnSettings };
  sourceRow: StructuredStockRow;
};

export type StructuredDuplicateGroup = {
  key: string;
  rows: StructuredStockRow[];
};

export type ItemInteractionLog = {
  id: string;
  action: string;
  itemName?: string | null;
  quantity?: string | null;
  notes?: string | null;
  userName?: string | null;
  userPictureUrl?: string | null;
  userId?: string | null;
  createdAt: string;
};
