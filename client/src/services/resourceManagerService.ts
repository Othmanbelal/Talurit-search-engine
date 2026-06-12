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

export const resourceManagerService = {
  list(resourceType: string, resourceId: string): Promise<ResourceManagerEntry[]> {
    return request(`${BASE}?resourceType=${resourceType}&resourceId=${resourceId}`);
  },

  listMy(): Promise<MyManagedResource[]> {
    return request(`${BASE}/my`);
  },

  listByUser(userId: string): Promise<MyManagedResource[]> {
    return request(`${BASE}?userId=${userId}`);
  },

  assign(userId: string, resourceType: string, resourceId: string): Promise<ResourceManagerEntry> {
    return request(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, resourceType, resourceId }),
    });
  },

  unassign(assignmentId: string): Promise<void> {
    return request(`${BASE}/${assignmentId}`, { method: "DELETE" });
  },
};
