import { useEffect, useRef, useState } from "react";
import { Command, FileInput, Layers, Maximize2, Minimize2, MoreHorizontal, Redo2, RotateCcw, Save, Undo2, Warehouse } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ProjectData } from "../types";
import { useStudioStore } from "../store/useStudioStore";
import { LevelQuickControl } from "./LevelQuickControl";

export type WorkspaceMode = "Plan" | "Split" | "3D";

type Props = {
  mode: WorkspaceMode;
  setMode: (mode: WorkspaceMode) => void;
  undo: () => void;
  redo: () => void;
  toggleLayers: () => void;
  openLevels: () => void;
  openCommands: () => void;
  openInspector: () => void;
  selectedName: string | null;
  onSaveProject?: () => void;
  isSaving?: boolean;
  lastSavedLabel?: string;
  readOnly?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
};

export function TopBar(props: Props) {
  const { t } = useTranslation("warehouses");
  const projectName = useStudioStore((state) => state.projectName);
  const setProjectName = useStudioStore((state) => state.setProjectName);
  const importProject = useStudioStore((state) => state.importProject);
  const resetProject = useStudioStore((state) => state.resetProject);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(event.target as Node)) {
        setOverflowOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleImport = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { importProject(JSON.parse(String(reader.result)) as ProjectData); }
      catch { alert("Could not import this project file."); }
    };
    reader.readAsText(file);
    setOverflowOpen(false);
  };

  return <header className="topbar single-header navigation-phase-header">
    <div className="brand-block compact-brand">
      <div className="brand-icon"><Warehouse size={21} /></div>
      <div><strong>{t("designer.title")}</strong><input className="project-name" value={projectName} onChange={(event) => setProjectName(event.target.value)} aria-label={t("designer.topBar.projectName")} /></div>
    </div>
    <div className="mode-switcher" role="tablist" aria-label="Workspace mode">
      {(["Plan", "Split", "3D"] as WorkspaceMode[]).map((item) => <button key={item} className={props.mode === item ? "active" : ""} onClick={() => props.setMode(item)}>{item}</button>)}
    </div>
    <LevelQuickControl openLevels={props.openLevels} />
    <div className="toolbar-icon-group" aria-label="Quick actions">
      <button className="icon-button" onClick={props.undo} title={t("designer.topBar.undo")} aria-label={t("designer.topBar.undo")}><Undo2 size={18} /></button>
      <button className="icon-button" onClick={props.redo} title={t("designer.topBar.redo")} aria-label={t("designer.topBar.redo")}><Redo2 size={18} /></button>
      <button className="icon-button" onClick={props.toggleLayers} title={t("designer.layers")} aria-label={t("designer.layers")}><Layers size={18} /></button>
      <button className="icon-button command-icon" onClick={props.openCommands} title={t("designer.commandPalette")} aria-label={t("designer.commandPalette")}><Command size={18} /></button>
    </div>
    {props.lastSavedLabel ? <span className="status-pill compact-saved" data-state="ok">{props.lastSavedLabel}</span> : null}
    {props.onSaveProject && !props.readOnly ? <button className="ghost-button compact-save" disabled={props.isSaving} onClick={props.onSaveProject}><Save size={16} /> {props.isSaving ? t("designer.saving") : t("designer.save")}</button> : null}
    {!props.readOnly ? (
      <div className="topbar-overflow" ref={overflowRef}>
        <button className="icon-button topbar-overflow-btn" onClick={() => setOverflowOpen((v) => !v)} title={t("designer.topBar.moreActions")} aria-label={t("designer.topBar.moreActions")} aria-expanded={overflowOpen}>
          <MoreHorizontal size={17} />
        </button>
        {overflowOpen ? (
          <div className="overflow-dropdown glass-panel">
            <label className="overflow-item file-button">
              <FileInput size={15} /> {t("designer.topBar.importJson")}
              <input type="file" accept="application/json" onChange={(event) => handleImport(event.target.files?.[0])} />
            </label>
            <button className="overflow-item danger" onClick={() => { resetProject(); setOverflowOpen(false); }}>
              <RotateCcw size={15} /> {t("designer.topBar.resetDesign")}
            </button>
          </div>
        ) : null}
      </div>
    ) : null}
    {props.onToggleFullscreen ? (
      <>
        <div className="topbar-spacer" />
        <button className="icon-button topbar-expand-btn" onClick={props.onToggleFullscreen} title={props.isFullscreen ? t("viewer.exitFullscreen") : t("viewer.fullscreen")} aria-label={props.isFullscreen ? t("viewer.exitFullscreen") : t("viewer.fullscreen")}>
          {props.isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
        </button>
      </>
    ) : null}
  </header>;
}
