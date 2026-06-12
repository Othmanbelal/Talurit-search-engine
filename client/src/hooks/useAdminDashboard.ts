import { useEffect, useState } from "react";
import { getAdminDashboardRequest } from "../services/dashboard.service";
import type { AdminDashboard } from "../types/dashboard";

type DashboardState = {
  data: AdminDashboard | null;
  error: string | null;
  isLoading: boolean;
};

export function useAdminDashboard() {
  const [state, setState] = useState<DashboardState>({
    data: null,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    let isMounted = true;

    getAdminDashboardRequest()
      .then((result) => {
        if (isMounted) {
          setState({ data: result.dashboard, error: null, isLoading: false });
        }
      })
      .catch((error) => {
        if (isMounted) {
          setState({
            data: null,
            error: error instanceof Error ? error.message : "Dashboard unavailable",
            isLoading: false,
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return state;
}
