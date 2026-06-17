import { useCallback, useEffect, useState } from "react";
import type { AssignableInventoryRow, AssignSlotInput, WarehouseSlotAssignment } from "../types/warehouse";
import {
  assignSlotRequest,
  listSlotAssignmentsRequest,
  listWarehouseAssignmentsRequest,
  scanWarehouseInventoryRowsRequest,
  searchInventoryRowsRequest,
  unassignSlotRequest,
} from "../services/warehouse.service";

export function useWarehouseAssignments(warehouseId: string) {
  const [assignments, setAssignments] = useState<WarehouseSlotAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await listWarehouseAssignmentsRequest(warehouseId);
      setAssignments(result.assignments);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load assignments.");
    } finally {
      setIsLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { assignments, isLoading, error, load };
}

export function useSlotAssignPanel(warehouseId: string, slotId: string | null) {
  const [assignments, setAssignments] = useState<WarehouseSlotAssignment[]>([]);
  const [searchRows, setSearchRows] = useState<AssignableInventoryRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAssignments = useCallback(async () => {
    if (!slotId) return;
    setIsLoading(true);
    try {
      const result = await listSlotAssignmentsRequest(warehouseId, slotId);
      setAssignments(result.assignments);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load slot assignments.");
    } finally {
      setIsLoading(false);
    }
  }, [warehouseId, slotId]);

  const search = useCallback(async (query: string, tableId?: string) => {
    setSearchQuery(query);
    try {
      const result = await searchInventoryRowsRequest(warehouseId, { search: query, tableId, limit: 20 });
      setSearchRows(result.rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search inventory rows.");
    }
  }, [warehouseId]);

  const scan = useCallback(async (code: string) => {
    try {
      const result = await scanWarehouseInventoryRowsRequest(warehouseId, code);
      setSearchRows(result.rows);
      if (!result.matched) setError("No unassigned linked inventory row matches this QR code.");
      else setError(null);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to scan QR code.";
      setError(message);
      throw err;
    }
  }, [warehouseId]);

  useEffect(() => {
    void loadAssignments();
    void search("");
  }, [loadAssignments, search]);

  async function assign(input: AssignSlotInput) {
    if (!slotId) return;
    setIsSaving(true);
    setError(null);
    try {
      await assignSlotRequest(warehouseId, slotId, input);
      await loadAssignments();
      await search(searchQuery);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to assign slot.");
    } finally {
      setIsSaving(false);
    }
  }

  async function unassign(assignmentId: string) {
    setIsSaving(true);
    setError(null);
    try {
      await unassignSlotRequest(warehouseId, assignmentId);
      await loadAssignments();
      await search(searchQuery);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unassign slot.");
    } finally {
      setIsSaving(false);
    }
  }

  return { assignments, searchRows, searchQuery, isLoading, isSaving, error, search, scan, assign, unassign };
}
