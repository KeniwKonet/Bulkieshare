/**
 * Display formatting for dates and durations.
 *
 * Everything is stored UTC and rendered in Africa/Lagos, which is the only
 * timezone the product operates in. Formatting is pinned to that zone
 * explicitly so a server in another region renders the same strings.
 */

const ZONE = "Africa/Lagos";

export function formatShareDate(date: Date): string {
  return new Intl.DateTimeFormat("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: ZONE,
  }).format(date);
}

export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    timeZone: ZONE,
  }).format(date);
}

/** "28 JUL 09:00" — the pool timeline format. */
export function formatEventStamp(date: Date): string {
  const d = new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    timeZone: ZONE,
  }).format(date);
  const t = new Intl.DateTimeFormat("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: ZONE,
  }).format(date);
  return `${d.toUpperCase()} ${t}`;
}

export function formatTimeOfDay(date: Date): string {
  return new Intl.DateTimeFormat("en-NG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: ZONE,
  }).format(date);
}

/**
 * How a pool's closing time reads on a card: "Fri 18:00" when it is close,
 * "6 days left" when it is far out, "closed" once it has passed.
 */
export function formatClosesAt(closesAt: Date, now: Date = new Date()): string {
  const ms = closesAt.getTime() - now.getTime();
  if (ms <= 0) return "closed";

  const days = Math.floor(ms / 86_400_000);
  if (days >= 2) return `${days} days left`;

  const weekday = new Intl.DateTimeFormat("en-NG", {
    weekday: "short",
    timeZone: ZONE,
  }).format(closesAt);
  return `${weekday} ${formatTimeOfDay(closesAt)}`;
}

/** Seconds remaining, floored at zero — drives the payment countdown. */
export function secondsUntil(at: Date, now: Date = new Date()): number {
  return Math.max(0, Math.floor((at.getTime() - now.getTime()) / 1000));
}

/** "4h" / "31h left" / "breaching" — dispute SLA display. */
export function formatSlaRemaining(dueAt: Date, now: Date = new Date()): string {
  const ms = dueAt.getTime() - now.getTime();
  if (ms <= 0) return "breaching";
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return `${Math.floor(ms / 60_000)}m left`;
  return `${hours}h left`;
}

export function isBreaching(dueAt: Date, now: Date = new Date()): boolean {
  return dueAt.getTime() <= now.getTime();
}

/** "3 DAYS OLD" — how long an unmatched transfer has been sitting. */
export function formatAge(since: Date, now: Date = new Date()): string {
  const days = Math.floor((now.getTime() - since.getTime()) / 86_400_000);
  if (days < 1) return "today";
  return `${days} day${days === 1 ? "" : "s"} old`;
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3_600_000);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}
