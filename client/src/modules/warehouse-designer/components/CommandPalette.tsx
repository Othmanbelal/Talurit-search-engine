import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Box, Columns3, Copy, DoorOpen, FileText, MoveUpRight, Keyboard, Layers, PackagePlus, RotateCw, Search, ShieldAlert, Trash2, Warehouse, X } from "lucide-react";
import type { DrawerTab } from "./ToolDock";
import type { ObjectType } from "../types";
import { useStudioStore } from "../store/useStudioStore";

type Command = {
  id: string;
  title: string;
  hint: string;
  keywords: string;
  icon: ReactNode;
  disabled?: boolean;
  run: () => void;
};

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  openDrawer: (tab: DrawerTab) => void;
  openInspector: () => void;
  notify: (message: string) => void;
};

const createCommands: Array<{ type: ObjectType; title: string; hint: string; icon: ReactNode }> = [
  { type: "pallet-rack", title: "Create pallet rack", hint: "Add a parametric warehouse rack", icon: <Warehouse size={17} /> },
  { type: "storage-shelf", title: "Create storage shelf", hint: "Add a smaller adjustable shelf", icon: <PackagePlus size={17} /> },
  { type: "euro-pallet", title: "Create Euro pallet", hint: "Add 800 × 1200 × 144 mm pallet", icon: <Box size={17} /> },
  { type: "stair", title: "Create adaptive stair", hint: "Connect active level to the next level", icon: <MoveUpRight size={17} /> },
  { type: "column", title: "Create column", hint: "Add an obstacle/pillar", icon: <Columns3 size={17} /> },
  { type: "no-go-zone", title: "Create no-go zone", hint: "Add a restricted floor area", icon: <ShieldAlert size={17} /> },
  { type: "door", title: "Create door", hint: "Add a door marker/opening", icon: <DoorOpen size={17} /> }
];

export function CommandPalette({ open, onClose, openDrawer, openInspector, notify }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const selected = useStudioStore((state) => state.selectedObject());
  const room = useStudioStore((state) => state.room);
  const addObject = useStudioStore((state) => state.addObject);
  const rotateObject = useStudioStore((state) => state.rotateObject);
  const duplicateObject = useStudioStore((state) => state.duplicateObject);
  const deleteObject = useStudioStore((state) => state.deleteObject);
  const deleteRackRowGroup = useStudioStore((state) => state.deleteRackRowGroup);
  const duplicateRackRowGroup = useStudioStore((state) => state.duplicateRackRowGroup);
  
  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const closeAfter = (action: () => void) => {
    action();
    onClose();
  };

  const commands = useMemo<Command[]>(() => {
    const center = { x: room.width / 2, y: room.depth / 2 };
    return [
      ...createCommands.map((command) => ({
        id: command.type,
        title: command.title,
        hint: command.hint,
        keywords: `create add ${command.type} object`,
        icon: command.icon,
        run: () => closeAfter(() => addObject(command.type, center))
      })),
      {
        id: "edit-selected",
        title: selected ? `Edit ${selected.name}` : "Edit selected object",
        hint: "Open the precision inspector",
        keywords: "edit inspect precision dimensions selected",
        icon: <FileText size={17} />,
        disabled: !selected,
        run: () => closeAfter(openInspector)
      },
      {
        id: "rotate-selected",
        title: "Rotate selected 90°",
        hint: selected ? selected.name : "Select an object first",
        keywords: "rotate selected object 90 degrees",
        icon: <RotateCw size={17} />,
        disabled: !selected || selected.locked,
        run: () => selected && closeAfter(() => rotateObject(selected.id, Math.PI / 2))
      },
      {
        id: "duplicate-selected",
        title: "Duplicate selected object",
        hint: selected ? selected.name : "Select an object first",
        keywords: "copy duplicate selected object",
        icon: <Copy size={17} />,
        disabled: !selected,
        run: () => selected && closeAfter(() => duplicateObject(selected.id))
      },
      {
        id: "duplicate-row",
        title: "Duplicate selected rack row group",
        hint: selected?.row ? selected.row.rowName : "Select a generated rack-row object first",
        keywords: "copy duplicate row group rack warehouse",
        icon: <Layers size={17} />,
        disabled: !selected?.row,
        run: () => selected?.row && closeAfter(() => duplicateRackRowGroup(selected.row!.rowGroupId))
      },
      {
        id: "delete-selected",
        title: "Delete selected object",
        hint: selected ? selected.name : "Select an object first",
        keywords: "remove delete selected object",
        icon: <Trash2 size={17} />,
        disabled: !selected,
        run: () => selected && closeAfter(() => deleteObject(selected.id))
      },
      {
        id: "delete-row",
        title: "Delete selected rack row group",
        hint: selected?.row ? selected.row.rowName : "Select a generated rack-row object first",
        keywords: "remove delete row group rack warehouse",
        icon: <Layers size={17} />,
        disabled: !selected?.row,
        run: () => selected?.row && closeAfter(() => deleteRackRowGroup(selected.row!.rowGroupId))
      },
      {
        id: "open-create",
        title: "Open Objects workflow",
        hint: "Browse assets and warehouse generators",
        keywords: "open create object library drawer",
        icon: <PackagePlus size={17} />,
        run: () => closeAfter(() => openDrawer("objects"))
      },
      {
        id: "open-warehouse",
        title: "Open rack generator",
        hint: "Open the warehouse tools inside Objects",
        keywords: "warehouse generator rows aisle clearance",
        icon: <Warehouse size={17} />,
        run: () => closeAfter(() => openDrawer("objects"))
      },
      {
        id: "open-shortcuts",
        title: "Show shortcut reminder",
        hint: "Delete, Ctrl+D, R, E, Esc, Ctrl+K",
        keywords: "keyboard shortcuts help hotkeys",
        icon: <Keyboard size={17} />,
        run: () => closeAfter(() => notify("Shortcuts: Ctrl+K commands · Delete remove · Ctrl+D duplicate · R rotate · E edit · Esc close"))
      }
    ];
  }, [addObject, deleteObject, deleteRackRowGroup, duplicateObject, duplicateRackRowGroup, notify, onClose, openDrawer, openInspector, room.depth, room.width, rotateObject, selected]);

  const filtered = commands.filter((command) => {
    const haystack = `${command.title} ${command.hint} ${command.keywords}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

  if (!open) return null;

  return (
    <div className="command-backdrop" onMouseDown={onClose}>
      <section className="command-palette glass-panel" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-label="Command palette">
        <div className="command-search">
          <Search size={18} />
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search commands, create objects, edit selected..." />
          <button onClick={onClose} aria-label="Close command palette"><X size={16} /></button>
        </div>
        <div className="command-list">
          {filtered.length ? filtered.map((command) => (
            <button key={command.id} disabled={command.disabled} onClick={command.run}>
              <span className="command-icon">{command.icon}</span>
              <span>
                <strong>{command.title}</strong>
                <small>{command.hint}</small>
              </span>
            </button>
          )) : <p className="empty-state">No command found.</p>}
        </div>
      </section>
    </div>
  );
}
