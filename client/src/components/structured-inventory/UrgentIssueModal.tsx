import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { urgentIssuesService } from "../../services/urgentIssuesService";

type Props = {
  itemName: string;
  tableName: string;
  tableId: string;
  stockBalanceId: string;
  onClose: () => void;
};

export function UrgentIssueModal({
  itemName,
  tableName,
  tableId,
  stockBalanceId,
  onClose,
}: Props) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (message.trim().length < 10) {
      setError("Please describe the issue (minimum 10 characters).");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await urgentIssuesService.create(tableId, stockBalanceId, message.trim());
      setSent(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send issue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-red-500/30 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between border-b border-red-500/20 p-5">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-400" />
              <h2 className="text-base font-semibold text-white">Report Urgent Issue</h2>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {itemName} · {tableName}
            </p>
          </div>
          <button
            className="rounded-md p-1 text-slate-400 hover:text-white"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-5">
          {sent ? (
            <p className="py-4 text-center text-sm text-emerald-400">
              ✓ Issue reported to the table manager.
            </p>
          ) : (
            <>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                Describe the issue
              </label>
              <textarea
                autoFocus
                className="w-full resize-none rounded-md border border-line bg-slate-950/70 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-red-400 focus:outline-none"
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's wrong? Include location, severity, and any safety concerns…"
                rows={5}
                value={message}
              />
              {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
              <div className="mt-4 flex justify-end gap-3">
                <button
                  className="rounded-md border border-line px-4 py-2 text-sm text-slate-400 hover:text-white"
                  onClick={onClose}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-md bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-400 disabled:opacity-50"
                  disabled={!message.trim() || submitting}
                  onClick={() => void handleSubmit()}
                  type="button"
                >
                  <AlertTriangle size={14} />
                  {submitting ? "Sending…" : "Send to Manager"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
