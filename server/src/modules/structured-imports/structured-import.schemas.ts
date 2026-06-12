import { z } from "zod";

const sheetTypeSchema = z.enum([
  "stockroom_inventory",
  "inventory_items",
  "location_reference",
  "machine_tool_list",
  "generic_table",
  "ignore",
]);

const targetModeSchema = z.enum([
  "create_new_table",
  "group_with_other_sheets",
  "add_to_existing_table",
  "merge_with_selected_sheets",
  "ignore",
]);

const mappingTargetSchema = z.enum([
  "ignore",
  "item_field",
  "manufacturer",
  "identifier",
  "category",
  "grade",
  "location",
  "compartment",
  "quantity",
  "unit_price",
  "machine_reference",
  "item_attribute",
  "note",
]);

const stagingStatusSchema = z.enum(["ready", "needs_review", "error", "ignored"]);

export const batchIdParamSchema = z.object({ batchId: z.string().min(1) });
export const rowIdParamSchema = z.object({ rowId: z.string().min(1) });
export const sheetIdParamSchema = batchIdParamSchema.extend({ sheetId: z.string().min(1) });
export const stagingQuerySchema = z.object({ status: stagingStatusSchema.optional() });

export const updateSheetsSchema = z.object({
  groupName: z.string().trim().min(1).optional(),
  sheets: z.array(
    z.object({
      sheetId: z.string().min(1),
      selectedForImport: z.boolean(),
      userSelectedSheetType: sheetTypeSchema.optional(),
      headerRowNumber: z.number().int().min(1).nullable().optional(),
      targetMode: targetModeSchema.optional(),
      targetInventoryGroupId: z.string().min(1).nullable().optional(),
      targetInventoryTableId: z.string().min(1).nullable().optional(),
    }),
  ),
});

export const updateMappingsSchema = z.object({
  mappings: z.array(
    z.object({
      excelHeader: z.string().min(1),
      columnIndex: z.number().int().min(0),
      targetType: mappingTargetSchema,
      targetField: z.string().trim().nullable().optional(),
      attributeName: z.string().trim().nullable().optional(),
      attributeUnit: z.string().trim().nullable().optional(),
      attributeDataType: z.string().trim().nullable().optional(),
    }),
  ),
});

export const confirmImportSchema = z.object({}).optional();

export const updateStagingRowSchema = z.object({
  mappedData: z.unknown().optional(),
  status: stagingStatusSchema.optional(),
  message: z.string().nullable().optional(),
});
