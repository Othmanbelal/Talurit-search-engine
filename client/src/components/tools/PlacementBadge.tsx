import type { Tool } from "../../types/tools";
import { getToolPlacement } from "../../utils/tool-placement";

type PlacementBadgeProps = {
  tool: Tool;
};

export function PlacementBadge({ tool }: PlacementBadgeProps) {
  const placement = getToolPlacement(tool);
  const lines = placementLines(tool);

  return (
    <span
      className={`inline-flex min-w-28 max-w-36 flex-col rounded-md border px-2.5 py-1.5 text-xs leading-tight ${placement.tone}`}
      title={placement.label}
    >
      <span className="truncate font-semibold">{lines.primary}</span>
      {lines.secondary ? (
        <span className="mt-0.5 truncate opacity-90">{lines.secondary}</span>
      ) : null}
    </span>
  );
}

function placementLines(tool: Tool) {
  const placement = getToolPlacement(tool);

  if (placement.state === "machine") {
    return { primary: "Machine", secondary: tool.machine?.name ?? tool.machineRaw ?? null };
  }

  if (placement.state === "location") {
    return {
      primary: tool.location?.rawLabel ?? tool.location?.shelf ?? "Storage",
      secondary: tool.location?.compartment ? `FACK ${tool.location.compartment}` : null,
    };
  }

  if (placement.state === "review") {
    return { primary: "Review", secondary: "Check location" };
  }

  return { primary: "Unassigned", secondary: "No location" };
}
