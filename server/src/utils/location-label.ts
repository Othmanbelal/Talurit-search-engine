const STORAGE_LABEL_PATTERN = /^[A-Z]+\d+[A-Z]*:\d+$/i;
const NUMERIC_ONLY_PATTERN = /^\d+$/;

export function normalizeStorageLabel(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  return trimmed.replace(/\s*:\s*/g, ":").replace(/\s+/g, "").toUpperCase();
}

export function isValidStorageLabel(value?: string | null) {
  const normalized = normalizeStorageLabel(value);
  return Boolean(normalized && STORAGE_LABEL_PATTERN.test(normalized));
}

export function isNumericOnlyLocationLabel(value?: string | null) {
  const normalized = normalizeStorageLabel(value);
  return Boolean(normalized && NUMERIC_ONLY_PATTERN.test(normalized));
}

export function assertValidStorageLabel(value?: string | null) {
  const normalized = normalizeStorageLabel(value);

  if (!normalized || !isValidStorageLabel(normalized)) {
    throw new Error("Location must use the shelf form P10A:8.");
  }

  return normalized;
}
