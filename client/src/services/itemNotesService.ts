import type { ItemNote, RecentNote } from "../types/notes";

const BASE = "/api/item-notes";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...options });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message ?? `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  const body = await res.json();
  return (body as { data: T }).data;
}

export const itemNotesService = {
  list(stockBalanceId: string): Promise<ItemNote[]> {
    return request(`${BASE}?stockBalanceId=${encodeURIComponent(stockBalanceId)}`);
  },
  recent(tableId?: string, limit = 30): Promise<RecentNote[]> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (tableId) params.set("tableId", tableId);
    return request(`${BASE}/recent?${params.toString()}`);
  },
  create(stockBalanceId: string, content: string): Promise<ItemNote> {
    return request(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stockBalanceId, content }),
    });
  },
  delete(noteId: string): Promise<void> {
    return request(`${BASE}/${noteId}`, { method: "DELETE" });
  },
};
