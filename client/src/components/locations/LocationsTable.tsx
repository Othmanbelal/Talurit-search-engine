import type { Location } from "../../types/tools";
import { formatNullable } from "../../utils/tool-format";
import { isValidStorageLocation } from "../../utils/tool-placement";

type LocationsTableProps = {
  isLoading: boolean;
  locations: Location[];
};

export function LocationsTable({ isLoading, locations }: LocationsTableProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-panel shadow-industrial">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">PLAN/HYLLA/BACK</th>
              <th className="px-4 py-3 font-medium">FACK</th>
              <th className="px-4 py-3 font-medium">Map row</th>
              <th className="px-4 py-3 font-medium">Map column</th>
              <th className="px-4 py-3 font-medium">Occupancy</th>
              <th className="px-4 py-3 font-medium">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading ? <LoadingRows /> : null}
            {!isLoading && locations.length === 0 ? <EmptyRow /> : null}
            {!isLoading
              ? locations.map((location) => (
                  <tr className="text-slate-200 hover:bg-white/[0.03]" key={location.id}>
                    <td className="px-4 py-3 font-medium text-white">
                      {formatNullable(location.rawLabel ?? location.shelf)}
                    </td>
                    <td className="px-4 py-3">{formatNullable(location.compartment)}</td>
                    <td className="px-4 py-3">{formatNullable(location.mapRow)}</td>
                    <td className="px-4 py-3">{formatNullable(location.mapColumn)}</td>
                    <td className="px-4 py-3">
                      <OccupancyBadge location={location} />
                    </td>
                    <td className="px-4 py-3">{formatNullable(location.sourceSheet)}</td>
                  </tr>
                ))
              : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LoadingRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, index) => (
        <tr key={index}>
          <td className="px-4 py-4" colSpan={6}>
            <div className="h-5 animate-pulse rounded bg-white/10" />
          </td>
        </tr>
      ))}
    </>
  );
}

function EmptyRow() {
  return (
    <tr>
      <td className="px-4 py-10 text-center text-slate-400" colSpan={6}>
        No locations match this view.
      </td>
    </tr>
  );
}

function OccupancyBadge({ location }: { location: Location }) {
  if (!isValidStorageLocation(location)) {
    return (
      <span className="rounded-md border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-200">
        review
      </span>
    );
  }

  const count = location._count?.tools ?? 0;
  const tone = count > 0
    ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
    : "border-slate-500/30 bg-white/5 text-slate-300";

  return (
    <span className={`rounded-md border px-2 py-1 text-xs ${tone}`}>
      {count > 0 ? `occupied (${count})` : "free"}
    </span>
  );
}
