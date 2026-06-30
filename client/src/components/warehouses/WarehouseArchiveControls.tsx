import { useTranslation } from "react-i18next";
import type { WarehouseArchiveMode } from "../../types/warehouse";

export function WarehouseArchiveControls({
  active,
  onChange,
}: {
  active: WarehouseArchiveMode;
  onChange: (mode: WarehouseArchiveMode) => void;
}) {
  const { t } = useTranslation("warehouses");

  const modeLabels: Record<WarehouseArchiveMode, string> = {
    active: t("archiveControls.current"),
    archived: t("archiveControls.archived"),
    all: t("archiveControls.all"),
  };

  return (
    <div className="flex flex-wrap gap-2">
      {(["active", "archived", "all"] as const).map((mode) => (
        <button
          className={`rounded-md border px-3 py-2 text-sm font-semibold ${active === mode ? "border-accent bg-accent/15 text-accent" : "border-line bg-white/5 text-slate-300"}`}
          key={mode}
          onClick={() => onChange(mode)}
          type="button"
        >
          {modeLabels[mode]}
        </button>
      ))}
    </div>
  );
}
