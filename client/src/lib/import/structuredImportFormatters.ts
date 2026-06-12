import type { StructuredMapping, StructuredImportBatch } from "./structuredImportTypes";

export function confidenceText(value?: number | string | null) {
  const numeric = Number(value ?? 0);
  return `${Math.round(numeric * 100)}%`;
}

export function defaultGroupName(batch: StructuredImportBatch | null) {
  if (!batch) return "";
  return batch.targetInventoryGroup?.name ?? `${batch.fileName} Import`;
}

export function needsAttributeDetails(mapping: StructuredMapping) {
  return mapping.targetType === "item_attribute";
}

export function fieldForTarget(targetType: StructuredMapping["targetType"], current?: string | null) {
  if (current) return current;
  if (targetType === "item_field") return "name";
  if (targetType === "manufacturer") return "name";
  if (targetType === "identifier") return "manufacturer_article";
  if (targetType === "category") return "name";
  if (targetType === "location") return "code";
  if (targetType === "quantity") return "quantity";
  if (targetType === "unit_price") return "unitPrice";
  return null;
}

export function compactJson(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
