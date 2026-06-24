import { ChevronDown, ChevronUp, MessageSquare, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { itemNotesService } from "../../services/itemNotesService";
import type { RecentNote } from "../../types/notes";
import { UserAvatar } from "../UserAvatar";

const TABLE_COLORS = [
  "text-indigo-400 border-indigo-500/30",
  "text-emerald-400 border-emerald-500/30",
  "text-amber-400 border-amber-500/30",
  "text-sky-400 border-sky-500/30",
  "text-rose-400 border-rose-500/30",
];

type Props = {
  onNoteClick?: (note: RecentNote) => void;
};

export function RecentNotesWidget({ onNoteClick }: Props) {
  const { t } = useTranslation("dashboard");
  const [notes, setNotes] = useState<RecentNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    itemNotesService
      .recent(undefined, 50)
      .then(setNotes)
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  }, []);

  const tables = useMemo(() => {
    const seen = new Map<string, string>();
    for (const note of notes) {
      const t = note.stockBalance.inventoryTable;
      if (t && !seen.has(t.id)) seen.set(t.id, t.name);
    }
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [notes]);

  const filtered = useMemo(() => {
    let result = selectedTable
      ? notes.filter((n) => n.stockBalance.inventoryTable?.id === selectedTable)
      : notes;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (n) =>
          (n.stockBalance.inventoryTable?.name ?? "").toLowerCase().includes(q) ||
          n.stockBalance.item.name.toLowerCase().includes(q) ||
          (n.author?.name ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [notes, selectedTable, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, { tableName: string; colorClass: string; notes: RecentNote[] }>();
    const tableOrder = tables.map((t) => t.id);
    for (const note of filtered) {
      const tableId = note.stockBalance.inventoryTable?.id ?? "unknown";
      const tableName = note.stockBalance.inventoryTable?.name ?? "Unknown table";
      if (!map.has(tableId)) {
        const colorIdx = tableOrder.indexOf(tableId) % TABLE_COLORS.length;
        map.set(tableId, { tableName, colorClass: TABLE_COLORS[colorIdx], notes: [] });
      }
      map.get(tableId)!.notes.push(note);
    }
    return [...map.entries()];
  }, [filtered, tables]);

  const totalCount = notes.length;

  return (
    <section className="space-y-3">
      {/* Header row — always visible */}
      <div className="flex items-center justify-between gap-3">
        <button
          className="flex items-center gap-2 hover:text-white transition-colors"
          onClick={() => setExpanded((v) => !v)}
          type="button"
        >
          <MessageSquare size={16} className="text-slate-400" />
          <h2 className="font-semibold text-white">{t("recentNotes.title")}</h2>
          {totalCount > 0 && (
            <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs font-semibold text-slate-300">
              {totalCount}
            </span>
          )}
          {expanded ? (
            <ChevronUp size={14} className="text-slate-500" />
          ) : (
            <ChevronDown size={14} className="text-slate-500" />
          )}
        </button>

        {expanded && (
          <div className="flex items-center gap-2">
            {tables.length > 1 && (
              <select
                className="rounded-md border border-line bg-slate-950 px-2.5 py-1.5 text-xs text-slate-300"
                onChange={(e) => setSelectedTable(e.target.value)}
                value={selectedTable}
              >
                <option value="">{t("recentNotes.allTables")}</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                className="rounded-md border border-line bg-slate-950 pl-7 pr-3 py-1.5 text-xs text-slate-300 placeholder:text-slate-600 focus:border-accent focus:outline-none w-44"
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("recentNotes.searchPlaceholder")}
                value={search}
              />
            </div>
          </div>
        )}
      </div>

      {/* Collapsible body */}
      {expanded && (
        <>
          {loading && <p className="text-sm text-slate-500">{t("recentNotes.loadingNotes")}</p>}

          {!loading && grouped.length === 0 && (
            <p className="rounded-lg border border-line bg-white/[0.02] p-4 text-sm text-slate-500">
              {search || selectedTable ? t("recentNotes.noMatch") : t("recentNotes.empty")}
            </p>
          )}

          {grouped.map(([tableId, { tableName, colorClass, notes: tableNotes }]) => (
            <div key={tableId}>
              <p className={`mb-2 text-xs font-semibold uppercase tracking-[0.14em] ${colorClass.split(" ")[0]}`}>
                {tableName}
              </p>
              <div className={`rounded-lg border bg-white/[0.02] p-3 space-y-3 ${colorClass.split(" ")[1]}`}>
                {tableNotes.map((note) => (
                  <NoteRow key={note.id} note={note} onClick={onNoteClick} />
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </section>
  );
}

function NoteRow({ note, onClick }: { note: RecentNote; onClick?: (note: RecentNote) => void }) {
  const { t } = useTranslation("dashboard");
  const date = new Date(note.createdAt);
  const dateStr = date.toLocaleString("sv-SE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={`flex gap-3 rounded-md p-1.5 -m-1.5 transition-colors ${onClick ? "cursor-pointer hover:bg-white/[0.04]" : ""}`}
      onClick={() => onClick?.(note)}
    >
      <UserAvatar
        name={note.author?.name ?? "Unknown"}
        pictureUrl={note.author?.profile?.profilePictureUrl}
        size={36}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className="text-xs font-semibold text-white">{note.author?.name ?? "Unknown"}</span>
          <span className="text-xs text-slate-500">{t("recentNotes.on")}</span>
          <span className="text-xs font-medium text-amber-300">{note.stockBalance.item.name}</span>
          <span className="text-xs text-slate-500">· {dateStr}</span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-sm text-slate-300">{note.content}</p>
      </div>
    </div>
  );
}
