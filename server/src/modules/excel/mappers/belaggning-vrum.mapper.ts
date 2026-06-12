import type { PreviewLocation } from "../excel.types";
import {
  hasText,
  rawDataFromCell,
  type SheetRow,
  valueByIndex,
} from "./shared-mapper-utils";

const sheetName = "Bel\u00e4ggning vrum";

// The occupancy sheet is a grid, not a table, so each non-empty cell becomes a location.
export function mapBelaggningVrum(rows: SheetRow[]) {
  const locations: PreviewLocation[] = [];

  rows.forEach((row, rowIndex) => {
    row.forEach((cellValue, columnIndex) => {
      if (!hasText(cellValue)) return;

      const rowNumber = rowIndex + 1;
      const rawLabel = valueByIndex(row, columnIndex);

      locations.push({
        rawLabel,
        shelf: rawLabel,
        mapRow: rowNumber,
        mapColumn: columnIndex + 1,
        sourceSheet: sheetName,
        rawData: rawDataFromCell({
          cellValue,
          columnIndex,
          rowNumber,
          sheetName,
        }),
      });
    });
  });

  return { locations, issues: [] };
}
