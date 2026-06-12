import type { LocationGroup } from "../../utils/location-groups";
import { sortCompartments } from "../../utils/location-groups";

type LocationMapGridProps = {
  groups: LocationGroup[];
};

export function LocationMapGrid({ groups }: LocationMapGridProps) {
  const mappedGroups = groups.filter((group) => group.mapLocation);

  return (
    <section className="rounded-lg border border-line bg-panel p-4 shadow-industrial">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {mappedGroups.map((group) => (
          <div className="rounded-lg border border-line bg-slate-950/50 p-4" key={group.label}>
            <div className="flex items-center justify-between gap-3">
              <div className="font-semibold text-white">{group.label}</div>
              <div className="text-xs text-slate-500">
                {group.mapLocation?.mapRow}:{group.mapLocation?.mapColumn}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {sortCompartments(group.compartments).length > 0 ? (
                sortCompartments(group.compartments).map((location) => (
                  <span
                    className="rounded-md border border-accent/40 bg-accent/10 px-2 py-1 text-xs text-accent"
                    key={location.id}
                  >
                    FACK {location.compartment}
                  </span>
                ))
              ) : (
                <span className="text-sm text-slate-500">No compartments linked</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
