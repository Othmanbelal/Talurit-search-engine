export type QrScanManager = {
  id: string;
  name: string;
  email: string;
  role: string;
  pictureUrl?: string | null;
  phoneNumber?: string | null;
  scope: "inventory_table" | "inventory_group" | "warehouse";
};

export type QrScanRow = {
  stockBalanceId: string;
  publicId: string;
  quantity: number;
  unit: string;
  compartment?: string | null;
  status: string;
  table: { id: string; name: string; groupId?: string | null; groupName?: string | null } | null;
  item: {
    id: string;
    name: string;
    qrCodeId: string;
    imageUrl?: string | null;
    qrCodeImageUrl?: string | null;
    articleNumber?: string | null;
    alternativeArticleNumber?: string | null;
    manufacturer?: string | null;
    category?: string | null;
    grade?: string | null;
    attributes: { name: string; rawValue?: string | null; numericValue?: number | null; unit?: string | null }[];
  };
  location?: { id: string; code: string; displayName?: string | null; room: string; locationType: string } | null;
  managers: QrScanManager[];
  warehousePlacements: {
    warehouseId: string;
    warehouseName: string;
    slotId: string;
    slotCode: string;
    slotName?: string | null;
    shelfId: string;
    shelfName: string;
  }[];
  usedIn: { cardId: string; cardName: string; spotName?: string | null; quantity: number }[];
};

export type QrScanResult = {
  matched: boolean;
  scannedCode: string;
  candidates: string[];
  rows: QrScanRow[];
};
