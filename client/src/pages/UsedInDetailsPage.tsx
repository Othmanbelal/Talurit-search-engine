import { ArrowLeft, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { deleteUsedInAssignmentRequest, getUsedInCardRequest, returnUsedInStockAssignmentRequest } from "../services/used-in.service";
import { labelForSettings, renderStockCell, selectedColumnsFromSettings } from "../components/structured-inventory/StructuredStockRowsTable";
import type { StructuredUsedInGroup, UsedInCardDetails, UsedInGroup } from "../types/used-in";

export function UsedInDetailsPage() {
  const { t } = useTranslation("usedIn");
  const { id } = useParams();
  const [card, setCard] = useState<UsedInCardDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  function loadCard() {
    if (!id) return;
    getUsedInCardRequest(id)
      .then((result) => {
        setCard(result.card);
        setError(null);
      })
      .catch((requestError) => {
        setError(requestError instanceof Error ? requestError.message : t("details.error.unavailable"));
      });
  }

  useEffect(loadCard, [id]);

  async function removeAssignment(assignmentId: string) {
    if (!window.confirm(t("details.confirmRemove"))) return;
    try {
      await deleteUsedInAssignmentRequest(assignmentId);
      loadCard();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : t("details.error.removeFailed"));
    }
  }

  async function returnAssignment(assignmentId: string) {
    try {
      await returnUsedInStockAssignmentRequest(assignmentId);
      loadCard();
    } catch (returnError) {
      setError(returnError instanceof Error ? returnError.message : t("details.error.returnFailed"));
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="space-y-4">
        <Link className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-accent" to="/used-in">
          <ArrowLeft size={16} /> {t("details.backLink")}
        </Link>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
            {t("details.sectionLabel")}
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
            {card?.name ?? t("details.fallbackTitle")}
          </h1>
        </div>
      </header>

      {error ? (
        <section className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
          {error}
        </section>
      ) : null}

      {card ? <SpotOverview spots={card.spots} /> : null}

      {card?.groups.length === 0 && card.structuredGroups.length === 0 ? (
        <section className="rounded-lg border border-line bg-panel p-6 text-sm text-slate-400">
          {t("details.noAssignments")}
        </section>
      ) : null}

      {card?.structuredGroups.map((group) => (
        <StructuredUsedInGroupTable
          group={group}
          key={group.tableId}
          onReturn={(assignmentId) => void returnAssignment(assignmentId)}
        />
      ))}

      {card?.groups.map((group) => (
        <UsedInGroupTable
          group={group}
          key={group.inventoryId}
          onRemove={(assignmentId) => void removeAssignment(assignmentId)}
        />
      ))}
    </div>
  );
}

function SpotOverview({ spots }: { spots: UsedInCardDetails["spots"] }) {
  const { t } = useTranslation("usedIn");
  if (spots.length === 0) return null;
  const occupiedCount = spots.filter((spot) => spot.isOccupied).length;
  return (
    <section className="rounded-lg border border-line bg-panel p-4 shadow-industrial">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">{t("spotOverview.heading")}</h2>
        <span className="text-sm text-slate-400">{t("spotOverview.occupied", { occupied: occupiedCount, total: spots.length })}</span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-6">
        {spots.map((spot) => (
          <div className={`rounded-md border px-3 py-2 text-sm font-semibold ${spot.isOccupied ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100" : "border-line bg-white/[0.03] text-slate-300"}`} key={spot.id}>
            {spot.name}
            <div className="mt-1 text-xs font-normal text-slate-500">{spot.isOccupied ? t("spotOverview.status.occupied") : t("spotOverview.status.empty")}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function StructuredUsedInGroupTable({ group, onReturn }: {
  group: StructuredUsedInGroup;
  onReturn: (assignmentId: string) => void;
}) {
  const { t } = useTranslation("usedIn");
  const columns = selectedColumnsFromSettings(group.columns);
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-white">{group.tableName}</h2>
      <div className="overflow-hidden rounded-lg border border-line bg-panel shadow-industrial">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">{t("table.spot")}</th>
                {columns.map((column) => <th className="min-w-36 px-4 py-3 font-medium" key={column}>{labelForSettings(column, group.columns)}</th>)}
                <th className="px-4 py-3 font-medium">{t("table.qty")}</th>
                <th className="w-24 px-4 py-3 font-medium">{t("table.action")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {group.assignments.map((assignment) => (
                <tr className="text-slate-200 hover:bg-white/[0.03]" key={assignment.id}>
                  <td className="px-4 py-3 text-slate-300">{assignment.spot?.name ?? "-"}</td>
                  {columns.map((column) => <td className="max-w-64 truncate px-4 py-3" key={column}>{renderStockCell(assignment.sourceRow, column)}</td>)}
                  <td className="px-4 py-3">{assignment.quantity}</td>
                  <td className="px-4 py-3">
                    <button className="rounded-md border border-line bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:border-accent hover:text-accent" onClick={() => onReturn(assignment.id)} type="button">
                      {t("table.return")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function UsedInGroupTable({
  group,
  onRemove,
}: {
  group: UsedInGroup;
  onRemove: (assignmentId: string) => void;
}) {
  const { t } = useTranslation("usedIn");
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-white">{group.inventoryName}</h2>
      <div className="overflow-hidden rounded-lg border border-line bg-panel shadow-industrial">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">{t("table.row")}</th>
                {group.columns.map((column) => (
                  <th className="min-w-36 px-4 py-3 font-medium" key={column.key}>
                    {column.name}
                  </th>
                ))}
                <th className="w-20 px-4 py-3 font-medium">{t("table.action")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {group.assignments.map((assignment) => (
                <tr className="text-slate-200 hover:bg-white/[0.03]" key={assignment.id}>
                  <td className="px-4 py-3 text-slate-400">{assignment.row.rowNumber}</td>
                  {group.columns.map((column) => (
                    <td className="max-w-64 truncate px-4 py-3" key={column.key}>
                      {assignment.row.data[column.key] ?? "-"}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <button
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white/5 text-slate-200 hover:border-red-400 hover:text-red-300"
                      onClick={() => onRemove(assignment.id)}
                      title={t("table.removeTitle")}
                      type="button"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
