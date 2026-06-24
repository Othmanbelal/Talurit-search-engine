import { ExternalLink } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useMyResourceManagers } from "../../hooks/useMyResourceManagers";
import { listStructuredInventoriesRequest } from "../../services/structured-inventory.service";
import { urgentIssuesService } from "../../services/urgentIssuesService";
import type { StructuredInventoryTableSummary } from "../../types/structured-inventory";
import type { UrgentIssue } from "../../types/urgent-issues";

export function ManagerTablesWidget() {
  const { t } = useTranslation("dashboard");
  const { resources } = useMyResourceManagers();
  const [allTables, setAllTables] = useState<StructuredInventoryTableSummary[]>([]);
  const [openIssues, setOpenIssues] = useState<UrgentIssue[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      listStructuredInventoriesRequest().then((r) => {
        const inv = r.inventories;
        setAllTables([
          ...inv.ungroupedTables,
          ...inv.groups.flatMap((g) => g.tables),
        ]);
      }),
      urgentIssuesService.list("open").then(setOpenIssues).catch(() => null),
    ]).finally(() => setLoaded(true));
  }, []);

  const managedTableIds = useMemo(
    () => new Set(resources.filter((r) => r.resourceType === "inventory_table").map((r) => r.resourceId)),
    [resources]
  );

  const managedGroupIds = useMemo(
    () => new Set(resources.filter((r) => r.resourceType === "inventory_group").map((r) => r.resourceId)),
    [resources]
  );

  const managedTables = useMemo(
    () =>
      allTables.filter(
        (t) => managedTableIds.has(t.id) || (t.groupId != null && managedGroupIds.has(t.groupId))
      ),
    [allTables, managedTableIds, managedGroupIds]
  );

  const issuesByTable = useMemo(() => {
    const map = new Map<string, number>();
    for (const issue of openIssues) {
      map.set(issue.tableId, (map.get(issue.tableId) ?? 0) + 1);
    }
    return map;
  }, [openIssues]);

  if (!loaded) {
    return (
      <section className="space-y-3">
        <h2 className="font-semibold text-white">{t("managerTables.title")}</h2>
        <p className="text-sm text-slate-500">{t("managerTables.loading")}</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="font-semibold text-white">{t("managerTables.title")}</h2>
      {managedTables.length === 0 ? (
        <p className="rounded-lg border border-line bg-white/[0.02] p-4 text-sm text-slate-500">
          {t("managerTables.empty")}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {managedTables.map((table) => {
            const issues = issuesByTable.get(table.id) ?? 0;
            return (
              <Link
                className="group rounded-lg border border-line bg-white/[0.03] p-4 transition-colors hover:border-accent hover:bg-white/[0.05]"
                key={table.id}
                to={`/inventory/tables/${table.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white group-hover:text-accent">
                      {table.name}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {t(table.rowCount !== 1 ? "managerTables.itemCount_plural" : "managerTables.itemCount", { count: table.rowCount })}
                    </p>
                  </div>
                  <ExternalLink className="shrink-0 text-slate-600 group-hover:text-accent" size={14} />
                </div>
                {issues > 0 && (
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-red-500/15 px-2 py-1 text-xs font-semibold text-red-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                    {t(issues !== 1 ? "managerTables.openIssues_plural" : "managerTables.openIssues", { count: issues })}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
