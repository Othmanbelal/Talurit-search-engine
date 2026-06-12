import type { AdminDashboard } from "../types/dashboard";
import { apiRequest } from "./http";

export function getAdminDashboardRequest() {
  return apiRequest<{ dashboard: AdminDashboard }>("/api/admin/dashboard");
}
