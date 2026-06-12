export type ToolStatus =
  | "AVAILABLE"
  | "LOW_STOCK"
  | "MISSING"
  | "DAMAGED"
  | "MAINTENANCE"
  | "ARCHIVED";

export type MetadataItem = {
  id: string;
  name: string;
  description?: string | null;
};

export type Location = {
  id: string;
  rawLabel?: string | null;
  shelf?: string | null;
  drawer?: string | null;
  compartment?: string | null;
  mapColumn?: number | null;
  mapRow?: number | null;
  sourceSheet?: string | null;
  description?: string | null;
  _count?: {
    tools: number;
  };
};

export type Machine = MetadataItem;

export type Tool = {
  id: string;
  productName: string;
  articleNumber?: string | null;
  alternativeArticleNumber?: string | null;
  cuttingLength?: string | null;
  cuttingSize?: string | null;
  diameter?: string | null;
  grade?: string | null;
  holder?: string | null;
  holderSecondary?: string | null;
  mounting?: string | null;
  overhang?: string | null;
  quantity?: number | null;
  quantitySecondary?: number | null;
  countRaw?: string | null;
  priceRaw?: string | null;
  stockRaw?: string | null;
  totalPriceRaw?: string | null;
  machineRaw?: string | null;
  notes?: string | null;
  sourceRowNumber?: number | null;
  sourceSheet?: string | null;
  status: ToolStatus;
  isArchived: boolean;
  updatedAt: string;
  manufacturer?: MetadataItem | null;
  toolType?: MetadataItem | null;
  location?: Location | null;
  machine?: Machine | null;
};

export type ToolListResponse = {
  items: Tool[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ToolFilters = {
  q: string;
  toolTypeId: string;
  manufacturerId: string;
  locationId: string;
  machineId: string;
  placement: "all" | "location" | "machine" | "unassigned";
  status: string;
  archived: "false" | "true" | "all";
  sortBy: "productName" | "articleNumber" | "manufacturer" | "quantity" | "updatedAt";
  sortDirection: "asc" | "desc";
  page: number;
  pageSize: number;
};

export type ToolPayload = {
  productName: string;
  articleNumber?: string | null;
  manufacturerId?: string | null;
  toolTypeId?: string | null;
  locationId?: string | null;
  machineId?: string | null;
  quantity?: number | null;
  status?: ToolStatus;
  notes?: string | null;
};

export type ToolPlacementPayload =
  | { placement: "machine"; machineId: string }
  | { placement: "location"; locationId: string }
  | {
      placement: "newLocation";
      rawLabel: string;
      compartment?: string | null;
      description?: string | null;
    }
  | { placement: "unassigned" };
