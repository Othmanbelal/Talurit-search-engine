import { toNullableString } from "./structured-import.normalizers";
import type { MappedImportData, RowValidationResult } from "./structured-import.types";

export function validateMappedRow(mappedData: MappedImportData, _previousLocationCode?: string | null): RowValidationResult {
  const messages: string[] = [];
  const itemName = toNullableString(mappedData.item.name);
  const article = firstIdentifierValue(mappedData.identifiers);
  const quantityRaw = mappedData.stock.quantityRaw;

  if (!itemName && !article) {
    return {
      status: "ignored",
      confidence: 0,
      message: "Row has no item name or article number.",
      mappedData,
    };
  }

  // Empty optional cells are valid null values. Missing location means unassigned stock, not a blocking review.
  if (!toNullableString(mappedData.location.code)) mappedData.location.code = null;
  if (quantityRaw && mappedData.stock.quantity === null) {
    messages.push(`Invalid quantity value: ${quantityRaw}.`);
  }

  const status = messages.length > 0 ? "needs_review" : "ready";
  return {
    status,
    confidence: status === "ready" ? 1 : 0.65,
    message: messages.join(" ") || undefined,
    mappedData,
  };
}

function firstIdentifierValue(identifiers: Record<string, unknown>) {
  for (const value of Object.values(identifiers)) {
    const text = toNullableString(value);
    if (text) return text;
  }
  return null;
}
