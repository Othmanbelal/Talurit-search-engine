import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ValidationIssue } from "../types";
import { useStudioStore } from "../store/useStudioStore";

function iconFor(severity: ValidationIssue["severity"]) {
  if (severity === "error") return <AlertTriangle size={16} />;
  if (severity === "warning") return <Info size={16} />;
  return <CheckCircle2 size={16} />;
}

export function IssuePanel({ issues }: { issues: ValidationIssue[] }) {
  const { t } = useTranslation("warehouses");
  const selectObject = useStudioStore((state) => state.selectObject);
  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");
  const info = issues.filter((issue) => issue.severity === "info");
  const sections = [
    { title: "Errors", items: errors, empty: "No blocking errors." },
    { title: "Warnings", items: warnings, empty: "No layout warnings." },
    { title: "Info", items: info, empty: "No informational notes." }
  ];

  return <section className="issue-section drawer-block">
    <div className="issue-summary-grid">
      <div data-state="error"><strong>{errors.length}</strong><span>Errors</span></div>
      <div data-state="warning"><strong>{warnings.length}</strong><span>Warnings</span></div>
      <div data-state="ok"><strong>{issues.length === 0 ? "Clean" : info.length}</strong><span>{issues.length === 0 ? "Status" : "Info"}</span></div>
    </div>
    {sections.map((section) => <div key={section.title} className="drawer-section-card issue-group">
      <div className="drawer-section-title"><div><p className="eyebrow">{t("designer.issues")}</p><h3>{section.title}</h3></div></div>
      {section.items.length === 0 ? <p className="empty-state compact-empty">{section.empty}</p> : <div className="issue-list">
        {section.items.map((issue) => <button key={issue.id} className="issue-card" data-severity={issue.severity} onClick={() => issue.objectId && selectObject(issue.objectId)}>
          {iconFor(issue.severity)}<span>{issue.message}</span>
        </button>)}
      </div>}
    </div>)}
  </section>;
}
