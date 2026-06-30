import { Database } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ColumnMappingStep } from "../components/structured-import/ColumnMappingStep";
import { ImportResultStep } from "../components/structured-import/ImportResultStep";
import { ImportWizardSteps } from "../components/structured-import/ImportWizardSteps";
import { SheetSelectionStep } from "../components/structured-import/SheetSelectionStep";
import { StagingPreviewStep } from "../components/structured-import/StagingPreviewStep";
import { UploadWorkbookStep } from "../components/structured-import/UploadWorkbookStep";
import { useStructuredImportWizard } from "../hooks/useStructuredImportWizard";

export function ImportPage() {
  const { t } = useTranslation("import");
  const wizard = useStructuredImportWizard();

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">
            {t("sectionLabel")}
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">
            {t("pageTitle")}
          </h1>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-line bg-white/5 px-4 py-3 text-sm text-slate-300">
          <Database className="text-accent" size={17} />
          {t("badge")}
        </div>
      </header>

      <ImportWizardSteps activeStep={wizard.step} />
      {wizard.error ? <ErrorMessage message={wizard.error} /> : null}

      {wizard.step === "upload" ? (
        <UploadWorkbookStep
          file={wizard.file}
          isLoading={wizard.isLoading}
          onFileChange={wizard.handleFileChange}
          onScan={() => void wizard.scanFile()}
        />
      ) : null}

      {wizard.step === "sheets" && wizard.batch ? (
        <SheetSelectionStep
          batch={wizard.batch}
          groupName={wizard.groupName}
          isLoading={wizard.isLoading}
          onGroupNameChange={wizard.setGroupName}
          onSave={(choices) => void wizard.saveSheets(choices)}
        />
      ) : null}

      {wizard.step === "mappings" && wizard.batch ? (
        <ColumnMappingStep
          batch={wizard.batch}
          isLoading={wizard.isLoading}
          onContinue={(drafts) => void wizard.saveAllMappingsAndStage(drafts)}
        />
      ) : null}

      {wizard.step === "preview" && wizard.batch ? (
        <StagingPreviewStep
          batch={wizard.batch}
          canConfirm={wizard.canConfirm}
          isLoading={wizard.isLoading}
          onConfirm={() => void wizard.confirmImport()}
          onPatchRow={(rowId, input) => void wizard.patchRow(rowId, input)}
          rows={wizard.rows}
        />
      ) : null}

      {wizard.step === "result" && wizard.batch ? <ImportResultStep batch={wizard.batch} /> : null}
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <section className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
      {message}
    </section>
  );
}
