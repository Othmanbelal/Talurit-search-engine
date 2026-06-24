import { Plus, RotateCcw, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toolStatuses, formatToolStatus } from "../../constants/tool-statuses";
import type { ToolMetadata } from "../../types/metadata";
import type { ToolFilters } from "../../types/tools";
import { formatLocation } from "../../utils/tool-format";

type ToolsToolbarProps = {
  canEdit: boolean;
  filters: ToolFilters;
  metadata: ToolMetadata;
  onAdd: () => void;
  onChange: (filters: Partial<ToolFilters>) => void;
  onReset: () => void;
};

export function ToolsToolbar({
  canEdit,
  filters,
  metadata,
  onAdd,
  onChange,
  onReset,
}: ToolsToolbarProps) {
  const { t } = useTranslation("tools");
  return (
    <section className="rounded-lg border border-line bg-panel p-4 shadow-industrial backdrop-blur">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
        <label className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={17} />
          <input
            className="w-full rounded-md border border-line bg-slate-950/70 py-2.5 pl-10 pr-3 text-sm text-white outline-none focus:border-accent"
            onChange={(event) => onChange({ q: event.target.value, page: 1 })}
            placeholder={t("toolbar.searchPlaceholder")}
            value={filters.q}
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2 xl:flex xl:items-center">
          <Select value={filters.manufacturerId} onChange={(value) => onChange({ manufacturerId: value, page: 1 })}>
            <option value="">{t("toolbar.allManufacturers")}</option>
            {metadata.manufacturers.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </Select>

          <Select value={filters.toolTypeId} onChange={(value) => onChange({ toolTypeId: value, page: 1 })}>
            <option value="">{t("toolbar.allTypes")}</option>
            {metadata.toolTypes.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </Select>

          <Select value={filters.locationId} onChange={(value) => onChange({ locationId: value, page: 1 })}>
            <option value="">{t("toolbar.allLocations")}</option>
            {metadata.locations.map((item) => (
              <option key={item.id} value={item.id}>{formatLocation(item)}</option>
            ))}
          </Select>

          <Select value={filters.machineId} onChange={(value) => onChange({ machineId: value, page: 1 })}>
            <option value="">{t("toolbar.allMachines")}</option>
            {metadata.machines.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </Select>

          <Select value={filters.status} onChange={(value) => onChange({ status: value, page: 1 })}>
            <option value="">{t("toolbar.allStatuses")}</option>
            {toolStatuses.map((status) => (
              <option key={status} value={status}>{formatToolStatus(status)}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-2">
          <SegmentedButton
            active={filters.placement === "all"}
            label={t("toolbar.allPlacements")}
            onClick={() => onChange({ placement: "all", page: 1 })}
          />
          <SegmentedButton
            active={filters.placement === "location"}
            label={t("toolbar.inStorage")}
            onClick={() => onChange({ placement: "location", page: 1 })}
          />
          <SegmentedButton
            active={filters.placement === "machine"}
            label={t("toolbar.inMachine")}
            onClick={() => onChange({ placement: "machine", page: 1 })}
          />
          <SegmentedButton
            active={filters.placement === "unassigned"}
            label={t("toolbar.unassigned")}
            onClick={() => onChange({ placement: "unassigned", page: 1 })}
          />
          <SegmentedButton
            active={filters.archived === "false"}
            label={t("toolbar.active")}
            onClick={() => onChange({ archived: "false", page: 1 })}
          />
          <SegmentedButton
            active={filters.archived === "true"}
            label={t("toolbar.archived")}
            onClick={() => onChange({ archived: "true", page: 1 })}
          />
          <SegmentedButton
            active={filters.archived === "all"}
            label={t("toolbar.all")}
            onClick={() => onChange({ archived: "all", page: 1 })}
          />
        </div>

        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm text-slate-200 hover:border-accent" onClick={onReset} type="button">
            <RotateCcw size={16} /> {t("toolbar.reset")}
          </button>
          {canEdit ? (
            <button className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-slate-950" onClick={onAdd} type="button">
              <Plus size={16} /> {t("toolbar.addTool")}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Select({
  children,
  onChange,
  value,
}: {
  children: React.ReactNode;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <select
      className="rounded-md border border-line bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none focus:border-accent"
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      {children}
    </select>
  );
}

function SegmentedButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={[
        "rounded-md border px-3 py-2 text-sm",
        active ? "border-accent bg-accent/15 text-accent" : "border-line text-slate-300 hover:border-accent",
      ].join(" ")}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
