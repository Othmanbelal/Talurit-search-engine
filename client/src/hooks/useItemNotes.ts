import { useCallback, useEffect, useState } from "react";
import { itemNotesService } from "../services/itemNotesService";
import type { ItemNote } from "../types/notes";

export function useItemNotes(stockBalanceId: string | undefined) {
  const [notes, setNotes] = useState<ItemNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!stockBalanceId) return;
    setLoading(true);
    setError(null);
    try {
      setNotes(await itemNotesService.list(stockBalanceId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notes");
    } finally {
      setLoading(false);
    }
  }, [stockBalanceId]);

  useEffect(() => { void load(); }, [load]);

  const add = useCallback(async (content: string) => {
    if (!stockBalanceId) return;
    const note = await itemNotesService.create(stockBalanceId, content);
    setNotes((prev) => [...prev, note]);
  }, [stockBalanceId]);

  const remove = useCallback(async (noteId: string) => {
    await itemNotesService.delete(noteId);
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
  }, []);

  return { notes, loading, error, add, remove, reload: load };
}
