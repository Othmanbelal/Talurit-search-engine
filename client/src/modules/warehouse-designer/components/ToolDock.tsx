import type React from "react";
import { Boxes, Building2, Layers, PackagePlus, Settings2, SquareStack } from "lucide-react";
import { useTranslation } from "react-i18next";

export type DrawerTab = "structure" | "objects" | "levels" | "layers";

export function ToolDock({ active, onSelect }: { active: DrawerTab | null; onSelect: (tab: DrawerTab) => void }) {
  const { t } = useTranslation("warehouses");

  const dockItems: Array<{ id: DrawerTab; label: string; icon: React.ReactNode }> = [
    { id: "structure", label: t("designer.tools"), icon: <Building2 size={19} /> },
    { id: "objects", label: t("designer.objects"), icon: <PackagePlus size={19} /> },
    { id: "levels", label: t("designer.levels"), icon: <SquareStack size={19} /> },
    { id: "layers", label: t("designer.layers"), icon: <Layers size={19} /> },
  ];

  return <nav className="premium-dock workflow-dock" aria-label="Main design workflows">
    <div className="dock-logo" title={t("designer.title")}><Boxes size={19} /></div>
    {dockItems.map((item) => <button key={item.id} className={active === item.id ? "dock-button active" : "dock-button"} onClick={() => onSelect(item.id)} title={item.label} aria-label={item.label}>{item.icon}<span>{item.label}</span></button>)}
    <div className="dock-spacer" />
    <div className="dock-hint"><Settings2 size={16} /><span>Right-click canvas</span></div>
  </nav>;
}
