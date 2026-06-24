import { useTranslation } from "react-i18next";
import type { Tool } from "../../types/tools";
import { getToolPlacement } from "../../utils/tool-placement";

type PlacementBadgeProps = {
  tool: Tool;
};

export function PlacementBadge({ tool }: PlacementBadgeProps) {
  const { t } = useTranslation("tools");
  const placement = getToolPlacement(tool);
  const lines = placementLines(tool, t);

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

function placementLines(tool: Tool, t: (key: string) => string) {
  const placement = getToolPlacement(tool);

  if (placement.state === "machine") {
    return { primary: t("badge.machine"), secondary: tool.machine?.name ?? tool.machineRaw ?? null };
  }

  if (placement.state === "location") {
    return {
      primary: tool.location?.rawLabel ?? tool.location?.shelf ?? t("badge.storage"),
      secondary: tool.location?.compartment ? `FACK ${tool.location.compartment}` : null,
    };
  }

  if (placement.state === "review") {
    return { primary: t("badge.review"), secondary: t("badge.checkLocation") };
  }

  return { primary: t("badge.unassigned"), secondary: t("badge.noLocation") };
}
