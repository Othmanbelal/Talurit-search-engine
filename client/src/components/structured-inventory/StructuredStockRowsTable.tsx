import type React from "react";
import { Archive, ChevronRight, Eye, PackageMinus, RotateCcw, Trash2 } from "lucide-react";
import type { StructuredInventoryTable, StructuredStockRow, TableColumnSettings } from "../../types/structured-inventory";

export type StockColumnKey = string;

export const stockTableColumns: { key: StockColumnKey; label: string }[] = [
  { key: "item", label: "Item" },
  { key: "article", label: "Article" },
  { key: "manufacturer", label: "Manufacturer" },
  { key: "category", label: "Category" },
  { key: "placement", label: "Placement" },
  { key: "compartment", label: "Fack" },
  { key: "quantity", label: "Qty" },
  { key: "unitPrice", label: "Unit price" },
];

export const defaultStockColumns: StockColumnKey[] = ["item", "article", "manufacturer", "placement", "compartment", "quantity"];

export function StructuredStockRowsTable({
  onArchive,
  onDelete,
  onMove,
  onOpen,
  onRestore,
  rows,
  table,
  highlightedRowId,
}: {
  onArchive?: (row: StructuredStockRow) => void;
  onDelete?: (row: StructuredStockRow) => void;
  highlightedRowId?: string | null;
  onMove?: (row: StructuredStockRow) => void;
  onOpen: (row: StructuredStockRow) => void;
  onRestore?: (row: StructuredStockRow) => void;
  rows: StructuredStockRow[];
  table: StructuredInventoryTable | null;
}) {
  const visibleColumns = selectedColumns(table);
  if (rows.length === 0) {
    return <div className="rounded-lg border border-line bg-panel p-6 text-sm text-slate-400">No stock rows found.</div>;
  }

  return (
    <div>
      {/* Mobile: card list (hidden on md+) */}
      <div className="space-y-2 md:hidden">
        {rows.map((row) => (
          <button
            className={[
              "w-full rounded-lg border bg-panel p-4 text-left shadow-industrial",
              row.id === highlightedRowId ? "border-accent/60 bg-accent/5" : "border-line",
            ].join(" ")}
            id={`row-${row.id}`}
            key={row.id}
            onClick={() => onOpen(row)}
            type="button"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-white">{row.item.name}</p>
                <p className="mt-0.5 text-sm text-slate-400">
                  {row.item.articleNumber ?? row.item.alternativeArticleNumber ?? "-"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {formatPlacement(row.location)}
                  {row.compartment ? ` / FACK ${row.compartment}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-sm text-slate-300">
                  {formatNumber(row.quantity)} {row.unit}
                </span>
                <ChevronRight className="text-slate-500" size={16} />
              </div>
            </div>
            {rowActivityTags(row).length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {rowActivityTags(row).map((tag) => <ActivityTagPill key={activityTagKey(tag)} tag={tag} />)}
              </div>
            ) : null}
          </button>
        ))}
      </div>

      {/* Desktop: existing table (hidden below md) */}
      <div className="hidden overflow-hidden rounded-lg border border-line bg-panel shadow-industrial md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line text-sm">
            <thead className="bg-white/[0.04] text-left text-xs uppercase tracking-[0.16em] text-slate-400">
              <tr>
                {visibleColumns.map((column) => <Header key={column}>{labelForColumn(column, table)}</Header>)}
                <Header>Actions</Header>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr className={row.id === highlightedRowId ? "bg-accent/15 ring-1 ring-inset ring-accent/60" : "hover:bg-white/[0.03]"} id={`row-${row.id}`} key={row.id}>
                  {visibleColumns.map((column) => (
                    <Cell key={column} strong={column === "item"}>{renderStockCell(row, column)}</Cell>
                  ))}
                  <Cell><RowActions row={row} onArchive={onArchive} onDelete={onDelete} onMove={onMove} onOpen={onOpen} onRestore={onRestore} /></Cell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RowActions({ onArchive, onDelete, onMove, onOpen, onRestore, row }: {
  onArchive?: (row: StructuredStockRow) => void;
  onDelete?: (row: StructuredStockRow) => void;
  onMove?: (row: StructuredStockRow) => void;
  onOpen: (row: StructuredStockRow) => void;
  onRestore?: (row: StructuredStockRow) => void;
  row: StructuredStockRow;
}) {
  return (
    <div className="flex gap-2">
      <IconButton label="Open" onClick={() => onOpen(row)}><Eye size={15} /></IconButton>
      {onMove ? <IconButton label="Take out / Use in" onClick={() => onMove(row)}><PackageMinus size={15} /></IconButton> : null}
      {row.status === "archived"
        ? (onRestore ? <IconButton label="Restore" onClick={() => onRestore(row)}><RotateCcw size={15} /></IconButton> : null)
        : (onArchive ? <IconButton label="Archive" onClick={() => onArchive(row)}><Archive size={15} /></IconButton> : null)}
      {onDelete ? <IconButton danger label="Remove" onClick={() => onDelete(row)}><Trash2 size={15} /></IconButton> : null}
    </div>
  );
}

export function selectedColumns(table: StructuredInventoryTable | null): StockColumnKey[] {
  return selectedColumnsFromSettings(table?.columnSettings);
}

export function selectedColumnsFromSettings(settings?: TableColumnSettings): StockColumnKey[] {
  const keys = new Set(availableColumns(settings).map((column) => column.key));
  const saved = settings?.visibleColumns.filter((column) => keys.has(column));
  return saved && saved.length > 0 ? saved : defaultStockColumns;
}

export function availableColumns(settings?: TableColumnSettings) {
  const labels = settings?.columnLabels ?? {};
  return [...stockTableColumns, ...(settings?.customColumns ?? [])].map((column) => ({
    ...column,
    label: labels[column.key] ?? column.label,
  }));
}

export function renderStockCell(row: StructuredStockRow, key: StockColumnKey): React.ReactNode {
  if (key.startsWith("attr:")) return attributeValue(row, key);
  if (key === "item") return <ItemCell row={row} />;
  if (key === "article") return row.item.articleNumber ?? row.item.alternativeArticleNumber ?? "-";
  if (key === "manufacturer") return row.item.manufacturer ?? "-";
  if (key === "category") return row.item.category ?? "-";
  if (key === "placement") return formatPlacement(row.location);
  if (key === "compartment") return row.compartment ?? "-";
  if (key === "quantity") return `${formatNumber(row.quantity)} ${row.unit}`;
  if (key === "unitPrice") return row.unitPrice === null ? "-" : `${formatNumber(row.unitPrice ?? 0)} ${row.currency}`;
  return "-";
}

function ItemCell({ row }: { row: StructuredStockRow }) {
  const tags = rowActivityTags(row);
  return (
    <div>
      <div>{row.item.name}</div>
      {tags.length > 0 ? (
        <div className="mt-1 flex flex-wrap gap-1">
          {tags.map((tag) => <ActivityTagPill key={activityTagKey(tag)} tag={tag} />)}
        </div>
      ) : null}
    </div>
  );
}

function ActivityTagPill({ tag }: { tag: NonNullable<StructuredStockRow["activityTags"]>[number] }) {
  const isTaken = tag.type === "taken";
  const tone = isTaken ? "border-orange-400/40 bg-orange-500/10 text-orange-200" : "border-accent/40 bg-accent/10 text-accent";
  return <span className={`rounded border px-2 py-0.5 text-[11px] ${tone}`}>{activityTagLabel(tag)}</span>;
}

function activityTagLabel(tag: NonNullable<StructuredStockRow["activityTags"]>[number]) {
  if (tag.type === "taken") return `x${formatNumber(tag.quantity)} taken by ${tag.userName}`;
  return `x${formatNumber(tag.quantity)} used in ${tag.cardName ?? "card"} by ${tag.userName}`;
}

function activityTagKey(tag: NonNullable<StructuredStockRow["activityTags"]>[number]) {
  return `${tag.type}:${tag.cardId ?? ""}:${tag.cardName ?? ""}:${tag.userName}`;
}

function rowActivityTags(row: StructuredStockRow) {
  if (row.activityTags?.length) return row.activityTags;
  return row.usageTags.map((tag) => ({ ...tag, type: "used_in" as const, userName: "Unknown user" }));
}

function formatPlacement(location: StructuredStockRow["location"]) {
  if (!location) return "Unassigned";
  if (location.locationType === "used_in") return `Used in: ${location.code}`;
  if (location.locationType === "location_in") return `Location in: ${location.code}`;
  return location.code;
}

export function labelForColumn(key: StockColumnKey, table?: StructuredInventoryTable | null) {
  return availableColumns(table?.columnSettings).find((column) => column.key === key)?.label ?? key;
}

export function labelForSettings(key: StockColumnKey, settings?: TableColumnSettings) {
  return availableColumns(settings).find((column) => column.key === key)?.label ?? key;
}

function Header({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 font-semibold">{children}</th>;
}

function Cell({ children, strong = false }: { children: React.ReactNode; strong?: boolean }) {
  return <td className={`px-4 py-3 ${strong ? "font-semibold text-white" : "text-slate-300"}`}>{children}</td>;
}

function IconButton({ children, danger = false, label, onClick }: {
  children: React.ReactNode;
  danger?: boolean;
  label: string;
  onClick: () => void;
}) {
  const tone = danger ? "hover:border-red-400 hover:text-red-200" : "hover:border-accent hover:text-accent";
  return (
    <button className={`rounded-md border border-line bg-white/[0.04] p-2 text-slate-300 ${tone}`} onClick={onClick} title={label} type="button">
      {children}
    </button>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 2 }).format(value);
}

export function attributeColumnKey(name: string) {
  return `attr:${name.trim().toLowerCase().replace(/[^a-z0-9åäö]+/gi, "_").replace(/^_+|_+$/g, "")}`;
}

function attributeValue(row: StructuredStockRow, key: string) {
  const attribute = row.item.attributes.find((candidate) => attributeColumnKey(candidate.name) === key);
  if (!attribute) return "-";
  const value = attribute.rawValue ?? attribute.numericValue ?? "-";
  return attribute.unit ? `${value} ${attribute.unit}` : value;
}
