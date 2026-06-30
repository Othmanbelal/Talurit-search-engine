import { Clock3, Database, RotateCcw } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { BackupOverview } from "../../types/admin";
import { formatDateTime } from "../../utils/format";

export function BackupStatusCards({ data }: { data: BackupOverview | null }) {
  const { t } = useTranslation("admin");

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <StatusCard
        icon={<Database size={18} />}
        label={t("backup.cards.lastBackup")}
        status={data?.lastBackup?.status ?? t("backup.cards.noRecord")}
        timestamp={data?.lastBackup?.completedAt ?? data?.lastBackup?.createdAt ?? null}
      />
      <StatusCard
        icon={<RotateCcw size={18} />}
        label={t("backup.cards.lastRestore")}
        status={data?.lastRestore?.status ?? t("backup.cards.noRecord")}
        timestamp={data?.lastRestore?.completedAt ?? data?.lastRestore?.createdAt ?? null}
      />
      <StatusCard
        icon={<Clock3 size={18} />}
        label={t("backup.cards.nextAutoBackup")}
        status={data?.settings.enabled ? t("backup.cards.enabled") : t("backup.cards.disabled")}
        timestamp={data?.nextAutomaticBackupAt ?? null}
      />
    </div>
  );
}

function StatusCard(props: {
  icon: React.ReactNode;
  label: string;
  status: string;
  timestamp: string | null;
}) {
  return (
    <div className="rounded-md border border-line bg-white/[0.03] p-4">
      <div className="flex items-center gap-2 text-accent">
        {props.icon}
        <span className="text-xs font-semibold uppercase tracking-[0.12em]">{props.label}</span>
      </div>
      <p className="mt-3 font-semibold text-white">{props.status}</p>
      <p className="mt-1 text-xs text-slate-500">{formatDateTime(props.timestamp)}</p>
    </div>
  );
}
