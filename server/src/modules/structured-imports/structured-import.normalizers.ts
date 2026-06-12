export function normalizeText(value: unknown) {
  return cleanCell(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u00f8\u00d8]/g, "o")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeKey(value: unknown) {
  return normalizeText(value).replace(/\s+/g, "_") || "column";
}

export function cleanCell(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function toNullableString(value: unknown) {
  const text = cleanCell(value);
  return text.length > 0 ? text : null;
}

export function hasValue(value: unknown) {
  return cleanCell(value).length > 0;
}

export function headerFingerprint(headers: string[]) {
  return headers.map(normalizeKey).filter(Boolean).join("|");
}
