import { DatabaseZap } from "lucide-react";
import type { ConfirmImportResult, ExcelPreview } from "../../types/import";

type ImportConfirmPanelProps = {
  error: string | null;
  isConfirming: boolean;
  onConfirm: () => void;
  preview: ExcelPreview;
  result: ConfirmImportResult | null;
  selectedFile: File | null;
};

export function ImportConfirmPanel({
  error,
  isConfirming,
  onConfirm,
  preview,
  result,
  selectedFile,
}: ImportConfirmPanelProps) {
  return (
    <section className="rounded-lg border border-line bg-panel p-4 shadow-industrial">
      <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-base font-semibold text-white">Save preview to PostgreSQL</h2>
          <div className="mt-1 text-sm text-slate-400">
            {preview.summary.tools} tools and {preview.summary.locations} locations will be processed.
          </div>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!selectedFile || isConfirming}
          onClick={onConfirm}
          type="button"
        >
          <DatabaseZap size={17} /> {isConfirming ? "Saving..." : "Confirm import"}
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      {result ? <ImportResult result={result} /> : null}
    </section>
  );
}

function ImportResult({ result }: { result: ConfirmImportResult }) {
  const rows = [
    ["Tools created", result.toolsCreated],
    ["Tools updated", result.toolsUpdated],
    ["Locations created", result.locationsCreated],
    ["Locations updated", result.locationsUpdated],
    ["Issues logged", result.issuesLogged],
  ];

  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {rows.map(([label, value]) => (
        <div className="rounded-md border border-line bg-slate-950/50 p-3" key={label}>
          <div className="text-xs text-slate-500">{label}</div>
          <div className="mt-1 text-lg font-semibold text-white">{value}</div>
        </div>
      ))}
    </div>
  );
}
