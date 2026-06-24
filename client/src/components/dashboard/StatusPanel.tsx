import { useTranslation } from "react-i18next";
import type { DashboardStatus } from "../../types/dashboard";
import { formatDateTime } from "../../utils/format";

type StatusPanelProps = {
  statuses: DashboardStatus[];
};

export function StatusPanel({ statuses }: StatusPanelProps) {
  const { t } = useTranslation("dashboard");
  return (
    <section className="rounded-lg border border-line bg-panel p-5 shadow-industrial backdrop-blur">
      <h2 className="text-base font-semibold text-white">{t("status.title")}</h2>
      <div className="mt-4 divide-y divide-line">
        {statuses.map((status) => (
          <div className="grid gap-2 py-4 sm:grid-cols-[1fr_auto]" key={status.label}>
            <div>
              <div className="text-sm font-medium text-slate-200">{status.label}</div>
              <div className="mt-1 text-sm text-slate-400">{status.detail ?? t("status.noRecord")}</div>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-sm font-semibold text-accent">{status.status}</div>
              <div className="mt-1 text-xs text-slate-500">{formatDateTime(status.timestamp)}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
