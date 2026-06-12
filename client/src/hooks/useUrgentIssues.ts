import { useCallback, useEffect, useState } from "react";
import { urgentIssuesService } from "../services/urgentIssuesService";
import type { UrgentIssue } from "../types/urgent-issues";

export function useUrgentIssues() {
  const [openIssues, setOpenIssues] = useState<UrgentIssue[]>([]);
  const [resolvedIssues, setResolvedIssues] = useState<UrgentIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [open, resolved] = await Promise.all([
        urgentIssuesService.list("open"),
        urgentIssuesService.list("resolved"),
      ]);
      setOpenIssues(open);
      setResolvedIssues(resolved);
    } catch {
      setError("Failed to load issues");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const resolve = useCallback(async (id: string) => {
    const updated = await urgentIssuesService.resolve(id);
    setOpenIssues((prev) => prev.filter((i) => i.id !== id));
    setResolvedIssues((prev) => [updated, ...prev]);
  }, []);

  const unresolve = useCallback(async (id: string) => {
    const updated = await urgentIssuesService.unresolve(id);
    setResolvedIssues((prev) => prev.filter((i) => i.id !== id));
    setOpenIssues((prev) => [updated, ...prev]);
  }, []);

  return { openIssues, resolvedIssues, loading, error, resolve, unresolve };
}
