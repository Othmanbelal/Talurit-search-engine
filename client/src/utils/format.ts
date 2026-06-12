export function formatNumber(value: number) {
  return new Intl.NumberFormat().format(value);
}

export function formatDateTime(value: string | null) {
  if (!value) return "No record";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
