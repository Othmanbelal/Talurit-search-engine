import { Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Tool } from "../../types/tools";
import { formatNullable } from "../../utils/tool-format";
import { getToolPlacement } from "../../utils/tool-placement";

type UnassignedToolsPanelProps = {
  isLoading: boolean;
  onView: (tool: Tool) => void;
  tools: Tool[];
};

export function UnassignedToolsPanel({
  isLoading,
  onView,
  tools,
}: UnassignedToolsPanelProps) {
  const { t } = useTranslation("locations");
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-panel shadow-industrial">
      <div className="border-b border-line px-4 py-4">
        <h2 className="text-lg font-semibold text-white">{t("unassigned.title")}</h2>
        <p className="mt-1 text-sm text-slate-400">
          These tools are not in a valid shelf position or machine yet.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Article</th>
              <th className="px-4 py-3 font-medium">Manufacturer</th>
              <th className="px-4 py-3 font-medium">State</th>
              <th className="px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading ? <LoadingRow /> : null}
            {!isLoading && tools.length === 0 ? <EmptyRow /> : null}
            {!isLoading
              ? tools.map((tool) => {
                  const placement = getToolPlacement(tool);

                  return (
                    <tr className="text-slate-200 hover:bg-white/[0.03]" key={tool.id}>
                      <td className="px-4 py-3 font-medium text-white">{tool.productName}</td>
                      <td className="px-4 py-3">{formatNullable(tool.articleNumber)}</td>
                      <td className="px-4 py-3">{tool.manufacturer?.name ?? "-"}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-md border px-2 py-1 text-xs ${placement.tone}`}>
                          {placement.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-slate-200 hover:border-accent"
                          onClick={() => onView(tool)}
                          type="button"
                        >
                          <Eye size={15} /> Open
                        </button>
                      </td>
                    </tr>
                  );
                })
              : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LoadingRow() {
  return (
    <tr>
      <td className="px-4 py-4" colSpan={5}>
        <div className="h-5 animate-pulse rounded bg-white/10" />
      </td>
    </tr>
  );
}

function EmptyRow() {
  const { t } = useTranslation("locations");
  return (
    <tr>
      <td className="px-4 py-10 text-center text-slate-400" colSpan={5}>
        {t("unassigned.empty")}
      </td>
    </tr>
  );
}
