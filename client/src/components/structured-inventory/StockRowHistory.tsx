import { Clock } from "lucide-react";
import { UserAvatar } from "../UserAvatar";
import { useEffect, useState } from "react";
import { getStockRowHistoryRequest } from "../../services/structured-inventory.service";
import type { ItemInteractionLog } from "../../types/structured-inventory";

const ACTION_LABELS: Record<string, string> = {
  add: "Added",
  edit: "Edited",
  archive: "Archived",
  restore: "Restored",
  delete: "Deleted",
  take: "Taken out",
  return: "Returned",
  use_in: "Used in card",
  return_used: "Returned from card",
};

const ACTION_COLORS: Record<string, string> = {
  add: "bg-emerald-500/15 text-emerald-300",
  edit: "bg-blue-500/15 text-blue-300",
  archive: "bg-amber-500/15 text-amber-300",
  restore: "bg-emerald-500/15 text-emerald-300",
  delete: "bg-red-500/15 text-red-300",
  take: "bg-orange-500/15 text-orange-300",
  return: "bg-teal-500/15 text-teal-300",
  use_in: "bg-purple-500/15 text-purple-300",
  return_used: "bg-teal-500/15 text-teal-300",
};

export function StockRowHistory({ rowId, refreshKey }: { rowId: string; refreshKey?: number }) {
  const [logs, setLogs] = useState<ItemInteractionLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getStockRowHistoryRequest(rowId)
      .then((result) => setLogs(result.history))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [rowId, refreshKey]);

  return (
    <section className="rounded-lg border border-line bg-white/[0.03] p-4">
      <div className="flex items-center gap-2">
        <Clock size={14} className="text-slate-400" />
        <h3 className="font-semibold text-white">Activity — last 7 days</h3>
      </div>
      {loading ? (
        <p className="mt-3 text-sm text-slate-500">Loading history…</p>
      ) : logs.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No activity recorded in the last 7 days.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {logs.map((log) => (
            <HistoryEntry key={log.id} log={log} />
          ))}
        </ul>
      )}
    </section>
  );
}

function HistoryEntry({ log }: { log: ItemInteractionLog }) {
  const label = ACTION_LABELS[log.action] ?? log.action;
  const colorClass = ACTION_COLORS[log.action] ?? "bg-slate-500/15 text-slate-300";
  const date = new Date(log.createdAt);
  const dateStr = date.toLocaleDateString("sv-SE", { month: "short", day: "numeric" });
  const timeStr = date.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });

  return (
    <li className="flex items-start gap-3 rounded-md border border-line/50 bg-white/[0.02] px-3 py-2">
      <span className={`mt-0.5 shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${colorClass}`}>{label}</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          {log.quantity ? <span className="text-sm font-semibold text-white">×{log.quantity}</span> : null}
          {log.userName ? (
            <span className="flex items-center gap-2 text-sm font-medium text-slate-200">
              <UserAvatar name={log.userName} pictureUrl={log.userPictureUrl} size={34} />
              {log.userName}
            </span>
          ) : null}
          {log.notes ? <span className="truncate text-xs text-slate-500">{log.notes}</span> : null}
        </div>
        <p className="mt-0.5 text-xs text-slate-500">{dateStr} {timeStr}</p>
      </div>
    </li>
  );
}
