export type DashboardMetric = {
  key: string;
  label: string;
  value: number;
};

export type DashboardStatus = {
  label: string;
  status: string;
  detail: string | null;
  timestamp: string | null;
};

export type AdminDashboard = {
  metrics: DashboardMetric[];
  statuses: {
    latestImport: DashboardStatus;
    latestBackup: DashboardStatus;
    weeklyEmail: DashboardStatus;
  };
  lowStockThreshold: number;
};
