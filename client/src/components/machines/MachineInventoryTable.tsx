import { Eye } from "lucide-react";
import { formatToolStatus } from "../../constants/tool-statuses";
import type { MachineInventoryTool } from "../../types/machines";
import {
  formatLocationCompartment,
  formatLocationShelf,
  formatNullable,
} from "../../utils/tool-format";
import { PlacementBadge } from "../tools/PlacementBadge";

type MachineInventoryTableProps = {
  isLoading: boolean;
  onView?: (tool: MachineInventoryTool) => void;
  tools: MachineInventoryTool[];
};

export function MachineInventoryTable({
  isLoading,
  onView,
  tools,
}: MachineInventoryTableProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white">Items in this machine</h2>
        <p className="mt-1 text-sm text-slate-400">
          Real database inventory assigned to this machine.
        </p>
      </div>
      <ToolRows isLoading={isLoading} onView={onView} tools={tools} />
    </section>
  );
}

function ToolRows({
  isLoading,
  onView,
  tools,
}: {
  isLoading: boolean;
  onView?: (tool: MachineInventoryTool) => void;
  tools: MachineInventoryTool[];
}) {
  return (
    <div>
      {/* Mobile: card list */}
      <div className="space-y-2 md:hidden">
        {isLoading ? (
          <div className="h-24 animate-pulse rounded-lg border border-line bg-white/5" />
        ) : null}
        {!isLoading && tools.length === 0 ? (
          <p className="rounded-lg border border-line bg-panel p-6 text-sm text-slate-400">
            No database tools are assigned to this machine.
          </p>
        ) : null}
        {!isLoading
          ? tools.map((tool) => (
              <div className="rounded-lg border border-line bg-panel p-4" key={tool.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{tool.productName}</p>
                    <p className="mt-0.5 text-sm text-slate-400">
                      {[tool.articleNumber, tool.manufacturer?.name].filter(Boolean).join(" / ") || "-"}
                    </p>
                    <div className="mt-2">
                      <PlacementBadge tool={tool} />
                    </div>
                  </div>
                  {onView ? (
                    <button
                      className="shrink-0 rounded-md border border-line px-3 py-1.5 text-xs text-slate-200 hover:border-accent"
                      onClick={() => onView(tool)}
                      type="button"
                    >
                      Open
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          : null}
      </div>

      {/* Desktop: existing table */}
      <section className="hidden overflow-hidden rounded-lg border border-line bg-panel shadow-industrial md:block">
        <div className="overflow-x-auto">
          <table className="min-w-[1220px] table-fixed divide-y divide-line text-left text-sm">
            <thead className="bg-white/[0.03] text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Article</th>
                <th className="px-4 py-3 font-medium">Manufacturer</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">FACK</th>
                <th className="w-40 px-4 py-3 font-medium">Placement</th>
                <th className="px-4 py-3 text-center font-medium" title="Diameter">Ø</th>
                <th className="px-4 py-3 font-medium">Quantity</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {onView ? <th className="px-4 py-3 font-medium">Action</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading ? <LoadingRow /> : null}
              {!isLoading && tools.length === 0 ? <EmptyRow /> : null}
              {!isLoading
                ? tools.map((tool) => <ToolRow key={tool.id} onView={onView} tool={tool} />)
                : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ToolRow({
  onView,
  tool,
}: {
  onView?: (tool: MachineInventoryTool) => void;
  tool: MachineInventoryTool;
}) {
  return (
    <tr className="text-slate-200 hover:bg-white/[0.03]">
      <td className="px-4 py-3">
        <div className="max-w-56 truncate font-medium text-white">{tool.productName}</div>
      </td>
      <td className="px-4 py-3 text-slate-300">{formatNullable(tool.articleNumber)}</td>
      <td className="px-4 py-3 text-slate-300">{tool.manufacturer?.name ?? "-"}</td>
      <td className="px-4 py-3 text-slate-300">{tool.toolType?.name ?? "-"}</td>
      <td className="px-4 py-3 text-slate-300">{formatLocationShelf(tool.location)}</td>
      <td className="px-4 py-3 text-slate-300">{formatLocationCompartment(tool.location)}</td>
      <td className="px-4 py-3">
        <PlacementBadge tool={tool} />
      </td>
      <td className="px-4 py-3 text-center text-slate-300">{formatNullable(tool.diameter)}</td>
      <td className="px-4 py-3 text-slate-300">{formatNullable(tool.quantity)}</td>
      <td className="px-4 py-3">
        <span className="rounded-md border border-line bg-white/5 px-2 py-1 text-xs text-slate-200">
          {formatToolStatus(tool.status)}
        </span>
      </td>
      {onView ? (
        <td className="px-4 py-3">
          <button
            className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-slate-200 hover:border-accent"
            onClick={() => onView(tool)}
            type="button"
          >
            <Eye size={15} /> Open
          </button>
        </td>
      ) : null}
    </tr>
  );
}

function LoadingRow() {
  return (
    <tr>
      <td className="px-4 py-4" colSpan={11}>
        <div className="h-5 animate-pulse rounded bg-white/10" />
      </td>
    </tr>
  );
}

function EmptyRow() {
  return (
    <tr>
      <td className="px-4 py-10 text-center text-slate-400" colSpan={11}>
        No database tools are assigned to this machine.
      </td>
    </tr>
  );
}
