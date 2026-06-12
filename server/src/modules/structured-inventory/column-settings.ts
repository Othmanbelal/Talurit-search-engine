export function normalizeColumnSettings(value: unknown) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    visibleColumns: stringArray(source.visibleColumns),
    customColumns: customColumns(source.customColumns),
    columnLabels: columnLabels(source.columnLabels),
    widgets: widgetSettings(source.widgets),
    allowedSearchAttributes: allowedSearchAttributes(source.allowedSearchAttributes),
  };
}

function customColumns(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.flatMap((column) => {
    if (!column || typeof column !== "object") return [];
    const record = column as Record<string, unknown>;
    const key = typeof record.key === "string" ? record.key : "";
    const name = typeof record.name === "string" ? record.name : "";
    const label = typeof record.label === "string" ? record.label : name;
    return key && name ? [{ key, name, label }] : [];
  });
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((column): column is string => typeof column === "string") : [];
}

function columnLabels(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0),
  );
}

function allowedSearchAttributes(value: unknown): string[] | null {
  if (value === null) return null;
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  return null;
}

function widgetSettings(value: unknown) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return {
    itemCount: source.itemCount !== false,
    balance: source.balance !== false,
  };
}
