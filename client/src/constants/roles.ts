import type { UserRole } from "../types/auth";

export const userRoleOptions: Array<{ value: UserRole; label: string }> = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "employee", label: "Employee" },
  { value: "viewer", label: "Viewer" },
];

export function formatRole(role: UserRole) {
  return userRoleOptions.find((option) => option.value === role)?.label ?? role;
}
