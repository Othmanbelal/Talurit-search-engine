import { Map, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LocationsTable } from "../components/locations/LocationsTable";
import { UnassignedToolsPanel } from "../components/locations/UnassignedToolsPanel";
import { ToolDetailsDrawer } from "../components/tools/ToolDetailsDrawer";
import { useAuth } from "../hooks/useAuth";
import { useLocations } from "../hooks/useLocations";
import { useToolMetadata } from "../hooks/useToolMetadata";
import { useTools } from "../hooks/useTools";
import type { Tool, ToolFilters, ToolPlacementPayload } from "../types/tools";

const unassignedFilters: ToolFilters = {
  q: "",
  toolTypeId: "",
  manufacturerId: "",
  locationId: "",
  machineId: "",
  placement: "unassigned",
  status: "",
  archived: "false",
  sortBy: "updatedAt",
  sortDirection: "desc",
  page: 1,
  pageSize: 25,
};

export function LocationsPage() {
  const { user } = useAuth();
  const { error, isLoading, locations, refresh } = useLocations();
  const metadata = useToolMetadata();
  const unassignedTools = useTools(useMemo(() => unassignedFilters, []));
  const [detailsTool, setDetailsTool] = useState<Tool | null>(null);
  const [query, setQuery] = useState("");
  const canEdit = user?.role === "admin" || user?.role === "manager";
  const filteredLocations = useMemo(
    () =>
      locations.filter((location) =>
        [location.rawLabel, location.shelf, location.compartment, location.sourceSheet]
          .filter(Boolean)
          .join(" ")
          .toLocaleLowerCase("sv-SE")
          .includes(query.toLocaleLowerCase("sv-SE")),
      ),
    [locations, query],
  );

  async function handleMove(tool: Tool, payload: ToolPlacementPayload) {
    const updated = await unassignedTools.updatePlacement(tool, payload);
    setDetailsTool(updated);
    refresh();
    return updated;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
            Locations
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
            Shelf and FACK
          </h1>
        </div>
        <Link
          className="inline-flex items-center gap-2 rounded-md border border-line bg-white/5 px-4 py-3 text-sm text-slate-200 hover:border-accent"
          to="/locations/map"
        >
          <Map size={17} /> Map view
        </Link>
      </header>

      <label className="relative block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
        <input
          className="w-full rounded-lg border border-line bg-panel py-3 pl-10 pr-3 text-sm text-white outline-none focus:border-accent"
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search shelf, FACK, or source sheet..."
          value={query}
        />
      </label>

      {error ? (
        <section className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
          {error}
        </section>
      ) : null}

      <LocationsTable isLoading={isLoading} locations={filteredLocations} />
      <UnassignedToolsPanel
        isLoading={unassignedTools.isLoading}
        onView={setDetailsTool}
        tools={unassignedTools.data?.items ?? []}
      />
      <ToolDetailsDrawer
        canEdit={canEdit}
        metadata={metadata.data}
        onClose={() => setDetailsTool(null)}
        onMove={handleMove}
        tool={detailsTool}
      />
    </div>
  );
}
