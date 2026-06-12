import { ChevronDown, X } from "lucide-react";
import { formatToolStatus } from "../../constants/tool-statuses";
import type { ToolMetadata } from "../../types/metadata";
import type { Tool, ToolPlacementPayload } from "../../types/tools";
import {
  formatLocationCompartment,
  formatLocationShelf,
  formatNullable,
  formatToolMachine,
} from "../../utils/tool-format";
import { ToolPlacementPanel } from "./ToolPlacementPanel";

type ToolDetailsDrawerProps = {
  canEdit?: boolean;
  metadata?: ToolMetadata;
  onClose: () => void;
  onMove?: (tool: Tool, payload: ToolPlacementPayload) => Promise<Tool>;
  onMoveToMachine?: (tool: Tool, machineId: string, quantity: number) => Promise<Tool>;
  tool: Tool | null;
};

type DetailItem = {
  label: string;
  value: string;
};

export function ToolDetailsDrawer({
  canEdit = false,
  metadata,
  onClose,
  onMove,
  onMoveToMachine,
  tool,
}: ToolDetailsDrawerProps) {
  if (!tool) return null;

  const sections = buildSections(tool);
  const importDetails = buildImportDetails(tool);

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm">
      <aside className="ml-auto flex h-full w-full max-w-2xl flex-col border-l border-line bg-slate-900 shadow-industrial">
        <header className="flex items-start justify-between border-b border-line px-5 py-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Tool</p>
            <h2 className="mt-2 truncate text-xl font-semibold text-white">{tool.productName}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <Pill>{formatToolStatus(tool.status)}</Pill>
              <Pill>{tool.manufacturer?.name ?? "No manufacturer"}</Pill>
              <Pill>{tool.toolType?.name ?? "No type"}</Pill>
            </div>
          </div>
          <button
            className="rounded-md border border-line p-2 text-slate-300 hover:border-accent"
            onClick={onClose}
            title="Close"
            type="button"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {metadata && onMove ? (
            <ToolPlacementPanel
              canEdit={canEdit}
              metadata={metadata}
              onMove={async (payload) => {
                await onMove(tool, payload);
              }}
              onMoveToMachine={
                onMoveToMachine
                  ? async (machineId, quantity) => {
                      await onMoveToMachine(tool, machineId, quantity);
                    }
                  : undefined
              }
              tool={tool}
            />
          ) : null}

          {sections.map((section) => (
            <DetailSection items={section.items} key={section.title} title={section.title} />
          ))}

          <section className="rounded-lg border border-line bg-white/[0.03] p-4">
            <h3 className="text-sm font-semibold text-white">Notes</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
              {tool.notes?.trim() ? tool.notes : "No notes recorded."}
            </p>
          </section>

          <details className="rounded-lg border border-line bg-white/[0.03] p-4">
            <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-white">
              Import and raw data
              <ChevronDown size={16} />
            </summary>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {importDetails.map((item) => (
                <Detail key={item.label} label={item.label} value={item.value} />
              ))}
            </div>
          </details>
        </div>
      </aside>
    </div>
  );
}

function buildSections(tool: Tool) {
  return [
    {
      title: "Identity",
      items: compactDetails([
        detail("Article", tool.articleNumber),
        detail("Alt. article", tool.alternativeArticleNumber),
        detail("Manufacturer", tool.manufacturer?.name),
        detail("Tool type", tool.toolType?.name),
      ]),
    },
    {
      title: "Stock and location",
      items: compactDetails([
        detail("Quantity", tool.quantity),
        detail("Secondary quantity", tool.quantitySecondary),
        detail("PLAN/HYLLA/BACK", formatLocationShelf(tool.location)),
        detail("FACK", formatLocationCompartment(tool.location)),
        detail("Machine", machineValue(tool)),
      ]),
    },
    {
      title: "Geometry and holder",
      items: compactDetails([
        detail("Diameter", tool.diameter),
        detail("Cutting size", tool.cuttingSize),
        detail("Cutting length", tool.cuttingLength),
        detail("Overhang", tool.overhang),
        detail("Grade", tool.grade),
        detail("Mounting", tool.mounting),
        detail("Holder", tool.holder),
        detail("Secondary holder", tool.holderSecondary),
      ]),
    },
    {
      title: "Commercial",
      items: compactDetails([
        detail("Price", tool.priceRaw),
        detail("Total price", differentValue(tool.totalPriceRaw, tool.priceRaw)),
      ]),
    },
  ].filter((section) => section.items.length > 0);
}

function buildImportDetails(tool: Tool): DetailItem[] {
  return compactDetails([
    detail("Stock raw", differentValue(tool.stockRaw, tool.quantity)),
    detail("Count raw", tool.countRaw),
    detail("Machine raw", differentValue(tool.machineRaw, tool.machine?.name)),
    detail("Source sheet", tool.sourceSheet),
    detail("Source row", tool.sourceRowNumber),
    detail("Updated", new Date(tool.updatedAt).toLocaleString()),
    detail("Record state", tool.isArchived ? "Archived" : "Active"),
  ]);
}

function DetailSection({ items, title }: { items: DetailItem[]; title: string }) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <Detail key={item.label} label={item.label} value={item.value} />
        ))}
      </div>
    </section>
  );
}

function Detail({ label, value }: DetailItem) {
  return (
    <div className="rounded-lg border border-line bg-white/[0.03] p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 break-words text-sm font-medium text-slate-100">{value}</div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-line bg-white/5 px-2.5 py-1 text-xs text-slate-200">
      {children}
    </span>
  );
}

function detail(label: string, value?: string | number | null): DetailItem {
  return { label, value: formatNullable(value) };
}

function compactDetails(items: DetailItem[]) {
  return items.filter((item) => item.value !== "-");
}

function differentValue(value?: string | number | null, compared?: string | number | null) {
  if (value === undefined || value === null || value === "") return null;
  if (compared === undefined || compared === null || compared === "") return value;

  return String(value) === String(compared) ? null : value;
}

function machineValue(tool: Tool) {
  const machine = formatToolMachine(tool);
  return machine === "-" ? null : machine;
}
