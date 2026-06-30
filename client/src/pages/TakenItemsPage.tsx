import { RotateCcw, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { listTakenItemsRequest, returnTakenItemRequest } from "../services/structured-inventory.service";
import { labelForSettings, renderStockCell, selectedColumnsFromSettings } from "../components/structured-inventory/StructuredStockRowsTable";
import type { TakenStockItem, TableColumnSettings } from "../types/structured-inventory";

export function TakenItemsPage() {
  const { t } = useTranslation("taken");
  const [items, setItems] = useState<TakenStockItem[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  function loadItems() {
    listTakenItemsRequest()
      .then((result) => {
        setItems(result.items);
        setError(null);
      })
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : t("error.unavailable")));
  }

  useEffect(loadItems, []);

  async function returnItem(id: string) {
    try {
      await returnTakenItemRequest(id);
      loadItems();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t("error.returnFailed"));
    }
  }

  const q = search.trim().toLowerCase();
  const filteredItems = q
    ? items.filter((item) => {
        const cols = selectedColumnsFromSettings(item.sourceTable.columnSettings);
        const cellValues = cols.map((col) => String(renderStockCell(item.sourceRow, col) ?? "").toLowerCase());
        return (
          item.sourceTable.name.toLowerCase().includes(q) ||
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
      {itemsByTable(filteredItems).map((group) => <TakenTable group={group} key={group.tableId} onReturn={(id) => void returnItem(id)} />)}
    </div>
  );
}

function TakenTable({ group, onReturn }: {
  group: { tableId: string; tableName: string; items: TakenStockItem[]; columns: TableColumnSettings };
  onReturn: (id: string) => void;
}) {
  const { t } = useTranslation("taken");
  const columns = selectedColumnsFromSettings(group.columns);
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-white">{group.tableName}</h2>
      <div className="overflow-hidden rounded-lg border border-line bg-panel shadow-industrial">
        <table className="min-w-full divide-y divide-line text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
            <tr>{columns.map((column) => <th className="px-4 py-3" key={column}>{labelForSettings(column, group.columns)}</th>)}<th className="px-4 py-3">{t("table.taken")}</th><th className="px-4 py-3">{t("table.action")}</th></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {group.items.map((item) => (
              <tr className="text-slate-200" key={item.id}>
                {columns.map((column) => <td className="max-w-64 truncate px-4 py-3" key={column}>{renderStockCell(item.sourceRow, column)}</td>)}
                <td className="px-4 py-3">{item.quantity}</td>
                <td className="px-4 py-3">
                  <button className="inline-flex items-center gap-2 rounded-md border border-line bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-accent hover:text-accent" onClick={() => onReturn(item.id)} type="button">
                    <RotateCcw size={14} /> {t("table.return")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function itemsByTable(items: TakenStockItem[]) {
  const groups = new Map<string, { tableId: string; tableName: string; items: TakenStockItem[]; columns: TableColumnSettings }>();
  for (const item of items) {
    const current = groups.get(item.sourceTable.id) ?? { tableId: item.sourceTable.id, tableName: item.sourceTable.name, items: [], columns: item.sourceTable.columnSettings };
    current.items.push(item);
    groups.set(item.sourceTable.id, current);
  }
  return Array.from(groups.values());
}
