import type { ItemNote, RecentNote } from "../types/notes";
import { apiRequest } from "./http";

const BASE = "/api/item-notes";

export const itemNotesService = {
  list(stockBalanceId: string): Promise<ItemNote[]> {
    return apiRequest(`${BASE}?stockBalanceId=${encodeURIComponent(stockBalanceId)}`);
  },
  recent(tableId?: string, limit = 30): Promise<RecentNote[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (tableId) params.set("tableId", tableId);
    return apiRequest(`${BASE}/recent?${params.toString()}`);
  },
  create(stockBalanceId: string, content: string): Promise<ItemNote> {
    return apiRequest(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stockBalanceId, content }),
    });
  },
  delete(noteId: string): Promise<void> {
    return apiRequest(`${BASE}/${noteId}`, { method: "DELETE" });
  },
};
