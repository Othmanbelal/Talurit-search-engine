import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type CSSProperties } from "react";
import { Scene3D } from "./components/Scene3D";
import { PlanView } from "./components/PlanView";
import { TopBar, type WorkspaceMode } from "./components/TopBar";
import { ToolDock, type DrawerTab } from "./components/ToolDock";
import { StudioDrawer } from "./components/StudioDrawer";
import { CommandPalette } from "./components/CommandPalette";
import { FloatingInspector } from "./components/FloatingInspector";
import { DrawingFocusBar } from "./components/DrawingFocusBar";
import { useStudioStore } from "./store/useStudioStore";
import { defaultMeta, defaultRoom, defaultSettings } from "./store/defaults";
import type { ProjectData } from "./types";
import { useEditorShortcuts } from "./hooks/useEditorShortcuts";
import "./styles.css";

type Props = {
  initialLayout?: Record<string, unknown> | null;
  fallbackProjectName: string;
  readOnly?: boolean;
  onSave?: (project: ProjectData) => Promise<void>;
  requestSaveRef?: { current: (() => Promise<void>) | null };
};

export default function WarehouseDesignerStudio({ fallbackProjectName, initialLayout, onSave, requestSaveRef, readOnly = false }: Props) {
  const [activeDrawer, setActiveDrawer] = useState<DrawerTab | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [mode, setMode] = useState<WorkspaceMode>("Split");
  const [toast, setToast] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [splitPercent, setSplitPercent] = useState(58);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const splitRef = useRef<HTMLDivElement | null>(null);
  const historyPast = useRef<ProjectData[]>([]);
  const historyFuture = useRef<ProjectData[]>([]);
  const lastSnapshot = useRef("");
  const applyingHistory = useRef(false);
  const room = useStudioStore((state) => state.room);
  const objects = useStudioStore((state) => state.objects);
  const settings = useStudioStore((state) => state.settings);
  const projectName = useStudioStore((state) => state.projectName);
  const projectMeta = useStudioStore((state) => state.projectMeta);
  const selectedId = useStudioStore((state) => state.selectedId);
  const activeTool = useStudioStore((state) => state.activeTool);
  const spaceNames = useStudioStore((state) => state.spaceNames);
  const selected = objects.find((object) => object.id === selectedId) ?? null;
  const drawingFocus = activeTool === "draw-wall" || activeTool === "rectangle-room";
  const selectedIds = useStudioStore((state) => state.selectedIds);
  const selectObject = useStudioStore((state) => state.selectObject);
  const selectObjects = useStudioStore((state) => state.selectObjects);
  const rotateObject = useStudioStore((state) => state.rotateObject);
  const duplicateObject = useStudioStore((state) => state.duplicateObject);
  const deleteObject = useStudioStore((state) => state.deleteObject);
  const deleteSelected = useStudioStore((state) => state.deleteSelected);
  const importProject = useStudioStore((state) => state.importProject);
  const cancelWall = useStudioStore((state) => state.cancelWall);

  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(""), 2400); };
  const openDrawer = (tab: DrawerTab) => { if (drawingFocus) return; setActiveDrawer((current) => (current === tab ? null : tab)); setInspectorOpen(false); };

  useEffect(() => {
    const project = buildInitialProject(initialLayout, fallbackProjectName);
    historyPast.current = [];
    historyFuture.current = [];
    lastSnapshot.current = "";
    applyingHistory.current = true;
    importProject(project);
  }, [fallbackProjectName, importProject, initialLayout]);

  const beginSplitResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const container = splitRef.current;
    if (!container) return;
    event.preventDefault();
    const bounds = container.getBoundingClientRect();
    const move = (moveEvent: PointerEvent) => setSplitPercent(Math.min(76, Math.max(28, ((moveEvent.clientX - bounds.left) / bounds.width) * 100)));
    const stop = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", stop); };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
  };

  const currentProject = useMemo<ProjectData>(() => ({ version: 23, name: projectName, meta: projectMeta, room, objects, settings, spaceNames }), [objects, projectMeta, projectName, room, settings, spaceNames]);
  useEffect(() => {
    const snapshot = JSON.stringify(currentProject);
    if (!lastSnapshot.current) { lastSnapshot.current = snapshot; return; }
    if (applyingHistory.current) { applyingHistory.current = false; lastSnapshot.current = snapshot; return; }
    if (snapshot !== lastSnapshot.current) {
      historyPast.current.push(JSON.parse(lastSnapshot.current) as ProjectData);
      // Trim oldest entries until total serialized size is under 5 MB
      const MAX_HISTORY_BYTES = 5_000_000;
      let totalBytes = historyPast.current.reduce((sum, entry) => sum + JSON.stringify(entry).length, 0);
      while (totalBytes > MAX_HISTORY_BYTES && historyPast.current.length > 1) {
        const removed = historyPast.current.shift()!;
        totalBytes -= JSON.stringify(removed).length;
      }
      historyFuture.current = [];
      lastSnapshot.current = snapshot;
    }
  }, [currentProject]);

  const undo = () => {
    const previous = historyPast.current.pop();
    if (!previous) return notify("Nothing to undo");
    if (lastSnapshot.current) historyFuture.current.push(JSON.parse(lastSnapshot.current) as ProjectData);
    applyingHistory.current = true;
    importProject(previous);
    notify("Undo applied");
  };
  const redo = () => {
    const next = historyFuture.current.pop();
    if (!next) return notify("Nothing to redo");
    if (lastSnapshot.current) historyPast.current.push(JSON.parse(lastSnapshot.current) as ProjectData);
    applyingHistory.current = true;
    importProject(next);
    notify("Redo applied");
  };

  useEffect(() => { if (!selectedId) setInspectorOpen(false); }, [selectedId]);
  useEffect(() => { if (drawingFocus) { setActiveDrawer(null); setInspectorOpen(false); setCommandOpen(false); } }, [drawingFocus]);
  const openSelectionEditor = () => { if (selectedId) { setInspectorOpen(true); setActiveDrawer(null); } };

  const saveProject = async () => {
    if (!onSave || readOnly) return;
    setIsSaving(true);
    try {
      await onSave(currentProject);
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      notify("Warehouse design saved");
    } catch {
      notify("Could not save warehouse design");
    } finally {
      setIsSaving(false);
    }
  };

  if (requestSaveRef) requestSaveRef.current = saveProject;

  useEditorShortcuts({ selected, selectedIds, undo, redo, notify, setCommandOpen, setInspectorOpen, setActiveDrawer, selectObject, selectObjects, deleteObject, deleteSelected, duplicateObject, rotateObject, cancelWall, activeTool });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && isFullscreen) setIsFullscreen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullscreen]);

  return <div className={`wd-root warehouse-designer-shell app-shell premium-overhaul workspace-mode-${mode.toLowerCase()} theme-${settings.visualTheme} ambience-${settings.ambienceLevel} ${drawingFocus ? "drawing-focus-active" : ""} ${isFullscreen ? "studio-fullscreen" : ""}`}>
    <TopBar mode={mode} setMode={setMode} undo={undo} redo={redo} toggleLayers={() => openDrawer("layers")} openLevels={() => openDrawer("levels")} openCommands={() => setCommandOpen(true)} openInspector={() => setInspectorOpen(true)} selectedName={selected?.name ?? null} onSaveProject={saveProject} isSaving={isSaving} lastSavedLabel={lastSavedAt ? `Saved ${lastSavedAt}` : ""} readOnly={readOnly} isFullscreen={isFullscreen} onToggleFullscreen={() => setIsFullscreen((prev) => !prev)} />
    <main className="premium-studio no-workspace-header">
      {/* Keep dock in grid at all times to prevent canvas from resizing during wall-drawing */}
      <div className={`dock-hold${drawingFocus ? " dock-hold--hidden" : ""}`}>
        <ToolDock active={activeDrawer} onSelect={openDrawer} />
      </div>
      {drawingFocus ? null : <StudioDrawer active={activeDrawer} onClose={() => setActiveDrawer(null)} />}
      <section className="canvas-stage single-canvas-stage">
        <div ref={splitRef} className={`view-split mode-${mode.toLowerCase()}`} style={{ "--plan-size": `${splitPercent}%` } as CSSProperties}>
          <div className="view-card plan-card glass-panel premium-view-card canvas-only-card"><span className="view-badge">Plan</span><PlanView onEditObject={openSelectionEditor} /></div>
          {mode === "Split" ? <button className="split-resizer" onPointerDown={beginSplitResize} aria-label="Resize plan and 3D views" title="Drag to resize views" /> : null}
          <div className="view-card scene-card glass-panel premium-view-card canvas-only-card"><span className="view-badge">3D</span><Scene3D onEditObject={openSelectionEditor} /></div>
        </div>
        <DrawingFocusBar />
      </section>
      <FloatingInspector open={inspectorOpen} onClose={() => setInspectorOpen(false)} />
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} openDrawer={openDrawer} openInspector={openSelectionEditor} notify={notify} />
    </main>
  </div>;
}

function buildInitialProject(layout: Record<string, unknown> | null | undefined, fallbackName: string): ProjectData {
  if (isProjectData(layout)) return { ...layout, name: layout.name || fallbackName };
  return {
    version: 23,
    name: fallbackName,
    meta: defaultMeta,
    room: { ...defaultRoom, width: 12, depth: 8, height: 4.2 },
    objects: [],
    settings: defaultSettings,
    spaceNames: {}
  };
}

function isProjectData(layout: unknown): layout is ProjectData {
  if (!layout || typeof layout !== "object") return false;
  const candidate = layout as ProjectData;
  return Boolean(candidate.room && Array.isArray(candidate.objects));
}
