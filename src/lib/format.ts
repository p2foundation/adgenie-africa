const dateTime = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

const dateOnly = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return dateTime.format(new Date(value));
}

export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  return dateOnly.format(new Date(value));
}

/** Coarse age is enough for a client list; exact timestamps stay in the tooltip. */
export function formatRelative(value: string | Date | null | undefined): string {
  if (!value) return "never";
  const then = new Date(value).getTime();
  const minutes = Math.round((Date.now() - then) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
}

/** Settlement is always GHS, so this is the shelf price itself; display conversion is a separate helper. */
export function formatGhs(pesewas: number): string {
  return `GH¢${(pesewas / 100).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Provider costs are logged in millionths of a dollar. */
export function formatUsdMicros(micros: number): string {
  const usd = micros / 1_000_000;
  return `$${usd.toLocaleString("en-US", {
    minimumFractionDigits: usd > 0 && usd < 1 ? 4 : 2,
    maximumFractionDigits: usd > 0 && usd < 1 ? 4 : 2,
  })}`;
}
