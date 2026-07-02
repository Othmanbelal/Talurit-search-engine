import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BorrowRecordActions } from "../components/structured-inventory/BorrowRecordActions";
import { listBorrowedItemsRequest } from "../services/structured-inventory.service";
import { labelForSettings, renderStockCell, selectedColumnsFromSettings } from "../components/structured-inventory/StructuredStockRowsTable";
import type { BorrowedItem, TableColumnSettings } from "../types/structured-inventory";

export function BorrowedItemsPage() {
  const { t } = useTranslation("borrowed");
  const [items, setItems] = useState<BorrowedItem[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  function loadItems() {
    listBorrowedItemsRequest()
      .then((result) => {
        setItems(result.items);
        setError(null);
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : t("error.unavailable")));
  }

  useEffect(loadItems, []);

  const q = search.trim().toLowerCase();
  const filteredItems = q
    ? items.filter((item) => {
        const cols = selectedColumnsFromSettings(item.sourceTable.columnSettings);
        const cellValues = cols.map((col) => String(renderStockCell(item.sourceRow, col) ?? "").toLowerCase());
        return (
          item.sourceTable.name.toLowerCase().includes(q) ||
          (item.currentHolder?.name.toLowerCase().includes(q) ?? false) ||
          cellValues.some((value) => value.includes(q))
        );
      })
    : items;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{t("sectionLabel")}</p>
        <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">{t("title")}</h1>
      </header>
      <div className="flex items-center gap-2 rounded-lg border border-line bg-white/[0.04] px-3 py-2">
        <Search className="shrink-0 text-slate-500" size={16} />
        <input
          className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("search")}
          value={search}
        />
      </div>
      {error ? <section className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{error}</section> : null}
      {filteredItems.length === 0 ? (
        <section className="rounded-lg border border-line bg-panel p-6 text-sm text-slate-400">
          {items.length === 0 ? t("empty.noItems") : t("empty.noMatch")}
        </section>
      ) : null}
      {itemsByTable(filteredItems).map((group) => <BorrowedTable group={group} key={group.tableId} onChanged={loadItems} />)}
    </div>
  );
}

function BorrowedTable({ group, onChanged }: {
  group: { tableId: string; tableName: string; items: BorrowedItem[]; columns: TableColumnSettings };
  onChanged: () => void;
}) {
  const { t } = useTranslation("borrowed");
  const columns = selectedColumnsFromSettings(group.columns);
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-white">{group.tableName}</h2>
      <div className="overflow-hidden rounded-lg border border-line bg-panel shadow-industrial">
        <table className="min-w-full divide-y divide-line text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
            <tr>
              {columns.map((column) => <th className="px-4 py-3" key={column}>{labelForSettings(column, group.columns)}</th>)}
              <th className="px-4 py-3">{t("table.quantity")}</th>
              <th className="px-4 py-3">{t("table.holder")}</th>
              <th className="px-4 py-3">{t("table.action")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {group.items.map((item) => (
              <tr className="text-slate-200" key={item.id}>
                {columns.map((column) => <td className="max-w-64 truncate px-4 py-3" key={column}>{renderStockCell(item.sourceRow, column)}</td>)}
                <td className="px-4 py-3">{item.quantity}</td>
                <td className="px-4 py-3">{item.currentHolder?.name ?? t("table.unknownHolder")}</td>
                <td className="px-4 py-3"><BorrowRecordActions item={item} onChanged={onChanged} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function itemsByTable(items: BorrowedItem[]) {
  const groups = new Map<string, { tableId: string; tableName: string; items: BorrowedItem[]; columns: TableColumnSettings }>();
  for (const item of items) {
    const current = groups.get(item.sourceTable.id) ?? { tableId: item.sourceTable.id, tableName: item.sourceTable.name, items: [], columns: item.sourceTable.columnSettings };
    current.items.push(item);
    groups.set(item.sourceTable.id, current);
  }
  return Array.from(groups.values());
}
