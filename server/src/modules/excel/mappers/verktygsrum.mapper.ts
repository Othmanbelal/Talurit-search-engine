import type { PreviewIssue, PreviewLocation, PreviewTool } from "../excel.types";
import {
  headerMap,
  parseInteger,
  rawDataFromRow,
  type SheetRow,
  valueByHeader,
} from "./shared-mapper-utils";

const sheetName = "Verktygsrum";
const headerNames = {
  cuttingLength: "SK\u00c4RL\u00c4NGD",
  cuttingSize: "SK\u00c4RSTORLEK",
  diameter: "\u00d8",
  holder: "H\u00c5LLARE",
  holderSecondary: "H\u00e5llare",
  mounting: "INF\u00c4STNING",
  overhang: "UTH\u00c4NG",
};

// Main inventory rows are imported only when PRODUKT has data; trailing summary rows are ignored.
export function mapVerktygsrum(rows: SheetRow[]) {
  const tools: PreviewTool[] = [];
  const locations: PreviewLocation[] = [];
  const issues: PreviewIssue[] = [];
  const headers = headerMap(rows[0] ?? []);

  rows.slice(1).forEach((row, rowIndex) => {
    const rowNumber = rowIndex + 2;
    const productName = valueByHeader(row, headers, "PRODUKT");

    if (!productName) return;

    const rawData = rawDataFromRow({
      headers: rows[0],
      row,
      rowNumber,
      sheetName,
    });
    const shelf = valueByHeader(row, headers, "PLAN/HYLLA/BACK");
    const compartment = valueByHeader(row, headers, "FACK");
    const stockRaw = valueByHeader(row, headers, "LAGER");
    const countRaw = valueByHeader(row, headers, "ANTAL");

    const location: PreviewLocation = {
      rawLabel: shelf,
      shelf,
      compartment,
      sourceSheet: sheetName,
      rawData,
    };

    tools.push({
      productName,
      manufacturerName: valueByHeader(row, headers, "FABRIKAT"),
      articleNumber: valueByHeader(row, headers, "ART.NR"),
      alternativeArticleNumber: valueByHeader(row, headers, "ALT.ART.NR"),
      grade: valueByHeader(row, headers, "GRADE"),
      mounting: valueByHeader(row, headers, headerNames.mounting),
      toolTypeName: valueByHeader(row, headers, "TYP"),
      diameter: valueByHeader(row, headers, headerNames.diameter),
      cuttingLength: valueByHeader(row, headers, headerNames.cuttingLength),
      cuttingSize: valueByHeader(row, headers, headerNames.cuttingSize),
      holder: valueByHeader(row, headers, headerNames.holder),
      holderSecondary: valueByHeader(row, headers, headerNames.holderSecondary),
      overhang: valueByHeader(row, headers, headerNames.overhang),
      stockRaw,
      quantity: parseInteger(stockRaw),
      quantitySecondary: parseInteger(countRaw),
      countRaw,
      priceRaw: valueByHeader(row, headers, ":-"),
      totalPriceRaw: row[20] === null || row[20] === undefined ? null : String(row[20]),
      locationRawLabel: shelf,
      locationCompartment: compartment,
      machineName: valueByHeader(row, headers, "MASKIN"),
      machineRaw: valueByHeader(row, headers, "MASKIN"),
      sourceSheet: sheetName,
      sourceRowNumber: rowNumber,
      rawData,
    });

    if (location.rawLabel || location.shelf || location.compartment) {
      locations.push(location);
    }
  });

  if (!headers.has("PRODUKT")) {
    issues.push({
      sheetName,
      severity: "ERROR",
      message: "Missing PRODUKT header in Verktygsrum.",
      rawData: rawDataFromRow({ row: rows[0] ?? [], rowNumber: 1, sheetName }),
    });
  }

  return { tools, locations, issues };
}
