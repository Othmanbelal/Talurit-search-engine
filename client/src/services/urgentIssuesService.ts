import type { UrgentIssue } from "../types/urgent-issues";

const BASE = "/api/urgent-issues";

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

export const urgentIssuesService = {
  create(tableId: string, stockBalanceId: string, message: string): Promise<UrgentIssue> {
    return request(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId, stockBalanceId, message }),
    });
  },
  list(status: "open" | "resolved"): Promise<UrgentIssue[]> {
    return request(`${BASE}?status=${status}`);
  },
  listMy(): Promise<UrgentIssue[]> {
    return request(`${BASE}/my`);
  },
  resolve(id: string): Promise<UrgentIssue> {
    return request(`${BASE}/${id}/resolve`, { method: "PATCH" });
  },
  unresolve(id: string): Promise<UrgentIssue> {
    return request(`${BASE}/${id}/unresolve`, { method: "PATCH" });
  },
};
