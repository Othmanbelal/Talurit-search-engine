import { z } from "zod";

export const tableLowStockSchema = z.object({
  enabled: z.boolean(),
});

export const rowLowStockSchema = z.object({
  enabled: z.boolean(),
  threshold: z.number().nonnegative().nullable().optional().transform((v) => v ?? null),
  reorderUrl: z
    .preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? null : value),
      z
        .string()
        .trim()
        .max(2000)
        .regex(/^https?:\/\//i, "Order link must start with http:// or https://")
        .nullable(),
    )
    .optional()
    .transform((v) => v ?? null),
});

export type TableLowStockInput = z.infer<typeof tableLowStockSchema>;
export type RowLowStockInput = z.infer<typeof rowLowStockSchema>;
