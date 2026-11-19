import type { CampaignCalendarItem } from "@/lib/api";

/** Ghana is UTC all year; keep wall-clock dates stable on server and client. */
export const ACCRA = "Africa/Accra";

export function monthKey(value: Date = new Date()): string {
  return value.toISOString().slice(0, 7);
}

export function isMonth(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value));
}

const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function isDayKey(value: string | undefined): value is string {
  if (!value || !DAY_KEY.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export function addMonths(month: string, delta: number): string {
  const [year, index] = month.split("-").map(Number);
  return new Date(Date.UTC(year!, index! - 1 + delta, 1))
    .toISOString()
    .slice(0, 7);
}

/** Monday 00:00 UTC of the week containing `value`. */
export function weekStart(value: Date | string = new Date()): Date {
  const day = new Date(value);
  const weekday = (day.getUTCDay() + 6) % 7;
  const start = new Date(day);
  start.setUTCDate(start.getUTCDate() - weekday);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

export function weekStartKey(value: Date | string = new Date()): string {
  return weekStart(value).toISOString().slice(0, 10);
}

export function addWeeks(anchor: string, delta: number): string {
  const start = weekStart(anchor);
  start.setUTCDate(start.getUTCDate() + delta * 7);
  return start.toISOString().slice(0, 10);
}

/** Half-open [Monday, next Monday) window, ready for the calendar API. */
export function weekRange(anchor: string | Date = new Date()): {
  from: string;
  to: string;
  startKey: string;
} {
  const start = weekStart(anchor);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return {
    from: start.toISOString(),
    to: end.toISOString(),
    startKey: start.toISOString().slice(0, 10),
  };
}

export function formatWeekday(value: Date | string, style: "short" | "long" = "short"): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: style,
    timeZone: "UTC",
  }).format(new Date(value));
}

export function monthLabel(month: string, style: "long" | "short" = "long"): string {
  return new Intl.DateTimeFormat("en-GB", {
    month: style,
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00.000Z`));
}

export function dateKey(value: string | Date): string {
  return new Date(value).toISOString().slice(0, 10);
}

export function monthGrid(month: string): Date[] {
  const first = new Date(`${month}-01T00:00:00.000Z`);
  const weekday = (first.getUTCDay() + 6) % 7; // Monday-first
  const start = new Date(first);
  start.setUTCDate(start.getUTCDate() - weekday);
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index);
    return day;
  });
}

/** The full six-week window a month grid shows, including spill-over days. */
export function gridRange(month: string): { from: string; to: string } {
  const days = monthGrid(month);
  const from = days[0]!;
  const to = new Date(days[days.length - 1]!);
  to.setUTCDate(to.getUTCDate() + 1);
  return { from: from.toISOString(), to: to.toISOString() };
}

/** Monday-first week containing the anchor day. */
export function weekDays(anchor: Date | string = new Date()): Date[] {
  const start = weekStart(anchor);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return date;
  });
}

export function isToday(value: Date | string): boolean {
  return dateKey(value) === dateKey(new Date());
}

export function isInMonth(value: Date, month: string): boolean {
  return value.toISOString().slice(0, 7) === month;
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: ACCRA,
  })
    .format(new Date(iso))
    .toLowerCase()
    .replace(":00", ":00");
}

export function formatDay(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: ACCRA,
  }).format(new Date(iso));
}

export function formatLongDay(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: ACCRA,
  }).format(new Date(iso));
}

export function formatWeekRange(days: Date[]): string {
  const first = days[0];
  const last = days[days.length - 1];
  if (!first || !last) return "";
  return `${formatDay(first.toISOString())} – ${formatDay(last.toISOString())}`;
}

export function dayItems(
  items: CampaignCalendarItem[],
  day: Date
): CampaignCalendarItem[] {
  const key = dateKey(day);
  return items
    .filter((item) => item.schedule && dateKey(item.schedule.scheduledAt) === key)
    .sort((a, b) =>
      (a.schedule?.scheduledAt ?? "").localeCompare(b.schedule?.scheduledAt ?? "")
    );
}

export function nextPost(
  items: CampaignCalendarItem[],
  now = new Date()
): CampaignCalendarItem | null {
  return (
    items
      .filter(
        (item) =>
          item.schedule &&
          item.schedule.status === "scheduled" &&
          new Date(item.schedule.scheduledAt) >= now
      )
      .sort((a, b) =>
        (a.schedule?.scheduledAt ?? "").localeCompare(b.schedule?.scheduledAt ?? "")
      )[0] ?? null
  );
}

/** A WhatsApp-ready summary of the visible week. */
export function weekMessage(items: CampaignCalendarItem[], days: Date[]): string {
  const first = days[0];
  const last = days[days.length - 1];
  if (!first || !last) return "";
  const lines = [`AdGenie runway · ${formatWeekRange(days)}`];

  for (const day of days) {
    const entries = dayItems(items, day);
    if (entries.length === 0) continue;
    lines.push("");
    lines.push(formatDay(day.toISOString()).toUpperCase());
    for (const entry of entries) {
      const time = entry.schedule ? formatTime(entry.schedule.scheduledAt) : "";
      lines.push(
        `• ${time} — ${entry.headline} (${entry.schedule?.channel ?? "whatsapp"})`
      );
    }
  }

  if (lines.length === 1) lines.push("", "Nothing scheduled yet.");
  return lines.join("\n");
}

const ICS_DATE = (date: Date) =>
  date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

/** Calendar export that works with Google Calendar, Apple Calendar and Outlook. */
export function buildIcs(
  items: CampaignCalendarItem[],
  now = new Date()
): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AdGenie Africa//Content runway//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:AdGenie content runway",
  ];

  for (const item of items) {
    if (!item.schedule) continue;
    const start = new Date(item.schedule.scheduledAt);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${item.id}@adgenie.africa`,
      `DTSTAMP:${ICS_DATE(now)}`,
      `DTSTART:${ICS_DATE(start)}`,
      `DTEND:${ICS_DATE(end)}`,
      `SUMMARY:${escapeIcs(`${item.headline} · ${item.schedule.channel}`)}`,
      `DESCRIPTION:${escapeIcs(
        [
          item.businessName,
          item.schedule.note,
          `Open in AdGenie: /campaigns/${item.id}`,
        ]
          .filter(Boolean)
          .join("\n")
      )}`,
      "END:VEVENT"
    );
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}
