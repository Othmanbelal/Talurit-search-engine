export function InventoryStats({ items }: { items: { label: string; value: number | string }[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <div className="rounded-md border border-line bg-white/[0.04] p-3" key={item.label}>
          <div className="text-lg font-semibold text-white">{item.value}</div>
          <div className="mt-1 text-xs text-slate-400">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
