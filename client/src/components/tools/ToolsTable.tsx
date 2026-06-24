import { Archive, ChevronRight, Eye, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatToolStatus } from "../../constants/tool-statuses";
import type { Tool, ToolFilters } from "../../types/tools";
import {
  formatLocationCompartment,
  formatLocationShelf,
  formatNullable,
} from "../../utils/tool-format";
import { PlacementBadge } from "./PlacementBadge";

type ToolsTableProps = {
  canDelete: boolean;
  canEdit: boolean;
  filters: ToolFilters;
  isLoading: boolean;
  onArchive: (tool: Tool) => void;
  onDelete: (tool: Tool) => void;
  onEdit: (tool: Tool) => void;
  onRestore: (tool: Tool) => void;
  onSort: (sortBy: ToolFilters["sortBy"]) => void;
  onView: (tool: Tool) => void;
  tools: Tool[];
};

export function ToolsTable({
  canDelete,
  canEdit,
  filters,
  isLoading,
  onArchive,
  onDelete,
  onEdit,
  onRestore,
  onSort,
  onView,
  tools,
}: ToolsTableProps) {
  const { t } = useTranslation("tools");
  return (
    <div>
      {/* Mobile: card list */}
      <div className="space-y-2 md:hidden">
        {isLoading ? (
          <div className="h-24 animate-pulse rounded-lg border border-line bg-white/5" />
        ) : null}
        {!isLoading && tools.length === 0 ? (
          <p className="rounded-lg border border-line bg-panel p-6 text-sm text-slate-400">
            {t("table.noMatch")}
          </p>
        ) : null}
        {!isLoading
          ? tools.map((tool) => (
              <button
                className="w-full rounded-lg border border-line bg-panel p-4 text-left shadow-industrial"
                key={tool.id}
                onClick={() => onView(tool)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{tool.productName}</p>
                    <p className="mt-0.5 text-sm text-slate-400">
                      {[tool.articleNumber, tool.manufacturer?.name, tool.toolType?.name]
                        .filter(Boolean)
                        .join(" / ") || "No metadata"}
                    </p>
                    <div className="mt-2">
                      <PlacementBadge tool={tool} />
                    </div>
                  </div>
                  <ChevronRight className="mt-1 shrink-0 text-slate-500" size={16} />
                </div>
              </button>
            ))
          : null}
      </div>

      {/* Desktop: existing table */}
      <section className="hidden overflow-hidden rounded-lg border border-line bg-panel shadow-industrial backdrop-blur md:block">
        <div className="overflow-x-auto">
          <table className="min-w-[1220px] table-fixed divide-y divide-line text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <HeaderButton label={t("table.product")} onClick={() => onSort("productName")} />
                <HeaderButton label={t("table.article")} onClick={() => onSort("articleNumber")} />
                <HeaderButton label={t("table.manufacturer")} onClick={() => onSort("manufacturer")} />
                <th className="px-4 py-3 font-medium">{t("table.type")}</th>
                <th className="px-4 py-3 font-medium">{t("table.location")}</th>
                <th className="px-4 py-3 font-medium">{t("table.fack")}</th>
                <th className="w-40 px-4 py-3 font-medium">{t("table.placement")}</th>
                <th className="px-4 py-3 text-center font-medium" title={t("table.diameter")}>{t("table.diameter")}</th>
                <HeaderButton label={t("table.qty")} onClick={() => onSort("quantity")} />
                <th className="px-4 py-3 font-medium">{t("table.status")}</th>
                <th className="w-48 px-4 py-3 font-medium">{t("table.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading ? <LoadingRows /> : null}
              {!isLoading && tools.length === 0 ? <EmptyRow /> : null}
              {!isLoading
                ? tools.map((tool) => (
                    <tr className="text-slate-200 hover:bg-white/[0.03]" key={tool.id}>
                      <td className="px-4 py-3">
                        <div className="max-w-56 truncate font-medium text-white">{tool.productName}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{formatNullable(tool.articleNumber)}</td>
                      <td className="px-4 py-3 text-slate-300">{tool.manufacturer?.name ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-300">{tool.toolType?.name ?? "-"}</td>
                      <td className="px-4 py-3 text-slate-300">{formatLocationShelf(tool.location)}</td>
                      <td className="px-4 py-3 text-slate-300">{formatLocationCompartment(tool.location)}</td>
                      <td className="px-4 py-3">
                        <PlacementBadge tool={tool} />
                      </td>
                      <td className="px-4 py-3 text-center text-slate-300">{formatNullable(tool.diameter)}</td>
                      <td className="px-4 py-3 text-slate-300">{formatNullable(tool.quantity)}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-md border border-line bg-white/5 px-2 py-1 text-xs text-slate-200">
                          {formatToolStatus(tool.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <IconButton label={t("table.view")} onClick={() => onView(tool)} icon={Eye} />
                          {canEdit && !tool.isArchived ? (
                            <IconButton label={t("table.edit")} onClick={() => onEdit(tool)} icon={Pencil} />
                          ) : null}
                          {canEdit && tool.isArchived ? (
                            <IconButton label={t("table.restore")} onClick={() => onRestore(tool)} icon={RotateCcw} />
                          ) : null}
                          {canEdit && !tool.isArchived ? (
                            <IconButton label={t("table.archive")} onClick={() => onArchive(tool)} icon={Archive} />
                          ) : null}
                          {canDelete ? <IconButton label={t("table.delete")} onClick={() => onDelete(tool)} icon={Trash2} /> : null}
                        </div>
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-4 py-3 text-xs text-slate-500">
          {t("table.sortedBy", { field: filters.sortBy, direction: filters.sortDirection })}
        </div>
      </section>
    </div>
  );
}

function HeaderButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <th className="px-4 py-3 font-medium">
      <button className="text-left hover:text-accent" onClick={onClick} type="button">
        {label}
      </button>
    </th>
  );
}

function IconButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white/5 text-slate-200 hover:border-accent"
      onClick={onClick}
      title={label}
      type="button"
    >
      <Icon size={15} />
    </button>
  );
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <tr key={index}>
          <td className="px-4 py-4" colSpan={11}>
            <div className="h-5 animate-pulse rounded bg-white/10" />
          </td>
        </tr>
      ))}
    </>
  );
}

function EmptyRow() {
  const { t } = useTranslation("tools");
  return (
    <tr>
      <td className="px-4 py-10 text-center text-slate-400" colSpan={11}>
        {t("table.noMatch")}
      </td>
    </tr>
  );
}
