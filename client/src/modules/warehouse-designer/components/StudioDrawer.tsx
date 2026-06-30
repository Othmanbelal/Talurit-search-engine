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
  const { t } = useTranslation("warehouses");
  const tips: Record<DrawerTab, string[]> = {
    structure: [t("designer.studioDrawer.tipStructure1"), t("designer.studioDrawer.tipStructure2"), t("designer.studioDrawer.tipStructure3")],
    objects: [t("designer.studioDrawer.tipObjects1"), t("designer.studioDrawer.tipObjects2"), t("designer.studioDrawer.tipObjects3")],
    levels: [t("designer.studioDrawer.tipLevels1"), t("designer.studioDrawer.tipLevels2"), t("designer.studioDrawer.tipLevels3")],
    layers: [t("designer.studioDrawer.tipLayers1"), t("designer.studioDrawer.tipLayers2"), t("designer.studioDrawer.tipLayers3")]
  };
  return <div className="drawer-help-strip">{tips[active].map((tip) => <span key={tip}>{tip}</span>)}</div>;
}

export function StudioDrawer({ active, onClose }: Props) {
  const { t } = useTranslation("warehouses");

  const drawerCopy: Record<DrawerTab, DrawerCopy> = {
    structure: { title: t("designer.tools"), subtitle: t("designer.studioDrawer.subtitleStructure"), icon: <Building2 size={18} /> },
    objects: { title: t("designer.objects"), subtitle: t("designer.studioDrawer.subtitleObjects"), icon: <Box size={18} /> },
    levels: { title: t("designer.levels"), subtitle: t("designer.studioDrawer.subtitleLevels"), icon: <SquareStack size={18} /> },
    layers: { title: t("designer.layers"), subtitle: t("designer.studioDrawer.subtitleLayers"), icon: <Layers size={18} /> }
  };

  if (!active) return null;
  const copy = drawerCopy[active];
  return <aside className="tool-drawer glass-panel workflow-drawer organized-drawer">
    <div className="drawer-header organized-drawer-header">
      <div className="drawer-title-row"><span className="drawer-title-icon">{copy.icon}</span><div><p className="eyebrow">{t("designer.studioDrawer.workflowLabel")}</p><h2>{copy.title}</h2><span>{copy.subtitle}</span></div></div>
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
