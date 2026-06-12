import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function AdminRoute() {
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return <Navigate replace to="/dashboard" />;
  }

  return <Outlet />;
}
