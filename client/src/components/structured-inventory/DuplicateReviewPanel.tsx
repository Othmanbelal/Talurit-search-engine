import { AlertTriangle, GitMerge, X } from "lucide-react";
import { Modal } from "../Modal";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { listStructuredDuplicateGroupsRequest, mergeStructuredDuplicateRowsRequest } from "../../services/structured-inventory.service";
import type { StructuredDuplicateGroup, StructuredInventoryTable, StructuredStockRow } from "../../types/structured-inventory";
import { attributeColumnKey } from "./StructuredStockRowsTable";

type DuplicateColumn = { key: string; label: string };

export function DuplicateReviewPanel({
  canEdit = true,
  duplicateGroups,
  duplicateRows,
  onChanged,
  table,
  tableId,
}: {
  canEdit?: boolean;
  duplicateGroups: number;
  duplicateRows: number;
  onChanged: () => void;
  table?: StructuredInventoryTable | null;
  tableId?: string;
}) {
  const { t } = useTranslation("inventory");
  const [groups, setGroups] = useState<StructuredDuplicateGroup[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !tableId) return;
    listStructuredDuplicateGroupsRequest(tableId)
      .then((result) => {
        setGroups(result.groups);
        setError(null);
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : t("duplicate.title")));
  }, [isOpen, tableId]);

  async function merge(group: StructuredDuplicateGroup, primaryRowId: string) {
    if (!tableId || !window.confirm(t("duplicate.mergeConfirm"))) return;
    try {
      await mergeStructuredDuplicateRowsRequest(tableId, { primaryRowId, rowIds: group.rows.map((row) => row.id) });
      const result = await listStructuredDuplicateGroupsRequest(tableId);
      setGroups(result.groups);
      onChanged();
    } catch (mergeError) {
      setError(mergeError instanceof Error ? mergeError.message : t("duplicate.merge"));
    }
  }

  return (
    <>
      <button className="rounded-md border border-amber-400/30 bg-amber-500/10 p-3 text-left hover:border-amber-300" onClick={() => setIsOpen(true)} type="button">
        <div className="flex items-center gap-2 text-amber-100">
          <AlertTriangle size={18} />
          <span className="text-lg font-semibold">{duplicateGroups}</span>
        </div>
        <div className="mt-1 text-xs text-amber-100/70">{t("duplicate.groups")}</div>
        <div className="mt-1 text-xs text-slate-400">{duplicateRows} {t("duplicate.rows")}</div>
      </button>
      {isOpen ? (
        <Modal maxWidth="max-w-6xl" onClose={() => setIsOpen(false)}>
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-line p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">{t("duplicate.sectionLabel")}</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">{t("duplicate.title")}</h2>
            </div>
            <button className="rounded-md border border-line bg-white/5 p-2 text-slate-300 hover:text-white" onClick={() => setIsOpen(false)} type="button"><X size={18} /></button>
          </header>
          {error ? <div className="mx-5 mt-5 rounded border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</div> : null}
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            {groups.length === 0 ? <div className="rounded-lg border border-line bg-white/[0.03] p-5 text-sm text-slate-400">{t("duplicate.noFound")}</div> : null}
            {groups.map((group) => <DuplicateGroupTable canEdit={canEdit} group={group} key={group.key} onMerge={merge} table={table} />)}
          </div>
        </Modal>
      ) : null}
    </>
  );
}

