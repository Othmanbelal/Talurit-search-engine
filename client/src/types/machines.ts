import type { Machine, Tool } from "./tools";

export type MachineProductSummary = {
  productName: string;
  articleNumber: string | null;
  manufacturerName: string | null;
  toolCount: number;
  quantityTotal: number;
};

export type MachineInventoryTool = Tool;

export type MachineRecord = Machine & {
  _count?: {
    tools: number;
  };
};

export type MachineWithSlotCount = Machine & {
  inventoryCount: number;
};
