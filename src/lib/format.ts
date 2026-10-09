const DAY = 86_400_000;

export function relativeAge(date: Date): string {
  const ms = Math.max(0, Date.now() - date.getTime());
  if (ms < DAY / 24) return `${Math.floor(ms / 60_000)}m`;
  if (ms < DAY) return `${Math.floor(ms / (DAY / 24))}h`;
  if (ms < 14 * DAY) return `${Math.floor(ms / DAY)}d`;
  if (ms < 60 * DAY) return `${Math.floor(ms / (7 * DAY))}w`;
  if (ms < 365 * DAY) return `${Math.floor(ms / (30 * DAY))}mo`;
  return `${Math.floor(ms / (365 * DAY))}y`;
}
