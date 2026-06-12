import { cleanCell, hasValue, normalizeText } from "./structured-import.normalizers";

const headerSignals = new Map([
  ["produkt", 24],
  ["product", 24],
  ["item", 24],
  ["benamning", 24],
  ["fabrikat", 20],
  ["manufacturer", 20],
  ["brand", 20],
  ["art nr", 22],
  ["artikelnummer", 22],
  ["article number", 22],
  ["part number", 22],
  ["sku", 20],
  ["lager", 20],
  ["quantity", 20],
  ["qty", 20],
  ["antal", 20],
  ["plan hylla back", 24],
  ["location", 24],
  ["lagerplats", 24],
  ["fack", 18],
  ["typ", 14],
  ["category", 14],
]);

export function detectHeaderRow(rows: unknown[][]) {
  const candidates = rows.slice(0, 20).map((row, index) => ({
    rowIndex: index,
    score: scoreHeaderRow(row),
  }));
  const best = candidates.sort((a, b) => b.score - a.score)[0];
  return best && best.score >= 35 ? best.rowIndex : firstNonEmptyRow(rows);
}

function scoreHeaderRow(row: unknown[]) {
  const normalizedCells = row.map((cell) => normalizeText(cell)).filter(Boolean);
  const signalScore = normalizedCells.reduce((sum, cell) => sum + scoreCell(cell), 0);
  const densityScore = Math.min(normalizedCells.length, 12);
  return signalScore + densityScore;
}

function scoreCell(cell: string) {
  let score = 0;
  for (const [signal, weight] of headerSignals.entries()) {
    if (cell === signal || cell.includes(signal)) score += weight;
  }
  return score;
}

function firstNonEmptyRow(rows: unknown[][]) {
  const index = rows.findIndex((row) => row.some(hasValue));
  return index >= 0 ? index : null;
}

export function buildHeaders(row: unknown[]) {
  return row.map((cell, index) => cleanCell(cell) || `Column ${index + 1}`);
}
