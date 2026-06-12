import { useEffect } from "react";
import type { SceneObject } from "../types";

type ShortcutArgs = {
  selected: SceneObject | null;
  selectedIds: string[];
  undo: () => void;
  redo: () => void;
  notify: (message: string) => void;
  setCommandOpen: (open: boolean) => void;
  setInspectorOpen: (open: boolean) => void;
  setActiveDrawer: (drawer: null) => void;
  selectObject: (id: string | null) => void;
  selectObjects: (ids: string[]) => void;
  deleteObject: (id: string) => void;
  deleteSelected: () => void;
  duplicateObject: (id: string) => void;
  rotateObject: (id: string, deltaRadians: number) => void;
  cancelWall?: () => void;
  activeTool?: string;
};

export function useEditorShortcuts({ selected, selectedIds, undo, redo, notify, setCommandOpen, setInspectorOpen, setActiveDrawer, selectObject, selectObjects, deleteObject, deleteSelected, duplicateObject, rotateObject, cancelWall, activeTool }: ShortcutArgs) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.tagName === "SELECT";
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === "k") { event.preventDefault(); setCommandOpen(true); return; }
      if ((event.ctrlKey || event.metaKey) && key === "z") { event.preventDefault(); undo(); return; }
      if ((event.ctrlKey || event.metaKey) && key === "y") { event.preventDefault(); redo(); return; }
      if (typing) return;
      if (event.key === "Escape") {
        setCommandOpen(false); setInspectorOpen(false); setActiveDrawer(null);
        if (selectedIds.length > 1) { selectObjects([]); return; }
        selectObject(null);
        if (activeTool && activeTool !== "select") cancelWall?.();
        return;
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        if (selectedIds.length > 1) { deleteSelected(); notify(`${selectedIds.length} objects deleted`); return; }
        if (!selected) return;
        deleteObject(selected.id); notify(`${selected.name} deleted`);
        return;
      }
      if (!selected) return;
      if ((event.ctrlKey || event.metaKey) && key === "d") { event.preventDefault(); duplicateObject(selected.id); notify(`${selected.name} duplicated`); }
      if (key === "r") { event.preventDefault(); rotateObject(selected.id, Math.PI / 2); notify(`${selected.name} rotated 90°`); }
      if (key === "e") { event.preventDefault(); setInspectorOpen(true); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTool, cancelWall, deleteObject, deleteSelected, duplicateObject, notify, redo, rotateObject, selectObject, selectObjects, selected, selectedIds, setActiveDrawer, setCommandOpen, setInspectorOpen, undo]);
}
