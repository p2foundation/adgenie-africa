import { NextResponse } from "next/server";
import {
  buildIcs,
  gridRange,
  isDayKey,
  isMonth,
  monthKey,
  weekRange,
  weekStartKey,
} from "@/lib/calendar";
import { readCalendar } from "@/lib/session";

/** Download the visible week or month as an .ics file for Google/Apple/Outlook. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const weekParam = params.get("week");
  const monthParam = params.get("month");
  const useWeek = isDayKey(weekParam ?? undefined);
  const week = useWeek ? weekStartKey(weekParam!) : null;
  const month = isMonth(monthParam ?? undefined) ? monthParam! : monthKey();
  const range = week ? weekRange(week) : gridRange(month);
  const label = week ?? month;

  try {
    const data = await readCalendar({ from: range.from, to: range.to });
    if (!data) {
      return NextResponse.json({ message: "Sign in to export." }, { status: 401 });
    }

    return new NextResponse(buildIcs(data.scheduled), {
      headers: {
        "content-type": "text/calendar; charset=utf-8",
        "content-disposition": `attachment; filename="adgenie-runway-${label}.ics"`,
        "cache-control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Calendar export is unavailable right now." },
      { status: 500 }
    );
  }
}
