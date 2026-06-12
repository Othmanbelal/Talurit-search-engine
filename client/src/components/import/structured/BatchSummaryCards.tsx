import type { StructuredImportBatch } from "../../../lib/import/structuredImportTypes";

export function BatchSummaryCards({ batch }: { batch: StructuredImportBatch }) {
  const cards = [
    ["Total rows", batch.counts.totalRows],
    ["Ready", batch.counts.readyRows],
    ["Needs review", batch.counts.reviewRows],
    ["Errors", batch.counts.errorRows],
  ];
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {cards.map(([label, value]) => (
        <div className="rounded-lg border border-line bg-panel p-4" key={label}>
          <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
          <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
        </div>
      ))}
    </div>
  );
}
