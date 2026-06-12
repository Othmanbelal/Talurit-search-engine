import { ArrowLeft, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { deleteUsedInAssignmentRequest, getUsedInCardRequest, returnUsedInStockAssignmentRequest } from "../services/used-in.service";
import { labelForSettings, renderStockCell, selectedColumnsFromSettings } from "../components/structured-inventory/StructuredStockRowsTable";
import type { StructuredUsedInGroup, UsedInCardDetails, UsedInGroup } from "../types/used-in";

export function UsedInDetailsPage() {
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
        setError(requestError instanceof Error ? requestError.message : "Used In card unavailable");
      });
  }

  useEffect(loadCard, [id]);

  async function removeAssignment(assignmentId: string) {
    if (!window.confirm("Remove this assigned row from the card?")) return;
    try {
      await deleteUsedInAssignmentRequest(assignmentId);
      loadCard();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not remove assignment");
    }
  }

  async function returnAssignment(assignmentId: string) {
    try {
      await returnUsedInStockAssignmentRequest(assignmentId);
      loadCard();
    } catch (returnError) {
      setError(returnError instanceof Error ? returnError.message : "Could not return item");
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="space-y-4">
        <Link className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-accent" to="/used-in">
          <ArrowLeft size={16} /> Used In
        </Link>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
            Usage card
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
            {card?.name ?? "Used In"}
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
          No inventory rows assigned yet.
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
  if (spots.length === 0) return null;
  return (
    <section className="rounded-lg border border-line bg-panel p-4 shadow-industrial">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white">Spots</h2>
        <span className="text-sm text-slate-400">{spots.filter((spot) => spot.isOccupied).length}/{spots.length} occupied</span>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-6">
        {spots.map((spot) => (
          <div className={`rounded-md border px-3 py-2 text-sm font-semibold ${spot.isOccupied ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100" : "border-line bg-white/[0.03] text-slate-300"}`} key={spot.id}>
            {spot.name}
            <div className="mt-1 text-xs font-normal text-slate-500">{spot.isOccupied ? "Occupied" : "Empty"}</div>
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
  const columns = selectedColumnsFromSettings(group.columns);
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-white">{group.tableName}</h2>
      <div className="overflow-hidden rounded-lg border border-line bg-panel shadow-industrial">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Spot</th>
                {columns.map((column) => <th className="min-w-36 px-4 py-3 font-medium" key={column}>{labelForSettings(column, group.columns)}</th>)}
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="w-24 px-4 py-3 font-medium">Action</th>
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
                      Return
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
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-white">{group.inventoryName}</h2>
      <div className="overflow-hidden rounded-lg border border-line bg-panel shadow-industrial">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-line text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Row</th>
                {group.columns.map((column) => (
                  <th className="min-w-36 px-4 py-3 font-medium" key={column.key}>
                    {column.name}
                  </th>
                ))}
                <th className="w-20 px-4 py-3 font-medium">Action</th>
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
                      title="Remove"
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
