import { normalizeKey, toNullableString } from "./structured-import.normalizers";

export type ParsedLocation = {
  code: string;
  normalizedCode: string;
  planNumber?: number;
  sectionLetter?: string;
  positionNumber?: number;
  displayName: string;
};

export function parseLocation(input: unknown, room = "Verktygsrum"): ParsedLocation | null {
  const code = toNullableString(input)?.toUpperCase().replace(/\s+/g, "");
  if (!code) return null;

  const normalizedCode = normalizeLocationCode(code);
  const parsed = /^P(\d+)([A-Z])[:\-]?(\d+)$/.exec(normalizedCode);

  return {
    code: normalizedCode,
    normalizedCode: normalizeKey(normalizedCode),
    planNumber: parsed ? Number(parsed[1]) : undefined,
    sectionLetter: parsed?.[2],
    positionNumber: parsed ? Number(parsed[3]) : undefined,
    displayName: `${room} / ${normalizedCode}`,
  };
}

export function normalizeLocationCode(value: string) {
  const compact = value.toUpperCase().replace(/\s+/g, "");
  const parsed = /^P(\d+)([A-Z])[:\-]?(\d+)$/.exec(compact);
  return parsed ? `P${parsed[1]}${parsed[2]}:${parsed[3]}` : compact;
}
