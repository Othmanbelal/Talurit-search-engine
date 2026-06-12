const steps = ["Upload", "Sheets", "Mappings", "Preview", "Result"];

export function ImportSteps({ current }: { current: string }) {
  const currentIndex = steps.findIndex((step) => step.toLowerCase() === current);
  return (
    <div className="grid gap-2 md:grid-cols-5">
      {steps.map((step, index) => (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${index <= currentIndex ? "border-accent bg-accent/10 text-white" : "border-line bg-panel text-slate-400"}`}
          key={step}
        >
          <span className="mr-2 text-xs text-slate-500">{index + 1}</span>{step}
        </div>
      ))}
    </div>
  );
}
