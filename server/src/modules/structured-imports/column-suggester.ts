import type { ColumnSuggestion, MappingTargetType } from "./structured-import.types";
import { cleanCell, normalizeKey, normalizeText } from "./structured-import.normalizers";

type Rule = {
  headers: string[];
  targetType: MappingTargetType;
  targetField?: string;
  attributeName?: string;
  attributeUnit?: string;
  attributeDataType?: string;
};

const rules: Rule[] = [
  rule(["plan hylla back", "location", "plats", "lagerplats", "hylla", "shelf"], "location", "code"),
  rule(["fack", "compartment", "box", "bin", "lada"], "compartment", "compartment"),
  rule(["produkt", "product", "item", "tool", "verktyg", "benamning", "name"], "item_field", "name"),
  rule(["fabrikat", "manufacturer", "brand", "marke"], "manufacturer", "name"),
  rule(["alt art nr", "alternative article number", "supplier article"], "identifier", "alternative_article"),
  rule(["art nr", "artikelnummer", "article number", "part number", "sku"], "identifier", "manufacturer_article"),
  rule(["grade", "sort", "quality"], "grade", "grade"),
  rule(["typ", "type", "category", "kategori"], "category", "name"),
  attr(["infastning", "mounting", "fastening"], "mounting", undefined, "text"),
  attr(["o", "diameter", "dia"], "diameter", "mm", "number"),
  attr(["skarlangd", "cutting length"], "cutting_length", "mm", "number"),
  attr(["skarstorlek", "insert size", "size"], "insert_size", undefined, "text"),
  attr(["hallare", "holder"], "holder", undefined, "text"),
  attr(["uthang", "stickout", "overhang"], "stickout", "mm", "number"),
  rule(["lager", "quantity", "qty", "stock", "saldo"], "quantity", "quantity"),
  rule(["antal"], "note", "reference_quantity"),
  rule([":", ":-", "price", "unit price", "pris", "styckpris"], "unit_price", "unitPrice"),
  rule(["maskin", "machine"], "machine_reference", "machine"),
];

export function suggestColumn(headers: string[], rows: unknown[][], columnIndex: number): ColumnSuggestion {
  const excelHeader = headers[columnIndex] || `Column ${columnIndex + 1}`;
  const normalizedExcelHeader = normalizeKey(excelHeader);
  const samples = sampleValues(rows, columnIndex);
  const matched = findRule(excelHeader, columnIndex);

  return {
    columnIndex,
    excelHeader,
    normalizedExcelHeader,
    sampleValues: samples,
    targetType: matched?.targetType ?? "ignore",
    targetField: matched?.targetField,
    attributeName: matched?.attributeName,
    attributeUnit: matched?.attributeUnit,
    attributeDataType: matched?.attributeDataType,
    confidence: matched ? confidenceFor(excelHeader, matched.headers) : 0.15,
  };
}

function findRule(header: string, columnIndex: number) {
  const raw = cleanCell(header);
  if (raw === ":" || raw === ":-") return rules.find((candidate) => candidate.targetType === "unit_price");
  if (raw === "Hållare" && columnIndex > 12) {
    return attr(["hallare"], "holder_secondary", undefined, "text");
  }

  const normalized = normalizeText(header);
  return rules.find((candidate) => candidate.headers.some((alias) => headerMatchesAlias(normalized, alias)));
}

function headerMatchesAlias(normalized: string, alias: string) {
  if (normalized === alias) return true;
  if (alias.length <= 2) return false;
  return normalized.includes(alias);
}

function sampleValues(rows: unknown[][], columnIndex: number) {
  const values = rows.map((row) => cleanCell(row[columnIndex])).filter(Boolean);
  return Array.from(new Set(values)).slice(0, 5);
}

function confidenceFor(header: string, aliases: string[]) {
  const normalized = normalizeText(header);
  return aliases.some((alias) => normalized === alias) ? 0.98 : 0.82;
}

function rule(headers: string[], targetType: MappingTargetType, targetField?: string): Rule {
  return { headers, targetType, targetField };
}

function attr(headers: string[], attributeName: string, attributeUnit?: string, attributeDataType = "text"): Rule {
  return { headers, targetType: "item_attribute", attributeName, attributeUnit, attributeDataType };
}
