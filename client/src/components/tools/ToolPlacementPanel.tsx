import { useMemo, useState } from "react";
import type { ToolMetadata } from "../../types/metadata";
import type { Tool, ToolPlacementPayload } from "../../types/tools";
import { formatLocation } from "../../utils/tool-format";
import { getToolPlacement } from "../../utils/tool-placement";

type ToolPlacementPanelProps = {
  canEdit: boolean;
  metadata: ToolMetadata;
  onMove: (payload: ToolPlacementPayload) => Promise<void>;
  onMoveToMachine?: (machineId: string, quantity: number) => Promise<void>;
  tool: Tool;
};

export function ToolPlacementPanel({
  canEdit,
  metadata,
  onMove,
  onMoveToMachine,
  tool,
}: ToolPlacementPanelProps) {
  const placement = getToolPlacement(tool);
  const [locationId, setLocationId] = useState(tool.location?.id ?? "");
  const [machineId, setMachineId] = useState(tool.machine?.id ?? "");
  const [machineQuantity, setMachineQuantity] = useState("1");
  const [rawLabel, setRawLabel] = useState("");
  const [compartment, setCompartment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locations = useMemo(
    () => metadata.locations.filter((location) => formatLocation(location) !== "-"),
    [metadata.locations],
  );

  async function runMove(payload: ToolPlacementPayload) {
    setIsSaving(true);
    setError(null);

    try {
      await onMove(payload);
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : "Placement update failed");
    } finally {
      setIsSaving(false);
    }
  }

  async function runMachineMove() {
    if (!machineId) return;

    if (!onMoveToMachine) {
      await runMove({ placement: "machine", machineId });
      return;
    }

    const quantity = Number(machineQuantity);

    if (!Number.isInteger(quantity) || quantity < 1) {
      setError("Machine quantity must be at least 1.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onMoveToMachine(machineId, quantity);
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : "Machine move failed");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-line bg-white/[0.03] p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Placement</h3>
          <span className={`mt-2 inline-flex rounded-md border px-2 py-1 text-xs ${placement.tone}`}>
            {placement.label}
          </span>
        </div>
        {canEdit ? (
          <button
            className="rounded-md border border-line px-3 py-2 text-sm text-slate-200 hover:border-red-300"
            disabled={isSaving}
            onClick={() => void runMove({ placement: "unassigned" })}
            type="button"
          >
            Mark unassigned
          </button>
        ) : null}
      </div>

      {canEdit ? (
        <div className="mt-4 grid gap-3">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
            <Select label="Existing location" onChange={setLocationId} value={locationId}>
              <option value="">Select location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {formatLocation(location)}
                </option>
              ))}
            </Select>
            <ActionButton
              disabled={!locationId || isSaving}
              label="Assign location"
              onClick={() => void runMove({ placement: "location", locationId })}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_120px_auto]">
            <Select label="Machine" onChange={setMachineId} value={machineId}>
              <option value="">Select machine</option>
              {metadata.machines.map((machine) => (
                <option key={machine.id} value={machine.id}>{machine.name}</option>
              ))}
            </Select>
            <Input label="Qty" onChange={setMachineQuantity} value={machineQuantity} />
            <ActionButton
              disabled={!machineId || isSaving}
              label={onMoveToMachine ? "Move to machine" : "Assign machine"}
              onClick={() => void runMachineMove()}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_120px_auto]">
            <Input label="New PLAN/HYLLA/BACK" onChange={setRawLabel} value={rawLabel} />
            <Input label="FACK" onChange={setCompartment} value={compartment} />
            <ActionButton
              disabled={!rawLabel.trim() || isSaving}
              label="Create location"
              onClick={() =>
                void runMove({
                  placement: "newLocation",
                  rawLabel,
                  compartment: compartment || null,
                })
              }
            />
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-200">{error}</p> : null}
    </section>
  );
}

function ActionButton({
  disabled,
  label,
  onClick,
}: {
  disabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

function Input({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-1 text-xs uppercase tracking-wide text-slate-500">
      {label}
      <input
        className="rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm normal-case tracking-normal text-white outline-none focus:border-accent"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      />
    </label>
  );
}

function Select({
  children,
  label,
  onChange,
  value,
}: {
  children: React.ReactNode;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-1 text-xs uppercase tracking-wide text-slate-500">
      {label}
      <select
        className="rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm normal-case tracking-normal text-white outline-none focus:border-accent"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {children}
      </select>
    </label>
  );
}
