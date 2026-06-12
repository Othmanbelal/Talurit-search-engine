type Props = {
  name: string;
  pictureUrl?: string | null;
  size?: number;
};

export function UserAvatar({ name, pictureUrl, size = 36 }: Props) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("") || "?";

  if (pictureUrl) {
    return (
      <img
        alt={name}
        className="shrink-0 rounded-full object-cover"
        src={pictureUrl}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-accent/20 font-semibold text-accent"
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)) }}
    >
      {initials}
    </span>
  );
}
