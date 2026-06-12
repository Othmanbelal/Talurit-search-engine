import { Send, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useItemNotes } from "../../hooks/useItemNotes";
import type { ItemNote } from "../../types/notes";
import { UserAvatar } from "../UserAvatar";

export function ItemNotesPanel({ stockBalanceId }: { stockBalanceId: string }) {
  const { user } = useAuth();
  const { notes, loading, error, add, remove } = useItemNotes(stockBalanceId);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const canWrite =
    user?.role === "admin" || user?.role === "manager" || user?.role === "employee";

  function canDelete(authorId: string | undefined) {
    if (!user) return false;
    return user.role === "admin" || user.role === "manager" || user.id === authorId;
  }

  async function handleSubmit() {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    try {
      await add(content.trim());
      setContent("");
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex w-80 shrink-0 flex-col border-l border-line">
      <div className="border-b border-line px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          Notes {notes.length > 0 ? `(${notes.length})` : ""}
        </p>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {loading && <p className="text-xs text-slate-500">Loading…</p>}
        {error && <p className="text-xs text-red-400">{error}</p>}
        {!loading && notes.length === 0 && (
          <p className="text-xs text-slate-500">No notes yet. Be the first to add one.</p>
        )}
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            canDelete={canDelete(note.author?.id)}
            onDelete={remove}
          />
        ))}
        <div ref={endRef} />
      </div>
      {canWrite ? (
        <div className="border-t border-line p-3">
          <textarea
            className="w-full resize-none rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-accent focus:outline-none"
            disabled={submitting}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void handleSubmit();
            }}
            placeholder="Write a note… (Ctrl+Enter to send)"
            rows={3}
            value={content}
          />
          <button
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
            disabled={!content.trim() || submitting}
            onClick={() => void handleSubmit()}
            type="button"
          >
            <Send size={14} /> {submitting ? "Sending…" : "Add note"}
          </button>
        </div>
      ) : (
        <div className="border-t border-line p-3 text-center">
          <p className="text-xs text-slate-500">View only — notes cannot be added</p>
        </div>
      )}
    </div>
  );
}

function NoteCard({
  note,
  canDelete,
  onDelete,
}: {
  note: ItemNote;
  canDelete: boolean;
  onDelete: (id: string) => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  const date = new Date(note.createdAt);
  const dateStr = date.toLocaleString("sv-SE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(note.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="group rounded-lg border border-line bg-white/[0.03] p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <UserAvatar
            name={note.author?.name ?? "Unknown"}
            pictureUrl={note.author?.profile?.profilePictureUrl}
            size={36}
          />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white">
              {note.author?.name ?? "Unknown user"}
            </p>
            <p className="text-[10px] text-slate-500">{dateStr}</p>
          </div>
        </div>
        {canDelete && (
          <button
            className="shrink-0 rounded p-1 text-slate-600 opacity-0 transition-opacity hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100 disabled:opacity-50"
            disabled={deleting}
            onClick={() => void handleDelete()}
            title="Delete note"
            type="button"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
      <p className="whitespace-pre-wrap text-sm text-slate-300">{note.content}</p>
    </div>
  );
}
