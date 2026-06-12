import { compactJson } from "../../../lib/import/structuredImportFormatters";
import type { StagingRow } from "../../../lib/import/structuredImportTypes";

export function StagingRowsTable({
  rows,
  onPatchRow,
}: {
  rows: StagingRow[];
  onPatchRow: (rowId: string, patch: Partial<StagingRow>) => void;
}) {
  const visibleRows = rows.slice(0, 80);
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-panel">
      <table className="min-w-full divide-y divide-line text-sm">
        <thead className="bg-slate-950/70 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr><th className="px-3 py-2">Sheet</th><th className="px-3 py-2">Row</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Message</th><th className="px-3 py-2">Actions</th></tr>
        </thead>
        <tbody className="divide-y divide-line">
          {visibleRows.map((row) => (
            <tr className="align-top" key={row.id}>
              <td className="px-3 py-2 text-white">{row.importSheet?.sheetName ?? "-"}</td>
              <td className="px-3 py-2 text-slate-300">{row.rowNumber}</td>
              <td className="px-3 py-2"><StatusBadge status={row.status} /></td>
              <td className="max-w-xl px-3 py-2 text-slate-300">
                <div>{row.message ?? "No warning"}</div>
                {row.status !== "ready" ? <pre className="mt-2 max-h-28 overflow-auto rounded bg-slate-950 p-2 text-xs text-slate-400">{compactJson(row.mappedData ?? row.rawRow)}</pre> : null}
              </td>
              <td className="space-y-2 px-3 py-2">
                {row.status !== "ready" ? <button className="block rounded bg-emerald-500/20 px-2 py-1 text-xs text-emerald-100" onClick={() => onPatchRow(row.id, { status: "ready", message: null })} type="button">Mark ready</button> : null}
                {row.status !== "ignored" ? <button className="block rounded bg-white/10 px-2 py-1 text-xs text-slate-200" onClick={() => onPatchRow(row.id, { status: "ignored" })} type="button">Ignore</button> : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > visibleRows.length ? <div className="p-3 text-xs text-slate-500">Showing first {visibleRows.length} of {rows.length} staging rows.</div> : null}
    </div>
  );
}

function StatusBadge({ status }: { status: StagingRow["status"] }) {
  const tone = status === "ready" ? "bg-emerald-500/15 text-emerald-100" : status === "ignored" ? "bg-slate-500/15 text-slate-300" : "bg-amber-500/15 text-amber-100";
  return <span className={`rounded-full px-2 py-1 text-xs ${tone}`}>{status}</span>;
}
