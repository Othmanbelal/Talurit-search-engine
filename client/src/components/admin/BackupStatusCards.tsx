import { Clock3, Database, RotateCcw } from "lucide-react";
import type { BackupOverview } from "../../types/admin";
import { formatDateTime } from "../../utils/format";

export function BackupStatusCards({ data }: { data: BackupOverview | null }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      <StatusCard
        icon={<Database size={18} />}
        label="Last backup"
        status={data?.lastBackup?.status ?? "No record"}
        timestamp={data?.lastBackup?.completedAt ?? data?.lastBackup?.createdAt ?? null}
      />
      <StatusCard
        icon={<RotateCcw size={18} />}
        label="Last restore"
        status={data?.lastRestore?.status ?? "No record"}
        timestamp={data?.lastRestore?.completedAt ?? data?.lastRestore?.createdAt ?? null}
      />
      <StatusCard
        icon={<Clock3 size={18} />}
        label="Next automatic backup"
        status={data?.settings.enabled ? "Enabled" : "Disabled"}
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
