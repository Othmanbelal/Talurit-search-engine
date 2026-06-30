import { useTranslation } from "react-i18next";

const stepKeys = ["upload", "sheets", "mappings", "preview", "result"] as const;

export function ImportWizardSteps({ activeStep }: { activeStep: string }) {
  const { t } = useTranslation("import");
  const activeIndex = stepKeys.findIndex((key) => key === activeStep);

  return (
    <ol className="grid gap-2 rounded-lg border border-line bg-panel p-3 md:grid-cols-5">
      {stepKeys.map((key, index) => {
        const isActive = key === activeStep;
        const isDone = index < activeIndex;
        return (
          <li
            className={`rounded-md border px-3 py-2 text-sm ${
              isActive || isDone
                ? "border-accent/50 bg-accent/10 text-accent"
                : "border-line bg-white/[0.03] text-slate-400"
            }`}
            key={key}
          >
            <span className="mr-2 font-semibold">{index + 1}</span>
            {t(`steps.${key}`)}
          </li>
        );
      })}
    </ol>
  );
}
