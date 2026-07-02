import { Package } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { BorrowRecordActions } from "../structured-inventory/BorrowRecordActions";
import { listBorrowedItemsRequest } from "../../services/structured-inventory.service";
import type { BorrowedItem } from "../../types/structured-inventory";

export function BorrowedItemsWidget() {
  const { t } = useTranslation("dashboard");
  const [items, setItems] = useState<BorrowedItem[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    listBorrowedItemsRequest()
      .then((r) => setItems(r.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Package size={16} className="text-slate-400" />
          <h2 className="font-semibold text-white">{t("borrowedItems.title")}</h2>
          {items.length > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-300">
              {items.length}
            </span>
          )}
        </div>
        {items.length > 5 && (
          <Link className="text-xs text-slate-400 hover:text-accent" to="/borrowed-items">
            {t("borrowedItems.viewAll")}
          </Link>
        )}
      </div>

      {loading && <p className="text-sm text-slate-500">{t("managerTables.loading")}</p>}

      {!loading && items.length === 0 && (
        <p className="rounded-lg border border-line bg-white/[0.02] p-4 text-sm text-slate-500">
          {t("borrowedItems.empty")}
        </p>
      )}

      {items.length > 0 && (
        <div className="space-y-2">
          {items.slice(0, 5).map((item) => (
            <BorrowedItemRow item={item} key={item.id} onChanged={load} />
          ))}
          {items.length > 5 && (
            <p className="text-center text-xs text-slate-500">
              {t("borrowedItems.more", { count: items.length - 5 })}{" "}
              <Link className="text-accent hover:underline" to="/borrowed-items">
                {t("borrowedItems.viewAllLink")}
              </Link>
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function BorrowedItemRow({ item, onChanged }: { item: BorrowedItem; onChanged: () => void }) {
  const { t } = useTranslation("dashboard");
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white/[0.03] px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{item.sourceRow.item.name}</p>
        <p className="text-xs text-slate-500">
          {item.sourceTable.name} · {t("borrowedItems.qty")} {item.quantity} ·{" "}
          {t("borrowedItems.holder", { name: item.currentHolder?.name ?? t("borrowedItems.unknownHolder") })} ·{" "}
          {formatTimeAgo(new Date(item.createdAt))}
        </p>
      </div>
      <BorrowRecordActions item={item} onChanged={onChanged} />
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}
