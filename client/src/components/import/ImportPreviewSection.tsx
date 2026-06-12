import type { ReactNode } from "react";
import type { ExcelPreview, SheetPreview } from "../../types/import";

type ImportPreviewSectionProps = {
  preview: ExcelPreview;
};

export function ImportPreviewSection({ preview }: ImportPreviewSectionProps) {
  return (
    <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
      <SheetStatusPanel sheets={preview.sheets} />
      <section className="space-y-5">
        <PreviewTable
          columns={[
            { header: "Row", render: (tool) => tool.sourceRowNumber },
            { header: "Product", render: (tool) => tool.productName },
            { header: "Article", render: (tool) => tool.articleNumber },
            { header: "Manufacturer", render: (tool) => tool.manufacturerName },
            { header: "Location", render: (tool) => tool.locationRawLabel },
          ]}
          rows={preview.tools.slice(0, 8)}
          title="Tool preview"
        />
        <PreviewTable
          columns={[
            { header: "Label", render: (location) => location.rawLabel },
            { header: "Shelf", render: (location) => location.shelf },
            { header: "Compartment", render: (location) => location.compartment },
            {
              header: "Map",
              render: (location) =>
                location.mapRow && location.mapColumn
                  ? `${location.mapRow}:${location.mapColumn}`
                  : null,
            },
          ]}
          rows={preview.locations.slice(0, 8)}
          title="Location preview"
        />
      </section>
    </div>
  );
}

function SheetStatusPanel({ sheets }: { sheets: SheetPreview[] }) {
  return (
    <section className="rounded-lg border border-line bg-panel p-4 shadow-industrial">
      <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Sheets</h2>
      <div className="mt-4 space-y-2">
        {sheets.map((sheet) => (
          <div
            className="flex items-center justify-between gap-3 rounded-md border border-line bg-slate-950/50 px-3 py-2"
            key={sheet.sheetName}
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-white">{sheet.sheetName}</div>
              <div className="text-xs text-slate-500">{sheet.message ?? `${sheet.rowsRead} rows`}</div>
            </div>
            <span className={statusClassName(sheet.status)}>{sheet.status}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function PreviewTable<T>({
  columns,
  rows,
  title,
}: {
  columns: { header: string; render: (row: T) => ReactNode }[];
  rows: T[];
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-panel shadow-industrial">
      <div className="border-b border-line px-4 py-3">
        <h2 className="text-base font-semibold text-white">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {columns.map((column) => (
                <th className="px-4 py-3 font-semibold" key={column.header}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length > 0 ? (
              rows.map((row, rowIndex) => (
                <tr className="text-slate-200" key={rowIndex}>
                  {columns.map((column) => (
                    <td className="max-w-64 truncate px-4 py-3" key={column.header}>
                      {formatValue(column.render(row))}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-4 py-5 text-slate-500" colSpan={columns.length}>
                  No rows found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatValue(value: ReactNode) {
  return value === null || value === undefined || value === "" ? "-" : value;
}

function statusClassName(status: SheetPreview["status"]) {
  const base = "rounded-full border px-2 py-1 text-xs capitalize";

  if (status === "processed") return `${base} border-emerald-400/30 text-emerald-300`;
  if (status === "ignored") return `${base} border-amber-400/30 text-amber-300`;
  return `${base} border-red-400/30 text-red-300`;
}
