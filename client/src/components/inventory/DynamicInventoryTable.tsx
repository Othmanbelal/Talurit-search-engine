import { useTranslation } from "react-i18next";
import type { DynamicInventoryColumn, DynamicInventoryRow } from "../../types/inventory";

type DynamicInventoryTableProps = {
  columns: DynamicInventoryColumn[];
  rows: DynamicInventoryRow[];
  selectedRowIds?: Set<string>;
  onToggleRow?: (rowId: string) => void;
};

export function DynamicInventoryTable({
  columns,
  rows,
  selectedRowIds,
  onToggleRow,
}: DynamicInventoryTableProps) {
  const { t } = useTranslation("inventory");
  const selectable = Boolean(selectedRowIds && onToggleRow);

  return (
    <section className="overflow-hidden rounded-lg border border-line bg-panel shadow-industrial">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
            <tr>
              {selectable ? <th className="w-12 px-4 py-3 font-medium" /> : null}
              <th className="px-4 py-3 font-medium">{t("legacy.row")}</th>
              {columns.map((column) => (
                <th className="min-w-36 px-4 py-3 font-medium" key={column.key}>
                  {column.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-10 text-center text-slate-400" colSpan={columns.length + 2}>
                  {t("table.noRowsFound")}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr className="text-slate-200 hover:bg-white/[0.03]" key={row.id}>
                  {selectable ? (
                    <td className="px-4 py-3">
                      <input
                        checked={selectedRowIds?.has(row.id) ?? false}
                        className="h-4 w-4 rounded border-line bg-slate-950"
                        onChange={() => onToggleRow?.(row.id)}
                        type="checkbox"
                      />
                    </td>
                  ) : null}
                  <td className="px-4 py-3 text-slate-400">{row.rowNumber}</td>
                  {columns.map((column) => (
                    <td className="max-w-64 truncate px-4 py-3" key={column.key}>
                      {formatCell(row.data[column.key])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatCell(value?: string | null) {
  return value === undefined || value === null || value === "" ? "-" : value;
}
