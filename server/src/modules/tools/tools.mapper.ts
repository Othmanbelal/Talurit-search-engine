import type { Prisma } from "@prisma/client";
import type { CreateToolInput, UpdateToolInput } from "./tools.schemas";
import type { ToolScalarField, ToolWithRelations } from "./tools.types";

export const writableToolFields: ToolScalarField[] = [
  "productName",
  "manufacturerId",
  "articleNumber",
  "alternativeArticleNumber",
  "grade",
  "mounting",
  "toolTypeId",
  "diameter",
  "cuttingLength",
  "cuttingSize",
  "holder",
  "holderSecondary",
  "overhang",
  "stockRaw",
  "quantity",
  "quantitySecondary",
  "countRaw",
  "priceRaw",
  "totalPriceRaw",
  "locationId",
  "machineId",
  "machineRaw",
  "notes",
  "status",
];

export function mapCreateToolInput(input: CreateToolInput) {
  return {
    productName: input.productName,
    ...copyDefinedFields(input),
    rawData: {},
  } satisfies Prisma.ToolUncheckedCreateInput;
}

export function mapUpdateToolInput(input: UpdateToolInput) {
  return copyDefinedFields(input) as Prisma.ToolUncheckedUpdateInput;
}

export function serializeToolValue(value: unknown) {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function getToolFieldValue(tool: ToolWithRelations, field: ToolScalarField) {
  return (tool as unknown as Record<ToolScalarField, unknown>)[field];
}

function copyDefinedFields(input: CreateToolInput | UpdateToolInput) {
  const output: Record<string, unknown> = {};

  for (const field of writableToolFields) {
    if (Object.prototype.hasOwnProperty.call(input, field)) {
      output[field] = input[field as keyof typeof input];
    }
  }

  return output;
}
