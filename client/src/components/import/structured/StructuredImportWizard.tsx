import { useStructuredImportWizard } from "../../../hooks/useStructuredImportWizard";
import { ColumnMappingStep } from "./ColumnMappingStep";
import { ErrorBanner } from "./ErrorBanner";
import { ImportHeader } from "./ImportHeader";
import { ImportResultStep } from "./ImportResultStep";
import { ImportSteps } from "./ImportSteps";
import { SheetSelectionStep } from "./SheetSelectionStep";
import { StagingPreviewStep } from "./StagingPreviewStep";
import { UploadWorkbookStep } from "./UploadWorkbookStep";

export function StructuredImportWizard() {
  const wizard = useStructuredImportWizard();

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <ImportHeader />
      <ImportSteps current={wizard.step} />
      <ErrorBanner error={wizard.error} />

      {wizard.step === "upload" ? (
        <UploadWorkbookStep file={wizard.file} isLoading={wizard.isLoading} onFileChange={wizard.handleFileChange} onScan={() => void wizard.scanFile()} />
      ) : null}

      {wizard.step === "sheets" && wizard.batch ? (
        <SheetSelectionStep
          batch={wizard.batch}
          groupName={wizard.groupName}
          isLoading={wizard.isLoading}
          onChangeGroupName={wizard.setGroupName}
          onSave={(choices) => void wizard.saveSheets(choices)}
        />
      ) : null}

      {wizard.step === "mappings" && wizard.batch ? (
        <ColumnMappingStep
          batch={wizard.batch}
          isLoading={wizard.isLoading}
          onSaveMappings={wizard.saveMappings}
          onStage={() => void wizard.stageRows()}
        />
      ) : null}

      {wizard.step === "preview" && wizard.batch ? (
        <StagingPreviewStep
          batch={wizard.batch}
          canConfirm={wizard.canConfirm}
          isLoading={wizard.isLoading}
          rows={wizard.rows}
          onConfirm={() => void wizard.confirmImport()}
          onPatchRow={(rowId, patch) => void wizard.patchRow(rowId, patch)}
        />
      ) : null}

      {wizard.step === "result" && wizard.batch ? <ImportResultStep batch={wizard.batch} /> : null}
    </div>
  );
}
