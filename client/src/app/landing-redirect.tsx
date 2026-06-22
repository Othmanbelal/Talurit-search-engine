import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { DEFAULT_LANDING_PATH } from "../constants/landing";

/**
 * Index route ("/"). Sends each authenticated user to their saved landing
 * destination, falling back to the dashboard. Rendered inside the protected
 * shell, so an unauthenticated visit is already redirected to /login.
 */
export function LandingRedirect() {
  const { user } = useAuth();
  return <Navigate replace to={user?.landingResolvedPath ?? DEFAULT_LANDING_PATH} />;
}
