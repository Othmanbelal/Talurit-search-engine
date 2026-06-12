import { useAuth } from "./useAuth";

export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role;

  return {
    // Admin and manager full control over data structure
    canManageInventory: role === "admin" || role === "manager",
    // Admin and manager can manage warehouses
    canManageWarehouses: role === "admin" || role === "manager",
    // All non-viewer roles can take and return items
    canTakeReturn: role === "admin" || role === "manager" || role === "employee",
    // Only admin can invite/manage users
    canManageUsers: role === "admin",
    // Admin can assign roles (manager assignment handled separately)
    canAssignRoles: role === "admin",
    // Admin and manager can assign resource managers
    canAssignResourceManagers: role === "admin" || role === "manager",
    // Everyone authenticated can view
    isAuthenticated: !!user,
  };
}
