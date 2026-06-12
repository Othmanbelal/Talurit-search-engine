import { z } from "zod";

const optionalText = z.preprocess(
  (value) => {
    if (value === "") return null;
    return typeof value === "string" ? value.trim() : value;
  },
  z.string().min(1).max(500).nullable().optional(),
);

export const cardIdParamSchema = z.object({ id: z.string().min(1) });
export const assignmentIdParamSchema = z.object({ id: z.string().min(1) });

export const createUsedInCardSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: optionalText,
  spotNames: z.array(z.string().trim().min(1).max(100)).max(200).optional().default([]),
});

const cardSpotSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(100),
});

export const updateUsedInCardSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: optionalText,
  spots: z.array(cardSpotSchema).max(200).default([]),
});

export const assignRowsSchema = z.object({
  rowIds: z.array(z.string().min(1)).min(1),
  quantity: z.coerce.number().int().min(1).nullable().optional(),
  notes: optionalText,
});

export type CreateUsedInCardInput = z.infer<typeof createUsedInCardSchema>;
export type UpdateUsedInCardInput = z.infer<typeof updateUsedInCardSchema>;
export type AssignRowsInput = z.infer<typeof assignRowsSchema>;