function DuplicateGroupTable({ canEdit, group, onMerge, table }: {
  canEdit: boolean;
  group: StructuredDuplicateGroup;
  onMerge: (group: StructuredDuplicateGroup, primaryRowId: string) => void;
  table?: StructuredInventoryTable | null;
}) {
  const { t } = useTranslation("inventory");
  const [primaryRowId, setPrimaryRowId] = useState(group.rows[0]?.id ?? "");
  const columns = duplicateColumns(group.rows, table, t);
  return (
    <section className="rounded-lg border border-line bg-panel shadow-industrial">
      <div className="flex flex-col justify-between gap-3 border-b border-line p-4 md:flex-row md:items-center">
        <div>
          <h3 className="font-semibold text-white">{t("duplicate.matchingRows", { count: group.rows.length })}</h3>
          <p className="text-sm text-slate-400">
            {canEdit ? t("duplicate.selectToKeep") : t("duplicate.reviewOnly")}
          </p>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <select className="rounded-md border border-line bg-slate-950 px-3 py-2 text-sm text-white" onChange={(event) => setPrimaryRowId(event.target.value)} value={primaryRowId}>
              {group.rows.map((row, index) => <option key={row.id} value={row.id}>{t("duplicate.keepRow", { index: index + 1, name: row.item.name })}</option>)}
            </select>
            <button className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-slate-950" onClick={() => onMerge(group, primaryRowId)} type="button">
              <GitMerge size={16} /> {t("duplicate.merge")}
            </button>
          </div>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
            <tr>{columns.map((column) => <th className="min-w-36 px-4 py-3" key={column.key}>{column.label}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {group.rows.map((row) => <tr className="text-slate-200" key={row.id}>{columns.map((column) => <td className="max-w-72 truncate px-4 py-3" key={column.key}>{cellValue(row, column.key)}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function duplicateColumns(rows: StructuredStockRow[], table: StructuredInventoryTable | null | undefined, t: (key: string) => string): DuplicateColumn[] {
  // Collect attribute names: start from table's defined custom columns, then add any
  // seen in rows that aren't already covered (catches imported attrs not in column config).
  const fromTable = table?.columnSettings.customColumns.map((c) => ({ key: c.key, label: table.columnSettings.columnLabels[c.key] ?? c.label })) ?? [];
  const tableKeys = new Set(fromTable.map((c) => c.key));
  const fromRows = Array.from(new Set(rows.flatMap((row) => row.item.attributes.map((a) => a.name))))
    .map((name) => ({ key: attributeColumnKey(name), label: name }))
    .filter((c) => !tableKeys.has(c.key));

  return [
    { key: "item", label: t("duplicate.item") },
    { key: "article", label: t("duplicate.article") },
    { key: "altArticle", label: t("duplicate.altArticle") },
    { key: "manufacturer", label: t("duplicate.manufacturer") },
    { key: "category", label: t("duplicate.category") },
    { key: "grade", label: t("duplicate.grade") },
    { key: "placement", label: t("duplicate.placement") },
    { key: "compartment", label: t("duplicate.compartment") },
    { key: "quantity", label: t("duplicate.qty") },
    { key: "unitPrice", label: t("duplicate.unitPrice") },
    { key: "notes", label: t("duplicate.notes") },
    ...fromTable,
    ...fromRows,
  ];
}

// cellValue is called from JSX in DuplicateGroupTable which already has t — but this is a pure helper.
// "Unassigned" is kept in English here since it's a fallback value rendered inside a table;
// callers may localise before display if needed. The string is covered by duplicate.unassigned in JSON.
function cellValue(row: StructuredStockRow, key: string) {
  if (key.startsWith("attr:")) return attributeValue(row, key);
  if (key === "item") return row.item.name;
  if (key === "article") return row.item.articleNumber ?? "-";
  if (key === "altArticle") return row.item.alternativeArticleNumber ?? "-";
  if (key === "manufacturer") return row.item.manufacturer ?? "-";
  if (key === "category") return row.item.category ?? "-";
  if (key === "grade") return row.item.grade ?? "-";
  if (key === "placement") return row.location?.code ?? "-";
  if (key === "compartment") return row.compartment ?? "-";
  if (key === "quantity") return `${row.quantity} ${row.unit}`;
  if (key === "unitPrice") return row.unitPrice === null ? "-" : `${row.unitPrice ?? 0} ${row.currency}`;
  if (key === "notes") return row.notes ?? "-";
  return "-";
}

function attributeValue(row: StructuredStockRow, key: string) {
  const attribute = row.item.attributes.find((candidate) => attributeColumnKey(candidate.name) === key);
  if (!attribute) return "-";
  return [attribute.rawValue ?? attribute.numericValue ?? "-", attribute.unit].filter(Boolean).join(" ");
}
