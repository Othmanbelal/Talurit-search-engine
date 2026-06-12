import type { StructuredImportBatch } from "../../../lib/import/structuredImportTypes";

export function ImportResultStep({ batch }: { batch: StructuredImportBatch }) {
  return (
    <section className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-5 text-emerald-50">
      <h2 className="text-lg font-semibold">Import completed</h2>
      <p className="mt-2 text-sm">{batch.fileName} was imported into the structured inventory database.</p>
      {batch.targetInventoryGroup ? <p className="mt-2 text-sm">Inventory group: <strong>{batch.targetInventoryGroup.name}</strong></p> : null}
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded bg-black/20 p-3"><div className="text-xs opacity-70">Ready rows</div><div className="text-xl font-semibold">{batch.counts.readyRows}</div></div>
        <div className="rounded bg-black/20 p-3"><div className="text-xs opacity-70">Review rows</div><div className="text-xl font-semibold">{batch.counts.reviewRows}</div></div>
        <div className="rounded bg-black/20 p-3"><div className="text-xs opacity-70">Error rows</div><div className="text-xl font-semibold">{batch.counts.errorRows}</div></div>
      </div>
    </section>
  );
}
