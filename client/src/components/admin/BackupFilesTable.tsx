import { RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BackupFile } from "../../types/admin";
import { formatDateTime } from "../../utils/format";

type Props = {
  files: BackupFile[];
  isBusy: boolean;
  onSelectRestore: (fileName: string) => void;
};

export function BackupFilesTable({ files, isBusy, onSelectRestore }: Props) {
  const { t } = useTranslation("admin");

  if (files.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-line p-5 text-center text-sm text-slate-400">
        {t("backup.noFiles")}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-line">
      <table className="min-w-full divide-y divide-line text-sm">
        <thead className="bg-slate-950/60 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2">{t("backup.columns.file")}</th>
            <th className="px-3 py-2">{t("backup.columns.created")}</th>
            <th className="px-3 py-2">{t("backup.columns.contents")}</th>
            <th className="px-3 py-2">{t("backup.columns.size")}</th>
            <th className="px-3 py-2 text-right">{t("backup.columns.action")}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {files.map((file) => (
            <tr className="bg-white/[0.02]" key={file.fileName}>
              <td className="px-3 py-3 font-medium text-slate-200">{file.fileName}</td>
              <td className="px-3 py-3 text-slate-400">{formatDateTime(file.modifiedAt)}</td>
              <td className="px-3 py-3">
                <span className={file.kind === "full"
                  ? "rounded-full border border-emerald-400/30 px-2 py-1 text-xs text-emerald-200"
                  : "rounded-full border border-amber-400/30 px-2 py-1 text-xs text-amber-200"}
                >
                  {file.kind === "full" ? t("backup.kindFull") : t("backup.kindLegacy")}
                </span>
              </td>
              <td className="px-3 py-3 text-slate-400">{formatBytes(file.sizeBytes)}</td>
              <td className="px-3 py-3 text-right">
                <button
                  className="inline-flex items-center gap-1.5 rounded-md border border-amber-400/30 px-2.5 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/10 disabled:opacity-50"
                  disabled={isBusy}
                  onClick={() => onSelectRestore(file.fileName)}
                  type="button"
                >
                  <RotateCcw size={13} /> {t("backup.restore")}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
