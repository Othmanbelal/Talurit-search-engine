import { identifierEntries } from "./mapped-data-access";
import { normalizeKey, toNullableString } from "./structured-import.normalizers";
import type { RowValidationResult } from "./structured-import.types";

type Candidate = {
  result: RowValidationResult;
};

export function markPossibleDuplicates<T extends Candidate>(rows: T[]) {
  const keysByRow = rows.map((row) => candidateKeys(row.result));
  const counts = countKeys(keysByRow);

  rows.forEach((row, index) => {
    if (row.result.status !== "ready") return;
    const duplicateKeys = keysByRow[index].filter((key) => (counts.get(key) ?? 0) > 1);
    if (duplicateKeys.length === 0) return;

    row.result.mappedData.duplicate = {
      status: "possible",
      keys: duplicateKeys,
      message: duplicateMessage(duplicateKeys),
    };
  });

  return rows;
}

function countKeys(keysByRow: string[][]) {
  const counts = new Map<string, number>();
  for (const keys of keysByRow) {
    for (const key of new Set(keys)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function candidateKeys(result: RowValidationResult) {
  if (result.status !== "ready") return [];
  const data = result.mappedData;
  const identifierKeys = identifierEntries(data).map((entry) => `identifier:${entry.type}:${normalizeKey(entry.value)}`);
  if (identifierKeys.length > 0) return identifierKeys;

  const name = toNullableString(data.item.name);
  if (!name) return [];
  const manufacturer = toNullableString(data.item.manufacturer) ?? "";
  const category = toNullableString(data.item.category) ?? "";
  const diameter = attributeRawValue(data.attributes.diameter) ?? "";
  return [`item:${normalizeKey(manufacturer)}:${normalizeKey(name)}:${normalizeKey(category)}:${normalizeKey(diameter)}`];
}

function attributeRawValue(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return toNullableString(value);
  return toNullableString((value as Record<string, unknown>).rawValue);
}

function duplicateMessage(keys: string[]) {
  return keys.some((key) => key.startsWith("identifier:"))
    ? "Possible duplicate by article identifier. Verify or dismiss before final review."
    : "Possible duplicate by item name and attributes. Verify or dismiss before final review.";
}
