import { AlertTriangle, CheckCircle, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useUrgentIssues } from "../../hooks/useUrgentIssues";
import type { UrgentIssue } from "../../types/urgent-issues";
import { UserAvatar } from "../UserAvatar";

export function UrgentIssuesWidget({ onIssueClick }: { onIssueClick?: (issue: UrgentIssue) => void }) {
  const { openIssues, resolvedIssues, loading, error, resolve, unresolve } = useUrgentIssues();

  if (loading) {
    return (
      <div className="rounded-lg border border-line bg-white/[0.03] p-5">
        <p className="text-sm text-slate-500">Loading urgent issues…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-400/20 bg-red-500/5 p-5">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <AlertTriangle size={16} className="text-red-400" />
        <h2 className="font-semibold text-white">Urgent Issues</h2>
        {openIssues.length > 0 && (
          <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
            {openIssues.length}
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-red-400">
            Open
          </p>
          {openIssues.length === 0 ? (
            <p className="rounded-lg border border-line bg-white/[0.02] p-4 text-sm text-slate-500">
              No open issues.
            </p>
          ) : (
            <div className="space-y-3">
              {openIssues.map((issue) => (
                <OpenIssueCard key={issue.id} issue={issue} onResolve={resolve} onClick={onIssueClick} />
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Resolved this week
          </p>
          {resolvedIssues.length === 0 ? (
            <p className="rounded-lg border border-line bg-white/[0.02] p-4 text-sm text-slate-500">
              No resolved issues this week.
            </p>
          ) : (
            <div className="space-y-3">
              {resolvedIssues.map((issue) => (
                <ResolvedIssueCard key={issue.id} issue={issue} onUnresolve={unresolve} onClick={onIssueClick} />
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-slate-600">Resolved issues are kept for 7 days.</p>
        </div>
      </div>
    </section>
  );
}

function OpenIssueCard({
  issue,
  onClick,
  onResolve,
}: {
  issue: UrgentIssue;
  onClick?: (issue: UrgentIssue) => void;
  onResolve: (id: string) => Promise<void>;
}) {
  const [resolving, setResolving] = useState(false);

  async function handleResolve(e: React.MouseEvent) {
    e.stopPropagation();
    setResolving(true);
    try {
      await onResolve(issue.id);
    } finally {
      setResolving(false);
    }
  }

  return (
    <div
      className="cursor-pointer rounded-lg border border-red-500/20 bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.06]"
      onClick={() => onClick?.(issue)}
      style={{ borderLeft: "3px solid #ef4444" }}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserAvatar
            name={issue.sender?.name ?? "Unknown"}
            pictureUrl={issue.sender?.pictureUrl}
            size={36}
          />
          <span className="text-xs font-semibold text-white">
            {issue.sender?.name ?? "Unknown"}
          </span>
          <span className="text-xs text-slate-500">· {formatTimeAgo(new Date(issue.createdAt))}</span>
        </div>
        <button
          className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
          disabled={resolving}
          onClick={(e) => void handleResolve(e)}
          type="button"
        >
          <CheckCircle size={12} /> {resolving ? "…" : "Resolve"}
        </button>
      </div>
      <p className="mb-1 text-xs font-semibold text-amber-300">
        {issue.itemSnapshot.itemName} · {issue.tableName}
      </p>
      <p className="text-sm text-slate-300">"{issue.message}"</p>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
        {issue.itemSnapshot.location && <span>📍 {issue.itemSnapshot.location}</span>}
        <span>Qty: {issue.itemSnapshot.quantity} {issue.itemSnapshot.unit}</span>
      </div>
      {onClick && <p className="mt-2 text-[10px] text-slate-600">Click to view item details</p>}
    </div>
  );
}

function ResolvedIssueCard({
  issue,
  onClick,
  onUnresolve,
}: {
  issue: UrgentIssue;
  onClick?: (issue: UrgentIssue) => void;
  onUnresolve: (id: string) => Promise<void>;
}) {
  const [unresolvingState, setUnresolvingState] = useState(false);

  async function handleUnresolve(e: React.MouseEvent) {
    e.stopPropagation();
    setUnresolvingState(true);
    try {
      await onUnresolve(issue.id);
    } finally {
      setUnresolvingState(false);
    }
  }

  return (
    <div
      className="cursor-pointer rounded-lg border border-line bg-white/[0.02] p-4 opacity-70 transition-opacity hover:opacity-100"
      onClick={() => onClick?.(issue)}
      style={{ borderLeft: "3px solid #334155" }}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserAvatar
            name={issue.sender?.name ?? "Unknown"}
            pictureUrl={issue.sender?.pictureUrl}
            size={32}
          />
          <span className="text-xs text-slate-400">
            {issue.sender?.name ?? "Unknown"} · {formatTimeAgo(new Date(issue.createdAt))}
          </span>
        </div>
        <button
          className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-1 text-xs text-slate-400 hover:border-slate-500 hover:text-white disabled:opacity-50"
          disabled={unresolvingState}
          onClick={(e) => void handleUnresolve(e)}
          type="button"
        >
          <RotateCcw size={10} /> {unresolvingState ? "…" : "Unresolve"}
        </button>
      </div>
      <p className="mb-1 text-xs font-semibold text-slate-400">
        {issue.itemSnapshot.itemName} · {issue.tableName}
      </p>
      <p className="line-clamp-2 text-xs text-slate-500">"{issue.message}"</p>
      {issue.resolvedBy && (
        <p className="mt-1 text-xs text-slate-600">Resolved by {issue.resolvedBy.name}</p>
      )}
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
