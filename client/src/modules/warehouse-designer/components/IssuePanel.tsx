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
    { title: t("designer.issuePanel.errors"), items: errors, empty: t("designer.issuePanel.noErrors") },
    { title: t("designer.issuePanel.warnings"), items: warnings, empty: t("designer.issuePanel.noWarnings") },
    { title: t("designer.issuePanel.info"), items: info, empty: t("designer.issuePanel.noInfo") }
  ];

  return <section className="issue-section drawer-block">
    <div className="issue-summary-grid">
      <div data-state="error"><strong>{errors.length}</strong><span>{t("designer.issuePanel.errors")}</span></div>
      <div data-state="warning"><strong>{warnings.length}</strong><span>{t("designer.issuePanel.warnings")}</span></div>
      <div data-state="ok"><strong>{issues.length === 0 ? "Clean" : info.length}</strong><span>{issues.length === 0 ? t("designer.issuePanel.status") : t("designer.issuePanel.info")}</span></div>
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
