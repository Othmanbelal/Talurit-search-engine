import type { UpdateToolInput } from "./tools.schemas";
import {
  getToolFieldValue,
  serializeToolValue,
  writableToolFields,
} from "./tools.mapper";
import type { ToolHistoryEntry, ToolScalarField, ToolWithRelations } from "./tools.types";

export function buildUpdateHistory(
  previousTool: ToolWithRelations,
  input: UpdateToolInput,
): ToolHistoryEntry[] {
  const entries: ToolHistoryEntry[] = [];

  for (const field of writableToolFields) {
    if (!Object.prototype.hasOwnProperty.call(input, field)) continue;

    const oldValue = serializeToolValue(getToolFieldValue(previousTool, field));
    const newValue = serializeToolValue(input[field as keyof UpdateToolInput]);

    if (oldValue !== newValue) {
      entries.push({
        action: "UPDATE",
        fieldName: field,
        oldValue,
        newValue,
      });
    }
  }

  return entries;
}

export function buildStateHistory(
  previousTool: ToolWithRelations,
  changes: Partial<Record<ToolScalarField, unknown>>,
  action: string,
): ToolHistoryEntry[] {
  return Object.entries(changes).map(([fieldName, newValue]) => ({
    action,
    fieldName,
    oldValue: serializeToolValue(getToolFieldValue(previousTool, fieldName as ToolScalarField)),
    newValue: serializeToolValue(newValue),
  }));
}
