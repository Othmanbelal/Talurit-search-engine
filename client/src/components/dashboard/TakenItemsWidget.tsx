import { Package, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  listTakenItemsRequest,
  returnTakenItemRequest,
} from "../../services/structured-inventory.service";
import type { TakenStockItem } from "../../types/structured-inventory";

export function TakenItemsWidget() {
  const { t } = useTranslation("dashboard");
  const [items, setItems] = useState<TakenStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [returning, setReturning] = useState<string | null>(null);

  function load() {
    listTakenItemsRequest()
      .then((r) => setItems(r.items))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleReturn(id: string) {
    setReturning(id);
    try {
      await returnTakenItemRequest(id);
      load();
    } finally {
      setReturning(null);
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Package size={16} className="text-slate-400" />
          <h2 className="font-semibold text-white">{t("takenItems.title")}</h2>
          {items.length > 0 && (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-300">
              {items.length}
            </span>
          )}
        </div>
        {items.length > 5 && (
          <Link className="text-xs text-slate-400 hover:text-accent" to="/taken-items">
            {t("takenItems.viewAll")}
          </Link>
        )}
      </div>

      {loading && <p className="text-sm text-slate-500">{t("managerTables.loading")}</p>}

      {!loading && items.length === 0 && (
        <p className="rounded-lg border border-line bg-white/[0.02] p-4 text-sm text-slate-500">
          {t("takenItems.empty")}
        </p>
      )}

      {items.length > 0 && (
        <div className="space-y-2">
          {items.slice(0, 5).map((item) => (
            <TakenItemRow
              key={item.id}
              item={item}
              onReturn={() => void handleReturn(item.id)}
              returning={returning === item.id}
            />
          ))}
          {items.length > 5 && (
            <p className="text-center text-xs text-slate-500">
              {t("takenItems.more", { count: items.length - 5 })}{" "}
              <Link className="text-accent hover:underline" to="/taken-items">
                {t("takenItems.viewAllLink")}
              </Link>
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function TakenItemRow({
  item,
  onReturn,
  returning,
}: {
  item: TakenStockItem;
  onReturn: () => void;
  returning: boolean;
}) {
  const { t } = useTranslation("dashboard");
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white/[0.03] px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-white">{item.sourceRow.item.name}</p>
        <p className="text-xs text-slate-500">
          {item.sourceTable.name} · {t("takenItems.qty")} {item.quantity} · {formatTimeAgo(new Date(item.createdAt))}
        </p>
      </div>
      <button
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-accent hover:text-accent disabled:opacity-50"
        disabled={returning}
        onClick={onReturn}
        type="button"
      >
        <RotateCcw size={12} /> {returning ? "…" : t("takenItems.return")}
      </button>
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
