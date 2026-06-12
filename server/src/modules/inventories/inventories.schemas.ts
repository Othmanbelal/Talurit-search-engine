import { z } from "zod";

const requiredText = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value),
  z.string().min(1).max(200),
);

export const inventoryIdParamSchema = z.object({
  id: z.string().min(1),
});

export const listInventoryRowsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});

export const confirmDynamicImportSchema = z.object({
  tableNames: z.record(requiredText).default({}),
});

export type ListInventoryRowsQuery = z.infer<typeof listInventoryRowsQuerySchema>;
export type ConfirmDynamicImportInput = z.infer<typeof confirmDynamicImportSchema>;
