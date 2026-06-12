import { ToolStatus } from "@prisma/client";
import { z } from "zod";

const nullableText = z.preprocess(
  (value) => {
    if (value === "") return null;
    return typeof value === "string" ? value.trim() : value;
  },
  z.string().min(1).max(500).nullable().optional(),
);

const requiredText = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.string().min(1).max(500),
);

const nullableId = z.preprocess(
  (value) => {
    if (value === "") return null;
    return typeof value === "string" ? value.trim() : value;
  },
  z.string().min(1).nullable().optional(),
);

const nullableQuantity = z.preprocess(
  (value) => (value === "" ? null : value),
  z.coerce.number().int().min(0).nullable().optional(),
);

export const createToolSchema = z.object({
  productName: requiredText,
  manufacturerId: nullableId,
  articleNumber: nullableText,
  alternativeArticleNumber: nullableText,
  grade: nullableText,
  mounting: nullableText,
  toolTypeId: nullableId,
  diameter: nullableText,
  cuttingLength: nullableText,
  cuttingSize: nullableText,
  holder: nullableText,
  holderSecondary: nullableText,
  overhang: nullableText,
  stockRaw: nullableText,
  quantity: nullableQuantity,
  quantitySecondary: nullableQuantity,
  countRaw: nullableText,
  priceRaw: nullableText,
  totalPriceRaw: nullableText,
  locationId: nullableId,
  machineId: nullableId,
  machineRaw: nullableText,
  notes: nullableText,
  status: z.nativeEnum(ToolStatus).optional(),
});

export const updateToolSchema = createToolSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field must be provided.",
);

export const listToolsQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  toolTypeId: z.string().trim().min(1).optional(),
  manufacturerId: z.string().trim().min(1).optional(),
  locationId: z.string().trim().min(1).optional(),
  machineId: z.string().trim().min(1).optional(),
  placement: z.enum(["all", "location", "machine", "unassigned"]).default("all"),
  status: z.nativeEnum(ToolStatus).optional(),
  archived: z.enum(["true", "false", "all"]).default("false"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  sortBy: z
    .enum(["productName", "articleNumber", "manufacturer", "quantity", "updatedAt"])
    .default("updatedAt"),
  sortDirection: z.enum(["asc", "desc"]).default("desc"),
});

export const toolIdParamSchema = z.object({
  id: z.string().min(1),
});

export const toolPlacementSchema = z.discriminatedUnion("placement", [
  z.object({
    placement: z.literal("machine"),
    machineId: z.string().trim().min(1),
  }),
  z.object({
    placement: z.literal("location"),
    locationId: z.string().trim().min(1),
  }),
  z.object({
    placement: z.literal("newLocation"),
    rawLabel: requiredText,
    compartment: nullableText,
    description: nullableText,
  }),
  z.object({
    placement: z.literal("unassigned"),
  }),
]);

export type CreateToolInput = z.infer<typeof createToolSchema>;
export type UpdateToolInput = z.infer<typeof updateToolSchema>;
export type ListToolsQuery = z.infer<typeof listToolsQuerySchema>;
export type ToolPlacementInput = z.infer<typeof toolPlacementSchema>;
