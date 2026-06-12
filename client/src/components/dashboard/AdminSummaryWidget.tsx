import { Database, Mail, Table2, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { getAdminUsersRequest } from "../../services/admin.service";
import { listStructuredInventoriesRequest } from "../../services/structured-inventory.service";
import type { AdminUsersOverview } from "../../types/admin";
import type { StructuredInventoryOverview } from "../../types/structured-inventory";

export function AdminSummaryWidget() {
  const [users, setUsers] = useState<AdminUsersOverview | null>(null);
  const [inventory, setInventory] = useState<StructuredInventoryOverview | null>(null);

  useEffect(() => {
    getAdminUsersRequest().then(setUsers).catch(() => null);
    listStructuredInventoriesRequest()
      .then((r) => setInventory(r.inventories))
      .catch(() => null);
  }, []);

  const activeUsers = users?.users.filter((u) => u.isActive).length ?? null;
  const pendingInvitations = users?.invitations.filter((i) => i.status === "pending").length ?? null;
  const totalTables = inventory
    ? inventory.groups.reduce((s, g) => s + g.tables.length, 0) + inventory.ungroupedTables.length
    : null;
  const totalGroups = inventory?.groups.length ?? null;

  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-white">System Overview</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Active Users" tone="accent" value={activeUsers} />
        <StatCard icon={Mail} label="Pending Invitations" tone="amber" value={pendingInvitations} />
        <StatCard icon={Database} label="Inventory Tables" tone="blue" value={totalTables} />
        <StatCard icon={Table2} label="Inventory Groups" tone="green" value={totalGroups} />
      </div>
    </section>
  );
}

type Tone = "accent" | "amber" | "blue" | "green";

const toneClasses: Record<Tone, string> = {
  accent: "text-accent bg-accent/10 border-accent/20",
  amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  blue: "text-sky-400 bg-sky-500/10 border-sky-500/20",
  green: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
};

function StatCard({
  icon: Icon,
  label,
  tone,
  value,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  tone: Tone;
  value: number | null;
}) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-line bg-white/[0.03] p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${toneClasses[tone]}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-white">
          {value === null ? <span className="text-base text-slate-600">—</span> : value}
        </p>
      </div>
    </div>
  );
}
