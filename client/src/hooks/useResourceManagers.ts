import { useCallback, useEffect, useState } from "react";
import { type ResourceManagerEntry, resourceManagerService } from "../services/resourceManagerService";

export function useResourceManagers(resourceType: string, resourceId: string | undefined) {
  const [managers, setManagers] = useState<ResourceManagerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!resourceId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await resourceManagerService.list(resourceType, resourceId);
      setManagers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load managers");
    } finally {
      setLoading(false);
    }
  }, [resourceType, resourceId]);

  useEffect(() => { void load(); }, [load]);

  const assign = useCallback(async (userId: string) => {
    if (!resourceId) return;
    await resourceManagerService.assign(userId, resourceType, resourceId);
    await load();
  }, [resourceType, resourceId, load]);

  const unassign = useCallback(async (assignmentId: string) => {
    await resourceManagerService.unassign(assignmentId);
    await load();
  }, [load]);

  return { managers, loading, error, assign, unassign, reload: load };
}
