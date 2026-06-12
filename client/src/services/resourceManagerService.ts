import { apiRequest } from "./http";

const BASE = "/api/resource-managers";

export type ResourceManagerEntry = {
  id: string;
  userId: string;
  resourceType: "inventory_table" | "inventory_group" | "warehouse";
  resourceId: string;
  assignedAt: string;
  user: { id: string; name: string; email: string; role: string; profile: { profilePictureUrl: string | null } | null };
  assignedBy: { id: string; name: string } | null;
};

export type MyManagedResource = {
  id: string;
  resourceType: "inventory_table" | "inventory_group" | "warehouse";
  resourceId: string;
  assignedAt: string;
};

export const resourceManagerService = {
  list(resourceType: string, resourceId: string): Promise<ResourceManagerEntry[]> {
    return apiRequest(`${BASE}?resourceType=${resourceType}&resourceId=${resourceId}`);
  },

  listMy(): Promise<MyManagedResource[]> {
    return apiRequest(`${BASE}/my`);
  },

  listByUser(userId: string): Promise<MyManagedResource[]> {
    return apiRequest(`${BASE}?userId=${userId}`);
  },

  assign(userId: string, resourceType: string, resourceId: string): Promise<ResourceManagerEntry> {
    return apiRequest(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, resourceType, resourceId }),
    });
  },

  unassign(assignmentId: string): Promise<void> {
    return apiRequest(`${BASE}/${assignmentId}`, { method: "DELETE" });
  },
};
