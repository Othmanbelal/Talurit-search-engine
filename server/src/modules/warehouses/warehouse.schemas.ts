import { z } from "zod";

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const shelfParamSchema = z.object({
  id: z.string().min(1),
  shelfId: z.string().min(1),
});

export const slotParamSchema = z.object({
  id: z.string().min(1),
  slotId: z.string().min(1),
});

export const listWarehousesQuerySchema = z.object({
  archived: z.enum(["active", "archived", "all"]).default("active"),
});

const layoutDataSchema = z
  .record(z.unknown())
  .default({})
  .refine(isJsonObject, "Layout data must be JSON serializable.");

export const createWarehouseSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().nullable().optional(),
  layoutData: layoutDataSchema.optional(),
});

export const updateWarehouseSchema = z.object({
  name: z.string().trim().min(1).optional(),
  description: z.string().trim().nullable().optional(),
  isArchived: z.boolean().optional(),
});

export const saveWarehouseLayoutSchema = z.object({
  layoutData: layoutDataSchema,
});

const generateShelvesBaseSchema = z.object({
  planNumber: z.coerce.number().int().min(1).max(999),
  sectionLetter: z.string().trim().min(1).max(4).transform((value) => value.toUpperCase()),
  positionStart: z.coerce.number().int().min(1).max(999),
  positionEnd: z.coerce.number().int().min(1).max(999),
  compartmentStart: z.coerce.number().int().min(1).max(999).default(1),
  compartmentEnd: z.coerce.number().int().min(1).max(999).default(4),
  room: z.string().trim().min(1).default("Verktygsrum"),
});

export const generateShelvesSchema = generateShelvesBaseSchema
  .refine((value) => value.positionEnd >= value.positionStart, "End position must be after start position.")
  .refine((value) => value.compartmentEnd >= value.compartmentStart, "End FACK must be after start FACK.");

export const generateShelvesFromSceneObjectSchema = generateShelvesBaseSchema
  .extend({ externalObjectId: z.string().trim().min(1) })
  .refine((value) => value.positionEnd >= value.positionStart, "End position must be after start position.")
  .refine((value) => value.compartmentEnd >= value.compartmentStart, "End FACK must be after start FACK.");

export const generateRackSlotsFromSceneObjectSchema = z.object({
  externalObjectId: z.string().trim().min(1),
  shelfLevelCount: z.coerce.number().int().min(1).max(50),
  slotsPerShelf: z.coerce.number().int().min(1).max(100),
  planNumber: z.coerce.number().int().min(1).max(999),
  sectionLetter: z.string().trim().min(1).max(4).transform((value) => value.toUpperCase()),
  locationStartPosition: z.coerce.number().int().min(1).max(9999),
  compartment: z.string().trim().min(1).default("1"),
  palletWidth: z.coerce.number().positive().max(10).default(1.2),
  palletDepth: z.coerce.number().positive().max(10).default(0.8),
  room: z.string().trim().min(1).default("Verktygsrum"),
});

const rackLayoutSlotSchema = z.object({
  slotIndex: z.coerce.number().int().min(1).max(500),
  code: z.string().trim().max(80).nullable().optional(),
  compartment: z.string().trim().max(50).nullable().optional(),
  displayName: z.string().trim().max(120).nullable().optional(),
});

const rackLayoutLevelSchema = z.object({
  levelNumber: z.coerce.number().int().min(1).max(50),
  slotCount: z.coerce.number().int().min(1).max(200),
  slots: z.array(rackLayoutSlotSchema).max(200).default([]),
});

