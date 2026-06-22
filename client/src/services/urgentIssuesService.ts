import type { UrgentIssue } from "../types/urgent-issues";
import { apiRequest } from "./http";

const BASE = "/api/urgent-issues";

export const urgentIssuesService = {
  create(tableId: string, stockBalanceId: string, message: string): Promise<UrgentIssue> {
    return apiRequest(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId, stockBalanceId, message }),
    });
  },
  list(status: "open" | "resolved"): Promise<UrgentIssue[]> {
    return apiRequest(`${BASE}?status=${status}`);
  },
  listMy(): Promise<UrgentIssue[]> {
    return apiRequest(`${BASE}/my`);
  },
  acknowledge(id: string): Promise<UrgentIssue> {
    return apiRequest(`${BASE}/${id}/acknowledge`, { method: "PATCH" });
  },
  resolve(id: string): Promise<UrgentIssue> {
    return apiRequest(`${BASE}/${id}/resolve`, { method: "PATCH" });
  },
  unresolve(id: string): Promise<UrgentIssue> {
    return apiRequest(`${BASE}/${id}/unresolve`, { method: "PATCH" });
  },
};
