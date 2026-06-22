import { AlertTriangle, CheckCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { urgentIssuesService } from "../../services/urgentIssuesService";
import type { UrgentIssue } from "../../types/urgent-issues";

export function MyReportedIssuesWidget({ onIssueClick }: { onIssueClick?: (issue: UrgentIssue) => void }) {
  const [issues, setIssues] = useState<UrgentIssue[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    urgentIssuesService
      .listMy()
      .then(setIssues)
      .catch(() => setIssues([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  // Reflect resolutions that happened while the dashboard was left open.
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  const unreadCount = issues.filter((issue) => issue.unread).length;

  const markRead = useCallback((id: string) => {
    setIssues((current) => current.map((issue) => (issue.id === id ? { ...issue, unread: false } : issue)));
    void urgentIssuesService.acknowledge(id).catch(() => undefined);
  }, []);

  function handleClick(issue: UrgentIssue) {
    if (issue.unread) markRead(issue.id);
    onIssueClick?.(issue);
  }

  async function markAllRead() {
    const unread = issues.filter((issue) => issue.unread);
    setIssues((current) => current.map((issue) => ({ ...issue, unread: false })));
    await Promise.allSettled(unread.map((issue) => urgentIssuesService.acknowledge(issue.id)));
  }

  // Hide entirely for users who have never reported an issue (e.g. viewers).
  if (!loading && issues.length === 0) return null;

  return (
    <section className="space-y-3 rounded-lg border border-line bg-white/[0.02] p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-400" />
          <h2 className="font-semibold text-white">My Reported Issues</h2>
          {unreadCount > 0 ? (
            <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-semibold text-accent">{unreadCount} new</span>
          ) : null}
        </div>
        {unreadCount > 0 ? (
          <button
            className="inline-flex items-center gap-1.5 rounded-md border border-line px-2.5 py-1 text-xs font-semibold text-slate-300 hover:border-accent hover:text-accent"
            onClick={() => void markAllRead()}
            type="button"
          >
            <CheckCheck size={13} /> Mark all read
          </button>
        ) : null}
      </div>

      {loading ? <p className="text-sm text-slate-500">Loading…</p> : null}

      <div className="space-y-3">
        {issues.map((issue) => (
          <ReportedIssueCard key={issue.id} issue={issue} onClick={handleClick} />
        ))}
      </div>
    </section>
  );
}

function ReportedIssueCard({ issue, onClick }: { issue: UrgentIssue; onClick: (issue: UrgentIssue) => void }) {
  const created = formatDateTime(issue.createdAt);
  const resolved = issue.resolvedAt ? relativeTime(issue.resolvedAt) : null;

  return (
    <button
      className={`w-full cursor-pointer rounded-lg border p-4 text-left transition-colors ${
        issue.unread
          ? "border-accent/50 bg-accent/[0.06] ring-1 ring-accent/30"
          : "border-line bg-white/[0.03] hover:bg-white/[0.06]"
      }`}
      onClick={() => onClick(issue)}
      type="button"
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-semibold text-amber-300">
          {issue.unread ? <span className="h-2 w-2 animate-pulse rounded-full bg-accent" aria-label="Unread" /> : null}
          {String(issue.itemSnapshot.itemName ?? "")} · {issue.tableName}
        </p>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            issue.status === "open" ? "bg-red-500/15 text-red-300" : "bg-emerald-500/15 text-emerald-300"
          }`}
        >
          {issue.status === "open" ? "Open" : "Resolved ✓"}
        </span>
      </div>
      <p className="mb-1 text-sm text-slate-300">"{issue.message}"</p>
      <p className="text-xs text-slate-500">{created}</p>
      {issue.resolvedBy ? (
        <p className="mt-1 text-xs text-emerald-300/80">
          Resolved by {issue.resolvedBy.name}{resolved ? ` · ${resolved}` : ""}
        </p>
      ) : null}
    </button>
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("sv-SE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function relativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