export const saveRackSlotLayoutFromSceneObjectSchema = z.object({
  externalObjectId: z.string().trim().min(1),
  shelfLevels: z.array(rackLayoutLevelSchema).min(1).max(50),
  palletWidth: z.coerce.number().positive().max(10).default(1.2),
  palletDepth: z.coerce.number().positive().max(10).default(0.8),
  room: z.string().trim().min(1).default("Verktygsrum"),
}).superRefine((value, context) => {
  for (const level of value.shelfLevels) {
    const seen = new Set<number>();
    for (const slot of level.slots) {
      if (slot.slotIndex > level.slotCount) {
        context.addIssue({ code: "custom", message: "Slot index cannot be higher than the level slot count." });
      }
      if (seen.has(slot.slotIndex)) {
        context.addIssue({ code: "custom", message: "Slot indexes must be unique within each shelf level." });
      }
      seen.add(slot.slotIndex);
    }
  }
});

export const createShelfSchema = z.object({
  code: z.string().trim().min(1),
  displayName: z.string().trim().nullable().optional(),
  compartments: z.array(z.string().trim().min(1)).max(80).optional(),
});

export const updateShelfSchema = z.object({
  code: z.string().trim().min(1).optional(),
  displayName: z.string().trim().nullable().optional(),
});

export const createSlotSchema = z.object({
  compartment: z.string().trim().min(1),
  displayName: z.string().trim().nullable().optional(),
});

export const updateSlotSchema = z.object({
  compartment: z.string().trim().min(1).optional(),
  displayName: z.string().trim().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const linkGroupSchema = z.object({ groupId: z.string().min(1) });
export const linkTableSchema = z.object({ tableId: z.string().min(1) });

export const groupLinkParamSchema = z.object({
  id: z.string().min(1),
  groupId: z.string().min(1),
});

export const tableLinkParamSchema = z.object({
  id: z.string().min(1),
  tableId: z.string().min(1),
});

export const searchInventoryRowsQuerySchema = z.object({
  search: z.string().trim().optional(),
  tableId: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const scanInventoryRowsSchema = z.object({
  code: z.string().trim().min(1),
  limit: z.coerce.number().int().min(1).max(25).default(10),
});

export const assignSlotSchema = z.object({
  stockBalanceId: z.string().min(1),
  inventoryTableId: z.string().optional(),
  notes: z.string().max(500).optional(),
});

export const assignmentParamSchema = z.object({
  id: z.string().min(1),
  assignmentId: z.string().min(1),
});

export const byStockParamSchema = z.object({ stockBalanceId: z.string().min(1) });

export type LinkGroupInput = z.infer<typeof linkGroupSchema>;
export type LinkTableInput = z.infer<typeof linkTableSchema>;
export type GroupLinkParam = z.infer<typeof groupLinkParamSchema>;
export type TableLinkParam = z.infer<typeof tableLinkParamSchema>;
export type SearchInventoryRowsQuery = z.infer<typeof searchInventoryRowsQuerySchema>;
export type ScanInventoryRowsInput = z.infer<typeof scanInventoryRowsSchema>;
export type AssignSlotInput = z.infer<typeof assignSlotSchema>;
export type AssignmentParam = z.infer<typeof assignmentParamSchema>;

export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;
export type ListWarehousesQuery = z.infer<typeof listWarehousesQuerySchema>;
export type SaveWarehouseLayoutInput = z.infer<typeof saveWarehouseLayoutSchema>;
export type GenerateShelvesInput = z.infer<typeof generateShelvesSchema>;
export type GenerateShelvesFromSceneObjectInput = z.infer<typeof generateShelvesFromSceneObjectSchema>;
export type GenerateRackSlotsFromSceneObjectInput = z.infer<typeof generateRackSlotsFromSceneObjectSchema>;
export type SaveRackSlotLayoutFromSceneObjectInput = z.infer<typeof saveRackSlotLayoutFromSceneObjectSchema>;
export type CreateShelfInput = z.infer<typeof createShelfSchema>;
export type UpdateShelfInput = z.infer<typeof updateShelfSchema>;
export type CreateSlotInput = z.infer<typeof createSlotSchema>;
export type UpdateSlotInput = z.infer<typeof updateSlotSchema>;

function isJsonObject(value: Record<string, unknown>) {
  try {
    JSON.stringify(value);
    return true;
  } catch {
    return false;
  }
}
