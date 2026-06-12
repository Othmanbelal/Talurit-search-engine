import { normalizeKey, toNullableString } from "./structured-import.normalizers";
import type { MappedImportData } from "./structured-import.types";

export function itemName(data: MappedImportData) {
  return toNullableString(data.item.name) || firstText(data.item);
}

export function manufacturerName(data: MappedImportData) {
  return toNullableString(data.item.manufacturer);
}

export function categoryName(data: MappedImportData) {
  return toNullableString(data.item.category);
}

export function gradeValue(data: MappedImportData) {
  return toNullableString(data.item.grade);
}

export function locationCode(data: MappedImportData) {
  return toNullableString(data.location.code) || toNullableString(data.location.suggestedCode);
}

export function compartmentValue(data: MappedImportData) {
  return toNullableString(data.stock.compartment);
}

export function quantityValue(data: MappedImportData) {
  return numberOrZero(data.stock.quantity);
}

export function unitPriceValue(data: MappedImportData) {
  const value = data.stock.unitPrice;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function identifierEntries(data: MappedImportData) {
  return Object.entries(data.identifiers)
    .map(([type, value]) => ({ type: normalizeIdentifierType(type), value: toNullableString(value) }))
    .filter((entry): entry is { type: string; value: string } => Boolean(entry.value));
}

export function attributeEntries(data: MappedImportData) {
  return Object.entries(data.attributes)
    .map(([name, value]) => normalizeAttribute(name, value))
    .filter((entry): entry is AttributeEntry => Boolean(entry.rawValue));
}

export function normalizeIdentifier(value: string) {
  return value.toUpperCase().replace(/\s+/g, "").trim();
}

function normalizeIdentifierType(type: string) {
  if (["article", "article_number", "art_nr"].includes(type)) return "manufacturer_article";
  return normalizeKey(type);
}

function numberOrZero(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeAttribute(name: string, value: unknown) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const rawValue = toNullableString(record.rawValue);
    return {
      name: normalizeKey(record.name ?? name),
      rawValue,
      numericValue: parseNumber(rawValue),
      unit: toNullableString(record.unit),
      sourceColumn: toNullableString(record.sourceColumn),
    };
  }

  const rawValue = toNullableString(value);
  return { name: normalizeKey(name), rawValue, numericValue: parseNumber(rawValue), unit: null, sourceColumn: name };
}

function parseNumber(value: string | null) {
  if (!value) return null;
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function firstText(record: Record<string, unknown>) {
  for (const value of Object.values(record)) {
    const text = toNullableString(value);
    if (text) return text;
  }
  return null;
}

export type AttributeEntry = {
  name: string;
  rawValue: string;
  numericValue: number | null;
  unit: string | null;
  sourceColumn: string | null;
};
