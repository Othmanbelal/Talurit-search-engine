export function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeLookupKey(value: string) {
  return normalizeText(value).toLowerCase();
}
