import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { urgentIssuesService } from "../../services/urgentIssuesService";
import type { UrgentIssue } from "../../types/urgent-issues";

export function MyReportedIssuesWidget({ onIssueClick }: { onIssueClick?: (issue: UrgentIssue) => void }) {
  const [issues, setIssues] = useState<UrgentIssue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    urgentIssuesService
      .listMy()
      .then(setIssues)
      .catch(() => setIssues([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle size={16} className="text-amber-400" />
        <h2 className="font-semibold text-white">My Reported Issues</h2>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading…</p>}

      {!loading && issues.length === 0 && (
        <p className="rounded-lg border border-line bg-white/[0.02] p-4 text-sm text-slate-500">
          You have not reported any urgent issues yet.
        </p>
      )}

      <div className="space-y-3">
        {issues.map((issue) => (
          <ReportedIssueCard key={issue.id} issue={issue} onClick={onIssueClick} />
        ))}
      </div>
    </section>
  );
}

function ReportedIssueCard({ issue, onClick }: { issue: UrgentIssue; onClick?: (issue: UrgentIssue) => void }) {
  const date = new Date(issue.createdAt);
  const dateStr = date.toLocaleString("sv-SE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className="cursor-pointer rounded-lg border border-line bg-white/[0.03] p-4 transition-colors hover:bg-white/[0.06]"
      onClick={() => onClick?.(issue)}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-amber-300">
          {issue.itemSnapshot.itemName} · {issue.tableName}
        </p>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            issue.status === "open"
              ? "bg-red-500/15 text-red-300"
              : "bg-emerald-500/15 text-emerald-300"
          }`}
        >
          {issue.status === "open" ? "Open" : "Resolved ✓"}
        </span>
      </div>
      <p className="mb-1 text-sm text-slate-300">"{issue.message}"</p>
      <p className="text-xs text-slate-500">{dateStr}</p>
      {issue.resolvedBy && (
        <p className="mt-1 text-xs text-slate-500">Resolved by {issue.resolvedBy.name}</p>
      )}
    </div>
  );
}
