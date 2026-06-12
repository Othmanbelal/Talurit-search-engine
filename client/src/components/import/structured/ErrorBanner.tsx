export function ErrorBanner({ error }: { error: string | null }) {
  if (!error) return null;
  return <section className="rounded-lg border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">{error}</section>;
}
