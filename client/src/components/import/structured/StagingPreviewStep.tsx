import type { StagingRow, StructuredImportBatch } from "../../../lib/import/structuredImportTypes";
import { BatchSummaryCards } from "./BatchSummaryCards";
import { StagingRowsTable } from "./StagingRowsTable";

export function StagingPreviewStep({
  batch,
  canConfirm,
  isLoading,
  rows,
  onConfirm,
  onPatchRow,
}: {
  batch: StructuredImportBatch;
  canConfirm: boolean;
  isLoading: boolean;
  rows: StagingRow[];
  onConfirm: () => void;
  onPatchRow: (rowId: string, patch: Partial<StagingRow>) => void;
}) {
  return (
    <section className="space-y-4">
      <BatchSummaryCards batch={batch} />
      <div className="flex flex-col justify-between gap-3 rounded-lg border border-line bg-panel p-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-lg font-semibold text-white">Staging preview</h2>
          <p className="mt-1 text-sm text-slate-400">Resolve review/error rows before final import.</p>
        </div>
        <button className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:opacity-60" disabled={!canConfirm || isLoading} onClick={onConfirm} type="button">
          {isLoading ? "Importing..." : "Confirm final import"}
        </button>
      </div>
      <StagingRowsTable rows={rows} onPatchRow={onPatchRow} />
    </section>
  );
}
