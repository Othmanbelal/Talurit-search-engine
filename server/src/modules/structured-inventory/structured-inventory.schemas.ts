import { z } from "zod";

export const idParamSchema = z.object({
  id: z.string().min(1),
});

const attributeFilterQuerySchema = z.object({
  name: z.string().trim().min(1),
  value: z.string().trim().min(1),
});

export const listStockRowsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().trim().optional(),
  itemName: z.string().trim().optional(),
  manufacturerName: z.string().trim().optional(),
  categoryName: z.string().trim().optional(),
  attributeFilters: z.string().optional().transform((value, context) => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value) as unknown;
      const result = z.array(attributeFilterQuerySchema).max(20).safeParse(parsed);
      if (result.success) return result.data;
    } catch {
      // A malformed JSON query should fail validation instead of being ignored.
    }
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid attribute filters." });
    return z.NEVER;
  }),
  archived: z.enum(["active", "archived", "all"]).default("active"),
});

export const createInventoryGroupSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().nullable().optional(),
});

export const createInventoryTableSchema = z.object({
  groupId: z.string().trim().min(1).nullable().optional(),
  name: z.string().trim().min(1),
  tableType: z.string().trim().min(1).default("manual_inventory"),
});

const itemAttributeInputSchema = z.object({
  name: z.string().trim().min(1),
  rawValue: z.string().trim().nullable().optional(),
  unit: z.string().trim().nullable().optional(),
});

export const addStockRowSchema = z.object({
  itemName: z.string().trim().min(1),
  manufacturerName: z.string().trim().nullable().optional(),
  categoryName: z.string().trim().nullable().optional(),
  articleNumber: z.string().trim().nullable().optional(),
  alternativeArticleNumber: z.string().trim().nullable().optional(),
  grade: z.string().trim().nullable().optional(),
  locationCode: z.string().trim().nullable().optional(),
  locationType: z.enum(["stockroom_position", "used_in", "location_in"]).default("stockroom_position"),
  compartment: z.string().trim().nullable().optional(),
  quantity: z.coerce.number().finite().default(1),
  unit: z.string().trim().min(1).default("pcs"),
  unitPrice: z.coerce.number().finite().nullable().optional(),
  currency: z.string().trim().min(1).default("SEK"),
  notes: z.string().trim().nullable().optional(),
  imageUrl: z.string().trim().nullable().optional(),
  qrCodeId: z.string().trim().max(1000).nullable().optional(),
  qrCodeImageUrl: z.string().trim().nullable().optional(),
  attributes: z.array(itemAttributeInputSchema).max(80).default([]),
});

export const tableColumnSettingsSchema = z.object({
  visibleColumns: z.array(z.string().trim().min(1)).max(100),
  customColumns: z.array(z.object({
    key: z.string().trim().min(1),
    name: z.string().trim().min(1),
    label: z.string().trim().min(1),
  })).max(80).optional().default([]),
  columnLabels: z.record(z.string(), z.string().trim().min(1)).optional().default({}),
  widgets: z.object({
    itemCount: z.boolean().default(true),
    balance: z.boolean().default(true),
  }).optional().default({ itemCount: true, balance: true }),
  allowedSearchAttributes: z.array(z.string()).nullable().optional(),
});

export const updateStockRowSchema = addStockRowSchema.partial().extend({
  status: z.enum(["active", "archived"]).optional(),
});

export const stockMovementActionSchema = z.object({
  quantity: z.coerce.number().int().min(1),
  notes: z.string().trim().nullable().optional(),
});

export const useInCardSchema = stockMovementActionSchema.extend({
  cardId: z.string().min(1),
  spotIds: z.array(z.string().min(1)).optional().default([]),
});

export const mergeDuplicateRowsSchema = z.object({
  primaryRowId: z.string().min(1),
  rowIds: z.array(z.string().min(1)).min(2),
});

export type ListStockRowsQuery = z.infer<typeof listStockRowsQuerySchema>;
export type CreateInventoryGroupInput = z.infer<typeof createInventoryGroupSchema>;
export type CreateInventoryTableInput = z.infer<typeof createInventoryTableSchema>;
export type AddStockRowInput = z.infer<typeof addStockRowSchema>;
export type TableColumnSettingsInput = z.infer<typeof tableColumnSettingsSchema>;
export type UpdateStockRowInput = z.infer<typeof updateStockRowSchema>;
export type StockMovementActionInput = z.infer<typeof stockMovementActionSchema>;
export type UseInCardInput = z.infer<typeof useInCardSchema>;
export type MergeDuplicateRowsInput = z.infer<typeof mergeDuplicateRowsSchema>;
