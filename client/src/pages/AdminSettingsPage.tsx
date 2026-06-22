import { Settings } from "lucide-react";
import { EmailSettingsPanel } from "../components/admin/EmailSettingsPanel";
import { BackupManagementPanel } from "../components/admin/BackupManagementPanel";
import { StatusPanel } from "../components/dashboard/StatusPanel";
import { useAdminDashboard } from "../hooks/useAdminDashboard";
import { useAdminSettings } from "../hooks/useAdminSettings";
import { useAdminBackups } from "../hooks/useAdminBackups";

export function AdminSettingsPage() {
  const adminSettings = useAdminSettings();
  const adminBackups = useAdminBackups();
  const { data: dashboardData } = useAdminDashboard();

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
          Administration
        </p>
        <h1 className="mt-3 flex items-center gap-3 text-3xl font-semibold text-white md:text-4xl">
          <Settings aria-hidden="true" size={32} /> Settings
        </h1>
      </header>

      {adminSettings.error ? (
        <section className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
          {adminSettings.error}
        </section>
      ) : null}

      {dashboardData && (
        <StatusPanel
          statuses={[
            dashboardData.statuses.latestImport,
            dashboardData.statuses.latestBackup,
            dashboardData.statuses.weeklyEmail,
          ]}
        />
      )}

      <EmailSettingsPanel
        isLoading={adminSettings.isLoading}
        onSave={adminSettings.updateSettings}
        onSendTest={adminSettings.sendTestEmail}
        settings={adminSettings.settings}
      />

      <BackupManagementPanel backups={adminBackups} />
    </div>
  );
}
