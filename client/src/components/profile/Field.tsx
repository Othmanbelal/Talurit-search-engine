export function Field({ disabled, label, onChange, placeholder, type = "text", value, right }: {
  disabled?: boolean;
  label: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  type?: string;
  value: string;
  right?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase text-slate-400">{label}</span>
      <div className="relative">
        <input
          className="w-full rounded-md border border-line bg-slate-950/70 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-accent disabled:opacity-50"
          disabled={disabled}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
          type={type}
          value={value}
        />
        {right ? <div className="absolute right-2 top-1/2 -translate-y-1/2">{right}</div> : null}
      </div>
    </label>
  );
}
