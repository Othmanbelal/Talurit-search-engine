import type { ChangeEvent } from "react";
import { FileSpreadsheet, UploadCloud, X } from "lucide-react";

type ImportUploadPanelProps = {
  error: string | null;
  isLoading: boolean;
  onFileChange: (file: File | null) => void;
  onPreview: (file: File) => void;
  onReset: () => void;
  selectedFile: File | null;
};

export function ImportUploadPanel({
  error,
  isLoading,
  onFileChange,
  onPreview,
  onReset,
  selectedFile,
}: ImportUploadPanelProps) {
  function handlePreview() {
    if (selectedFile) onPreview(selectedFile);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    onFileChange(event.target.files?.[0] ?? null);
    onReset();
  }

  return (
    <section className="rounded-lg border border-line bg-panel p-5 shadow-industrial backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <label className="flex min-h-28 cursor-pointer flex-col justify-center rounded-lg border border-dashed border-line bg-slate-950/50 px-5 py-4 hover:border-accent">
          <input
            accept=".xlsx,.xlsm,.xls"
            className="sr-only"
            onChange={handleFileChange}
            type="file"
          />
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md border border-line bg-white/5 text-accent">
              <FileSpreadsheet aria-hidden="true" size={22} />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">
                {selectedFile ? selectedFile.name : "Select Excel workbook"}
              </div>
              <div className="mt-1 text-sm text-slate-400">.xlsx, .xlsm, or .xls</div>
            </div>
          </div>
        </label>

        <div className="flex flex-wrap gap-2">
          <button
            className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5 text-sm text-slate-200 hover:border-accent disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!selectedFile || isLoading}
            onClick={() => {
              onFileChange(null);
              onReset();
            }}
            type="button"
          >
            <X size={16} /> Clear
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!selectedFile || isLoading}
            onClick={handlePreview}
            type="button"
          >
            <UploadCloud size={17} /> {isLoading ? "Reading..." : "Preview import"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}
    </section>
  );
}
