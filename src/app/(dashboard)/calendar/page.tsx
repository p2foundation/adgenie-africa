import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarView } from "@/components/calendar/calendar-view";
import {
  gridRange,
  isDayKey,
  isMonth,
  monthKey,
  weekRange,
  weekStartKey,
} from "@/lib/calendar";
import { readCalendar, readSession } from "@/lib/session";

export const metadata: Metadata = { title: "Content calendar" };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; week?: string; view?: string }>;
}) {
  const params = await searchParams;
  const view = params.view === "month" ? "month" : "week";
  const week = isDayKey(params.week) ? weekStartKey(params.week) : weekStartKey();
  const month = isMonth(params.month)
    ? params.month
    : view === "month"
      ? monthKey()
      : week.slice(0, 7);
  const range = view === "month" ? gridRange(month) : weekRange(week);

  const [calendar, profile] = await Promise.all([
    readCalendar({ from: range.from, to: range.to }),
    readSession(),
  ]);
  if (!calendar || !profile) redirect("/sign-in");

  return (
    <CalendarView
      initialView={view}
      initialWeek={week}
      initialMonth={month}
      initial={calendar}
      todayKey={new Date().toISOString().slice(0, 10)}
    />
  );
}
