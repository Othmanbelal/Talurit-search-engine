import type React from "react";
import { Box, Layers, SquareStack, X, Building2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LayerNavigator } from "./LayerNavigator";
import { LevelManager } from "./LevelManager";
import { ObjectLibrary } from "./ObjectLibrary";
import { RoomTools } from "./RoomTools";
import { WarehouseTools } from "./WarehouseTools";
import type { DrawerTab } from "./ToolDock";

type Props = { active: DrawerTab | null; onClose: () => void };

type DrawerCopy = { title: string; subtitle: string; icon: React.ReactNode };

function DrawerHelp({ active }: { active: DrawerTab }) {
  const tips: Record<DrawerTab, string[]> = {
    structure: ["Use connected walls for custom shapes.", "Use rectangle room for fast boxed rooms.", "Doors/windows/stairs are structure objects."],
    objects: ["Click an item to place it at the active level.", "Use rack generator only for repeated rows.", "Right-click the plan to create at the cursor."],
    levels: ["Up shows one more floor above.", "Down hides the highest visible floor.", "New walls are drawn on the active visible level."],
    layers: ["Detected spaces are grouped by level.", "Rack rows stay grouped for bulk actions.", "Search keeps large projects manageable."]
  };
  return <div className="drawer-help-strip">{tips[active].map((tip) => <span key={tip}>{tip}</span>)}</div>;
}

export function StudioDrawer({ active, onClose }: Props) {
  const { t } = useTranslation("warehouses");

  const drawerCopy: Record<DrawerTab, DrawerCopy> = {
    structure: { title: t("designer.tools"), subtitle: "Draw walls, add openings, stairs and control snapping.", icon: <Building2 size={18} /> },
    objects: { title: t("designer.objects"), subtitle: "Place warehouse assets, safety zones and generate rack rows.", icon: <Box size={18} /> },
    levels: { title: t("designer.levels"), subtitle: "Control visible floors and draw on the right elevation.", icon: <SquareStack size={18} /> },
    layers: { title: t("designer.layers"), subtitle: "Select spaces, groups, walls and individual objects.", icon: <Layers size={18} /> }
  };

  if (!active) return null;
  const copy = drawerCopy[active];
  return <aside className="tool-drawer glass-panel workflow-drawer organized-drawer">
    <div className="drawer-header organized-drawer-header">
      <div className="drawer-title-row"><span className="drawer-title-icon">{copy.icon}</span><div><p className="eyebrow">Workflow</p><h2>{copy.title}</h2><span>{copy.subtitle}</span></div></div>
      <button className="mini-close" onClick={onClose} aria-label="Close panel"><X size={15} /></button>
    </div>
    <DrawerHelp active={active} />
    <div className="drawer-content organized-drawer-content">
      {active === "structure" ? <><RoomTools /><ObjectLibrary scope="structure" /></> : null}
      {active === "objects" ? <><ObjectLibrary scope="objects" /><WarehouseTools /></> : null}
      {active === "levels" ? <LevelManager /> : null}
      {active === "layers" ? <LayerNavigator open onClose={onClose} embedded /> : null}
    </div>
  </aside>;
}
