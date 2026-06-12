import { ArrowLeft, Map } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { LocationMapGrid } from "../components/locations/LocationMapGrid";
import { useLocations } from "../hooks/useLocations";
import { groupLocationsByShelf } from "../utils/location-groups";

export function LocationMapPage() {
  const { error, isLoading, locations } = useLocations();
  const groups = useMemo(() => groupLocationsByShelf(locations), [locations]);
  const mappedCount = groups.filter((group) => group.mapLocation).length;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="space-y-4">
        <Link
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-accent"
          to="/locations"
        >
          <ArrowLeft size={16} /> Locations
        </Link>
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
              Location map
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
              Shelf occupancy
            </h1>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-line bg-white/5 px-4 py-3 text-sm text-slate-300">
            <Map className="text-accent" size={17} />
            {mappedCount} mapped shelves
          </div>
        </div>
      </header>

      {error ? (
        <section className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
          {error}
        </section>
      ) : null}

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-lg border border-line bg-white/5" />
      ) : (
        <LocationMapGrid groups={groups} />
      )}
    </div>
  );
}
