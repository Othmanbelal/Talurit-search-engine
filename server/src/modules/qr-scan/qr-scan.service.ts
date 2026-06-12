import { findManagersForRows, findRowsByQrCandidates } from "./qr-scan.repository";
import { serializeScanRow } from "./qr-scan.serializer";

export async function scanQrCode(code: string) {
  const candidates = qrCandidates(code);
  const rows = await findRowsByQrCandidates(candidates);
  const tableIds = unique(rows.map((row) => row.inventoryTableId).filter(Boolean) as string[]);
  const groupIds = unique(rows.map((row) => row.inventoryTable?.groupId).filter(Boolean) as string[]);
  const managers = await findManagersForRows(tableIds, groupIds);

  return {
    matched: rows.length > 0,
    scannedCode: code,
    candidates,
    rows: rows.map((row) => serializeScanRow(row, managers)),
  };
}

function qrCandidates(value: string) {
  const raw = value.trim();
  const candidates = new Set<string>([raw]);

  try {
    const url = new URL(raw);
    for (const key of ["qr", "code", "item", "itemId", "id"]) {
      const param = url.searchParams.get(key)?.trim();
      if (param) candidates.add(param);
    }
    const lastPath = url.pathname.split("/").filter(Boolean).at(-1);
    if (lastPath) candidates.add(lastPath);
  } catch {
    // Plain QR payloads are valid; URL parsing is only a convenience.
  }

  return Array.from(candidates);
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}
