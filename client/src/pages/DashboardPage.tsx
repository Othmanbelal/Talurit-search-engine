import { lazy, Suspense, useState } from "react";
import { QrCode } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AdminSummaryWidget } from "../components/dashboard/AdminSummaryWidget";
import { ManagerTablesWidget } from "../components/dashboard/ManagerTablesWidget";
import { MyReportedIssuesWidget } from "../components/dashboard/MyReportedIssuesWidget";
import { RecentNotesWidget } from "../components/dashboard/RecentNotesWidget";
import { StatusPanel } from "../components/dashboard/StatusPanel";
import { BorrowedItemsWidget } from "../components/dashboard/BorrowedItemsWidget";
import { UrgentIssuesWidget } from "../components/dashboard/UrgentIssuesWidget";
import { StockRowDetailsDrawer } from "../components/structured-inventory/StockRowDetailsDrawer";
import { StockRowMovementModal } from "../components/structured-inventory/StockRowMovementModal";
import { useAdminDashboard } from "../hooks/useAdminDashboard";
import { useAuth } from "../hooks/useAuth";
import {
  borrowStructuredStockRowRequest,
  consumeStructuredStockRowRequest,
  getStructuredStockRowRequest,
  updateStructuredStockRowRequest,
  useStructuredStockRowInCardRequest,
} from "../services/structured-inventory.service";
import type { RecentNote } from "../types/notes";
import type { QrScanRow } from "../types/qr-scan";
import type { StructuredStockRow } from "../types/structured-inventory";
import type { UrgentIssue } from "../types/urgent-issues";

const QrScannerModal = lazy(() =>
  import("../components/qr/QrScannerModal").then((module) => ({ default: module.QrScannerModal })),
);

export function DashboardPage() {
  const { t } = useTranslation("dashboard");
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
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [movingRow, setMovingRow] = useState<StructuredStockRow | null>(null);
  const [movingTableId, setMovingTableId] = useState<string | null>(null);
  const canTakeReturn = isAdmin || isManager || isEmployee;

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

  async function handleScanMove(row: QrScanRow) {
    if (!row.table) return;
    const result = await getStructuredStockRowRequest(row.table.id, row.stockBalanceId);
    setMovingRow(result.row);
    setMovingTableId(row.table.id);
    setIsScannerOpen(false);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">{t("sectionLabel")}</p>
          <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">{t("title")}</h1>
        </div>
        <button
          className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-950 shadow-industrial"
          onClick={() => setIsScannerOpen(true)}
          type="button"
        >
          <QrCode size={17} /> {t("scanQr")}
        </button>
      </header>

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

      {/* Visible to every role — matches "members can see borrowed items" requirement. */}
      <Widget>
        <BorrowedItemsWidget />
      </Widget>

      {/* Visible to every role; self-hides when the user has no reported issues. */}
      <MyReportedIssuesWidget onIssueClick={handleIssueClick} />

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

      <StockRowMovementModal
        row={movingRow}
        onClose={() => {
          setMovingRow(null);
          setMovingTableId(null);
        }}
        onConsume={(rowId, input) => {
          if (!movingTableId) return Promise.resolve();
          return consumeStructuredStockRowRequest(movingTableId, rowId, input).then(() => undefined);
        }}
        onBorrow={(rowId, input) => {
          if (!movingTableId) return Promise.resolve();
          return borrowStructuredStockRowRequest(movingTableId, rowId, input).then(() => undefined);
        }}
        onUseIn={(rowId, input) => {
          if (!movingTableId) return Promise.resolve();
          return useStructuredStockRowInCardRequest(movingTableId, rowId, input).then(() => undefined);
        }}
      />

      {isScannerOpen ? (
        <Suspense fallback={<div className="fixed inset-0 z-[80] bg-black/70" />}>
          <QrScannerModal
            canMove={canTakeReturn}
            canWrite={canTakeReturn}
            onClose={() => setIsScannerOpen(false)}
            onMove={handleScanMove}
          />
        </Suspense>
      ) : null}
    </div>
  );
}

function Widget({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-line bg-white/[0.02] p-5">{children}</div>
  );
}
