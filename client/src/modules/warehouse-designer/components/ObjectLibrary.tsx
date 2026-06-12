import type React from "react";
import { Archive, Box, Boxes, Columns3, DoorOpen, MapPinOff, MoveUpRight, PackagePlus, PanelTop } from "lucide-react";
import { useStudioStore } from "../store/useStudioStore";
import type { ObjectType } from "../types";

type LibraryGroup = "structure" | "warehouse" | "safety";

type LibraryItem = {
  type: ObjectType;
  group: LibraryGroup;
  title: string;
  description: string;
  meta: string;
  icon: React.ReactNode;
};

const library: LibraryItem[] = [
  { type: "door", group: "structure", title: "Door opening", description: "Attach an opening marker to a wall.", meta: "Wall opening", icon: <DoorOpen size={18} /> },
  { type: "window", group: "structure", title: "Window opening", description: "Place a transparent wall opening with sill height.", meta: "Wall opening", icon: <PanelTop size={18} /> },
  { type: "stair", group: "structure", title: "Adaptive stair", description: "Adapts between the active level and the next level.", meta: "Vertical link", icon: <MoveUpRight size={18} /> },
  { type: "pallet-rack", group: "warehouse", title: "Pallet rack", description: "Parametric rack with beams, uprights and levels.", meta: "Storage", icon: <Boxes size={18} /> },
  { type: "storage-shelf", group: "warehouse", title: "Storage shelf", description: "Smaller adjustable shelf for light storage.", meta: "Storage", icon: <Archive size={18} /> },
  { type: "euro-pallet", group: "warehouse", title: "Euro pallet", description: "Standard 800 × 1200 × 144 mm wooden pallet.", meta: "800×1200", icon: <Box size={18} /> },
  { type: "column", group: "safety", title: "Column", description: "Fixed obstacle with exact size and height.", meta: "Obstacle", icon: <Columns3 size={18} /> },
  { type: "no-go-zone", group: "safety", title: "No-go zone", description: "Mark fire paths, staging zones or restricted areas.", meta: "Safety", icon: <MapPinOff size={18} /> }
];

const groupTitles: Record<LibraryGroup, { title: string; subtitle: string }> = {
  structure: { title: "Openings and vertical links", subtitle: "Doors, windows and stairs belong to the building structure." },
  warehouse: { title: "Warehouse assets", subtitle: "Storage objects that can be placed, moved and duplicated." },
  safety: { title: "Safety and fixed obstacles", subtitle: "Mark restrictions or physical blockers in the layout." }
};

function visibleGroups(scope: "structure" | "objects" | "all"): LibraryGroup[] {
  if (scope === "structure") return ["structure"];
  if (scope === "objects") return ["warehouse", "safety"];
  return ["structure", "warehouse", "safety"];
}

export function ObjectLibrary({ scope = "all" }: { scope?: "structure" | "objects" | "all" }) {
  const addObject = useStudioStore((state) => state.addObject);
  const groups = visibleGroups(scope);

  return <section className="drawer-block object-library-block">
    {groups.map((group) => {
      const copy = groupTitles[group];
      const items = library.filter((item) => item.group === group);
      return <div key={group} className="drawer-section-card compact-library-section">
        <div className="drawer-section-title"><div><p className="eyebrow">Library</p><h3>{copy.title}</h3><span>{copy.subtitle}</span></div></div>
        <div className="object-library categorized-library">
          {items.map((item) => <button key={item.type} className="library-card compact-library-card" onClick={() => addObject(item.type)}>
            <span className="library-icon">{item.icon}</span>
            <span><strong>{item.title}</strong><small>{item.description}</small><em>{item.meta}</em></span>
            <PackagePlus size={16} />
          </button>)}
        </div>
      </div>;
    })}
  </section>;
}
