import { useState } from "react";
import { AdminSummaryWidget } from "../components/dashboard/AdminSummaryWidget";
import { ManagerTablesWidget } from "../components/dashboard/ManagerTablesWidget";
import { MyReportedIssuesWidget } from "../components/dashboard/MyReportedIssuesWidget";
import { RecentNotesWidget } from "../components/dashboard/RecentNotesWidget";
import { StatusPanel } from "../components/dashboard/StatusPanel";
import { TakenItemsWidget } from "../components/dashboard/TakenItemsWidget";
import { UrgentIssuesWidget } from "../components/dashboard/UrgentIssuesWidget";
import { StockRowDetailsDrawer } from "../components/structured-inventory/StockRowDetailsDrawer";
import { useAdminDashboard } from "../hooks/useAdminDashboard";
import { useAuth } from "../hooks/useAuth";
import {
  getStructuredStockRowRequest,
  updateStructuredStockRowRequest,
} from "../services/structured-inventory.service";
import type { RecentNote } from "../types/notes";
import type { StructuredStockRow } from "../types/structured-inventory";
import type { UrgentIssue } from "../types/urgent-issues";

export function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role;
  const isAdmin = role === "admin";
  const isManager = role === "manager";
  const isEmployee = role === "employee";
  // Admin and manager need the status data
  const { data: statusData } = useAdminDashboard();

  const [drawerRow, setDrawerRow] = useState<StructuredStockRow | null>(null);
  const [drawerTableId, setDrawerTableId] = useState<string | undefined>();
  const [drawerTableName, setDrawerTableName] = useState<string | undefined>();

  async function openRow(tableId: string, rowId: string, tableName?: string) {
    try {
      const result = await getStructuredStockRowRequest(tableId, rowId);
      setDrawerTableId(tableId);
      setDrawerTableName(tableName);
      setDrawerRow(result.row);
    } catch {
      // Row may have been deleted
    }
  }

  function handleIssueClick(issue: UrgentIssue) {
    void openRow(issue.tableId, issue.stockBalanceId, issue.tableName);
  }

  function handleNoteClick(note: RecentNote) {
    const tableId = note.stockBalance.inventoryTableId;
    if (!tableId) return;
    void openRow(tableId, note.stockBalance.id, note.stockBalance.inventoryTable?.name);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Overview</p>
        <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">Dashboard</h1>
      </header>

      {/* ── ADMIN ── */}
      {isAdmin && (
        <>
          <Widget>
            <AdminSummaryWidget />
          </Widget>

          {statusData && (
            <Widget>
              <StatusPanel
                statuses={[
                  statusData.statuses.latestImport,
                  statusData.statuses.latestBackup,
                  statusData.statuses.weeklyEmail,
                ]}
              />
            </Widget>
          )}

          <Widget>
            <UrgentIssuesWidget onIssueClick={handleIssueClick} />
          </Widget>
        </>
      )}

      {/* ── MANAGER ── */}
      {isManager && (
        <>
          <Widget>
            <ManagerTablesWidget />
          </Widget>

          <Widget>
            <UrgentIssuesWidget onIssueClick={handleIssueClick} />
          </Widget>
        </>
      )}

      {/* ── EMPLOYEE ── */}
      {isEmployee && (
        <>
          <Widget>
            <TakenItemsWidget />
          </Widget>

          <Widget>
            <MyReportedIssuesWidget onIssueClick={handleIssueClick} />
          </Widget>
        </>
      )}

      {/* ── ALL ROLES ── */}
      <Widget>
        <RecentNotesWidget onNoteClick={handleNoteClick} />
      </Widget>

      <StockRowDetailsDrawer
        row={drawerRow}
        tableId={drawerTableId}
        tableName={drawerTableName}
        onClose={() => setDrawerRow(null)}
        onSave={async (rowId, input) => {
          if (!drawerTableId) return;
          await updateStructuredStockRowRequest(drawerTableId, rowId, input);
        }}
      />

    </div>
  );
}

function Widget({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-white/[0.02] p-5">{children}</div>
  );
}
