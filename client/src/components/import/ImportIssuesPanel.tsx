import { AlertTriangle } from "lucide-react";
import type { PreviewIssue } from "../../types/import";

type ImportIssuesPanelProps = {
  duplicates: PreviewIssue[];
  issues: PreviewIssue[];
};

export function ImportIssuesPanel({ duplicates, issues }: ImportIssuesPanelProps) {
  const rows = [...issues, ...duplicates].slice(0, 20);

  return (
    <section className="rounded-lg border border-line bg-panel p-4 shadow-industrial">
      <div className="flex items-center gap-2">
        <AlertTriangle className="text-amber-300" size={18} />
        <h2 className="text-base font-semibold text-white">Preview issues</h2>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2 font-semibold">Severity</th>
              <th className="px-3 py-2 font-semibold">Sheet</th>
              <th className="px-3 py-2 font-semibold">Row</th>
              <th className="px-3 py-2 font-semibold">Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length > 0 ? (
              rows.map((issue, index) => (
                <tr className="text-slate-200" key={`${issue.sheetName}-${issue.rowNumber}-${index}`}>
                  <td className="px-3 py-3">
                    <span className={severityClassName(issue.severity)}>{issue.severity}</span>
                  </td>
                  <td className="px-3 py-3">{issue.sheetName}</td>
                  <td className="px-3 py-3">{issue.rowNumber ?? "-"}</td>
                  <td className="px-3 py-3">{issue.message}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-3 py-5 text-slate-500" colSpan={4}>
                  No preview issues found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function severityClassName(severity: PreviewIssue["severity"]) {
  const base = "rounded-full border px-2 py-1 text-xs";

  if (severity === "ERROR") return `${base} border-red-400/30 text-red-300`;
  if (severity === "WARNING") return `${base} border-amber-400/30 text-amber-300`;
  return `${base} border-sky-400/30 text-sky-300`;
}
