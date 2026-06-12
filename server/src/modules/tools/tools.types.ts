import type { Prisma, Tool } from "@prisma/client";

export const toolInclude = {
  manufacturer: true,
  toolType: true,
  location: true,
  machine: true,
} satisfies Prisma.ToolInclude;

export type ToolWithRelations = Prisma.ToolGetPayload<{
  include: typeof toolInclude;
}>;

export type ToolScalarField = keyof Pick<
  Tool,
  | "productName"
  | "manufacturerId"
  | "articleNumber"
  | "alternativeArticleNumber"
  | "grade"
  | "mounting"
  | "toolTypeId"
  | "diameter"
  | "cuttingLength"
  | "cuttingSize"
  | "holder"
  | "holderSecondary"
  | "overhang"
  | "stockRaw"
  | "quantity"
  | "quantitySecondary"
  | "countRaw"
  | "priceRaw"
  | "totalPriceRaw"
  | "locationId"
  | "machineId"
  | "machineRaw"
  | "notes"
  | "status"
  | "isArchived"
>;

export type ToolHistoryEntry = {
  action: string;
  fieldName?: string;
  oldValue?: string | null;
  newValue?: string | null;
};
