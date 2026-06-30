import { ChangeEvent } from "react";
import { FileSpreadsheet, UploadCloud } from "lucide-react";
import { useTranslation } from "react-i18next";

export function UploadWorkbookStep({
  file,
  isLoading,
  onFileChange,
  onScan,
}: {
  file: File | null;
  isLoading: boolean;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onScan: () => void;
}) {
  const { t } = useTranslation("import");

  return (
    <section className="rounded-lg border border-line bg-panel p-5 shadow-industrial">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <label className="flex min-h-28 cursor-pointer flex-col justify-center rounded-lg border border-dashed border-line bg-slate-950/50 px-5 py-4 hover:border-accent">
          <input accept=".xlsx,.xlsm,.xls" className="sr-only" onChange={onFileChange} type="file" />
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="text-accent" size={24} />
            <div>
              <div className="text-sm font-semibold text-white">
                {file ? file.name : t("upload.selectWorkbook")}
              </div>
              <div className="mt-1 text-sm text-slate-400">
                {t("upload.scannedHint")}
              </div>
            </div>
          </div>
        </label>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-slate-950 disabled:opacity-60"
          disabled={!file || isLoading}
          onClick={onScan}
          type="button"
        >
          <UploadCloud size={17} /> {isLoading ? t("upload.scanning") : t("upload.scan")}
        </button>
      </div>
    </section>
  );
}
