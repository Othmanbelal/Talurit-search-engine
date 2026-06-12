const steps = [
  { key: "upload", label: "Upload" },
  { key: "sheets", label: "Sheets" },
  { key: "mappings", label: "Mappings" },
  { key: "preview", label: "Preview" },
  { key: "result", label: "Result" },
];

export function ImportWizardSteps({ activeStep }: { activeStep: string }) {
  const activeIndex = steps.findIndex((step) => step.key === activeStep);

  return (
    <ol className="grid gap-2 rounded-lg border border-line bg-panel p-3 md:grid-cols-5">
      {steps.map((step, index) => {
        const isActive = step.key === activeStep;
        const isDone = index < activeIndex;
        return (
          <li
            className={`rounded-md border px-3 py-2 text-sm ${
              isActive || isDone
                ? "border-accent/50 bg-accent/10 text-accent"
                : "border-line bg-white/[0.03] text-slate-400"
            }`}
            key={step.key}
          >
            <span className="mr-2 font-semibold">{index + 1}</span>
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}
