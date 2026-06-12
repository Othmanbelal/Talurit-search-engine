import type { ImportColumnMapping } from "@prisma/client";
import { normalizeKey, toNullableString } from "./structured-import.normalizers";
import type { MappedImportData } from "./structured-import.types";

export function mapRawRow(
  rawRow: Record<string, unknown>,
  mappings: ImportColumnMapping[],
): MappedImportData {
  const data = emptyMappedData();

  for (const mapping of mappings) {
    const value = getMappedValue(rawRow, mapping.excelHeader);
    applyMapping(data, mapping, value);
  }

  return data;
}

function emptyMappedData(): MappedImportData {
  return {
    item: {},
    identifiers: {},
    stock: {},
    location: {},
    attributes: {},
    notes: {},
  };
}

function getMappedValue(rawRow: Record<string, unknown>, excelHeader: string) {
  if (Object.prototype.hasOwnProperty.call(rawRow, excelHeader)) return rawRow[excelHeader];
  const wanted = normalizeKey(excelHeader);
  const match = Object.entries(rawRow).find(([key]) => normalizeKey(key) === wanted);
  return match?.[1] ?? null;
}

function applyMapping(data: MappedImportData, mapping: ImportColumnMapping, value: unknown) {
  if (mapping.targetType === "ignore") return;
  const nullableValue = nullableCell(value);

  switch (mapping.targetType) {
    case "item_field":
      data.item[mapping.targetField || "name"] = nullableValue;
      break;
    case "manufacturer":
      data.item.manufacturer = nullableValue;
      break;
    case "identifier":
      data.identifiers[mapping.targetField || "article"] = nullableValue;
      break;
    case "category":
      data.item.category = nullableValue;
      break;
    case "grade":
      data.item.grade = nullableValue;
      break;
    case "location":
      data.location.code = nullableValue;
      break;
    case "compartment":
      data.stock.compartment = nullableValue;
      break;
    case "quantity":
      data.stock.quantity = parseLooseNumber(value);
      data.stock.quantityRaw = toNullableString(value);
      break;
    case "unit_price":
      data.stock.unitPrice = parseLooseNumber(value);
      data.stock.unitPriceRaw = toNullableString(value);
      break;
    case "machine_reference":
      data.attributes.machine_reference = buildAttributeValue(mapping, value, "machine_reference");
      break;
    case "item_attribute":
      data.attributes[mapping.attributeName || mapping.excelHeader] = buildAttributeValue(mapping, value);
      break;
    case "note":
      data.notes[mapping.targetField || mapping.excelHeader] = nullableValue;
      break;
  }
}

function buildAttributeValue(mapping: ImportColumnMapping, value: unknown, fallbackName?: string) {
  return {
    rawValue: toNullableString(value),
    unit: mapping.attributeUnit,
    dataType: mapping.attributeDataType,
    sourceColumn: mapping.excelHeader,
    name: mapping.attributeName || fallbackName || mapping.excelHeader,
  };
}

function parseLooseNumber(value: unknown): number | null {
  const text = toNullableString(value)?.replace(/\s/g, "").replace(",", ".");
  if (!text) return null;
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
  const number = Number(text);
  return Number.isFinite(number) ? number : null;
}

function nullableCell(value: unknown) {
  return value === null || value === undefined || value === "" ? null : value;
}
