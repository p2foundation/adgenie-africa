"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Box,
  CalendarDays,
  CalendarPlus,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Download,
  Facebook,
  Film,
  GripVertical,
  Image as ImageIcon,
  Instagram,
  Loader2,
  MessageCircle,
  Music2,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import {
  ApiError,
  api,
  type CampaignCalendar,
  type CampaignCalendarItem,
  type ScheduleChannel,
  type ScheduleStatus,
} from "@/lib/api";
import {
  addMonths,
  addWeeks,
  dayItems,
  formatDay,
  formatLongDay,
  formatTime,
  formatWeekRange,
  formatWeekday,
  gridRange,
  isInMonth,
  monthGrid,
  monthLabel,
  nextPost,
  weekDays,
  weekMessage,
  weekRange,
  weekStartKey,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";
import { useDialogPanel } from "@/lib/dialog-panel";
import { useAssistantContext } from "@/components/assistant/assistant-provider";
import type { AssistantContext } from "@/lib/assistant";
import {
  CHANNEL_POLICIES,
  FIT_LABEL,
  rankChannels,
  type FitLevel,
} from "@adgenie/core";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const CHANNELS: Record<
  ScheduleChannel,
  {
    label: string;
    icon: typeof MessageCircle;
    bar: string;
    text: string;
    chip: string;
    tint: string;
    dot: string;
  }
> = {
  whatsapp: {
    label: "WhatsApp",
    icon: MessageCircle,
    bar: "bg-gradient-to-b from-emerald-400 to-teal-500",
    text: "text-emerald-300",
    chip: "border-emerald-400/20 bg-emerald-500/[0.09] text-emerald-100/85",
    tint: "from-emerald-500/[0.10]",
    dot: "bg-emerald-400",
  },
  instagram: {
    label: "Instagram",
    icon: Instagram,
    bar: "bg-gradient-to-b from-rose-400 via-fuchsia-400 to-amber-300",
    text: "text-rose-300",
    chip: "border-rose-400/20 bg-rose-500/[0.09] text-rose-100/85",
    tint: "from-rose-500/[0.10]",
    dot: "bg-rose-400",
  },
  tiktok: {
    label: "TikTok",
    icon: Music2,
    bar: "bg-gradient-to-b from-sky-400 to-cyan-500",
    text: "text-sky-300",
    chip: "border-sky-400/20 bg-sky-500/[0.09] text-sky-100/85",
    tint: "from-sky-500/[0.10]",
    dot: "bg-sky-400",
  },
  facebook: {
    label: "Facebook",
    icon: Facebook,
    bar: "bg-gradient-to-b from-indigo-400 to-blue-500",
    text: "text-indigo-300",
    chip: "border-indigo-400/20 bg-indigo-500/[0.09] text-indigo-100/85",
    tint: "from-indigo-500/[0.10]",
    dot: "bg-indigo-400",
  },
};

const CHANNEL_ORDER: ScheduleChannel[] = [
  "whatsapp",
  "instagram",
  "tiktok",
  "facebook",
];

/** Slots come from the shared channel policy, framed as habits not promises. */
const FIT_TONE: Record<FitLevel, string> = {
  native: "border-teal-400/20 bg-teal-500/[0.06]",
  workable: "border-amber-400/20 bg-amber-500/[0.06]",
  off_purpose: "border-rose-400/25 bg-rose-500/[0.07]",
};

const FIT_DOT: Record<FitLevel, string> = {
  native: "bg-teal-400",
  workable: "bg-amber-400",
  off_purpose: "bg-rose-400",
};

const ENGINE_BADGES = [
  { key: "image", label: "Still", icon: ImageIcon },
  { key: "motion", label: "Motion", icon: Film },
  { key: "spin", label: "360", icon: Box },
] as const;

const STATUS_LABEL: Record<ScheduleStatus, string> = {
  scheduled: "Scheduled",
  posted: "Posted",
  skipped: "Skipped",
};

type ViewMode = "week" | "month";

interface Editor {
  item: CampaignCalendarItem;
  existing: boolean;
  date: string;
  time: string;
  channel: ScheduleChannel;
  note: string;
  status: ScheduleStatus;
}

function prettyTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const suffix = (hours ?? 0) >= 12 ? "pm" : "am";
  return `${(hours ?? 0) % 12 || 12}:${String(minutes ?? 0).padStart(2, "0")} ${suffix}`;
}

function isoDay(key: string): string {
  return `${key}T00:00:00.000Z`;
}

function dayKey(value: Date | string): string {
  return new Date(value).toISOString().slice(0, 10);
}

export function CalendarView({
  initialView,
  initialWeek,
  initialMonth,
  initial,
  todayKey,
}: {
  initialView: ViewMode;
  initialWeek: string;
  initialMonth: string;
  initial: CampaignCalendar;
  todayKey: string;
}) {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>(initialView);
  const [week, setWeek] = useState(initialWeek);
  const [month, setMonth] = useState(initialMonth);
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropDay, setDropDay] = useState<string | null>(null);
  const [channel, setChannel] = useState<"all" | ScheduleChannel>("all");
  const [selectedDay, setSelectedDay] = useState(() =>
    todayKey >= initialWeek && todayKey < addWeeks(initialWeek, 1)
      ? todayKey
      : initialWeek
  );
  const [editor, setEditor] = useState<Editor | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [dayOpen, setDayOpen] = useState<string | null>(null);
  const [notice, setNotice] = useState<{
    tone: "ok" | "err";
    text: string;
  } | null>(null);
  const noticeTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    },
    []
  );

  const flash = useCallback((text: string, tone: "ok" | "err" = "ok") => {
    setNotice({ tone, text });
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 4200);
  }, []);

  const weekDates = useMemo(() => weekDays(week), [week]);
  const weekBounds = useMemo(() => weekRange(week), [week]);
  const monthDays = useMemo(() => monthGrid(month), [month]);
  const thisMonth = todayKey.slice(0, 7);

  const visible = useMemo(
    () =>
      channel === "all"
        ? data.scheduled
        : data.scheduled.filter((item) => item.schedule?.channel === channel),
    [data.scheduled, channel]
  );

  // Genie reads the board as the customer sees it: what is slotted in this
  // range, then the briefed plans still waiting for a day.
  const genieContext = useMemo<AssistantContext>(() => {
    const booked = data.scheduled.slice(0, 7).map((item) => ({
      day: item.schedule
        ? `${formatDay(item.schedule.scheduledAt)}, ${formatTime(item.schedule.scheduledAt)}`
        : "Waiting for a day",
      title: item.headline,
      channel: item.schedule?.channel,
      status: item.schedule?.status,
    }));
    const waiting = data.unscheduled
      .slice(0, Math.max(0, 7 - booked.length))
      .map((item) => ({ day: "Waiting for a day", title: item.headline }));
    return {
      screen: "calendar",
      agenda: {
        unscheduled: data.unscheduled.length,
        items: [...booked, ...waiting],
      },
    };
  }, [data]);
  useAssistantContext(genieContext);

  const visibleWeekItems = visible.filter(
    (item) =>
      item.schedule &&
      item.schedule.scheduledAt >= weekBounds.from &&
      item.schedule.scheduledAt < weekBounds.to
  );
  const visibleMonthItems = visible.filter(
    (item) =>
      item.schedule && isInMonth(new Date(item.schedule.scheduledAt), month)
  );
  const viewItems = view === "week" ? visibleWeekItems : visibleMonthItems;
  const viewPosted = viewItems.filter(
    (item) => item.schedule?.status === "posted"
  ).length;

  const next = nextPost(data.scheduled);

  const recapAnchor =
    view === "week"
      ? week
      : month === thisMonth
        ? todayKey
        : `${month}-01`;
  const recapDays = useMemo(() => weekDays(recapAnchor), [recapAnchor]);
  const recapBounds = useMemo(() => weekRange(recapAnchor), [recapAnchor]);
  const recapItems = data.scheduled.filter(
    (item) =>
      item.schedule &&
      item.schedule.scheduledAt >= recapBounds.from &&
      item.schedule.scheduledAt < recapBounds.to
  );
  const recapPosted = recapItems.filter(
    (item) => item.schedule?.status === "posted"
  ).length;
  const recapProgress =
    recapItems.length > 0
      ? Math.round((recapPosted / recapItems.length) * 100)
      : 0;

  const channelCounts = useMemo(() => {
    const counts: Record<ScheduleChannel, number> = {
      whatsapp: 0,
      instagram: 0,
      tiktok: 0,
      facebook: 0,
    };
    for (const item of data.scheduled) {
      if (item.schedule) counts[item.schedule.channel] += 1;
    }
    return counts;
  }, [data.scheduled]);

  const selectedItems = useMemo(
    () => dayItems(visible, new Date(isoDay(selectedDay))),
    [visible, selectedDay]
  );

  const fetchRange = useCallback(async (from: string, to: string) => {
    const search = new URLSearchParams({ from, to });
    return api<CampaignCalendar>(`/campaigns/calendar?${search.toString()}`);
  }, []);

  const loadWeek = useCallback(
    async (anchor: string) => {
      const range = weekRange(anchor);
      const end = addWeeks(range.startKey, 1);
      setLoading(true);
      try {
        const payload = await fetchRange(range.from, range.to);
        setData(payload);
        setWeek(range.startKey);
        setView("week");
        setSelectedDay((current) =>
          current >= range.startKey && current < end
            ? current
            : todayKey >= range.startKey && todayKey < end
              ? todayKey
              : range.startKey
        );
        router.replace(`/calendar?view=week&week=${range.startKey}`, {
          scroll: false,
        });
      } catch (err) {
        flash(
          err instanceof ApiError ? err.message : "That week could not load.",
          "err"
        );
      } finally {
        setLoading(false);
      }
    },
    [fetchRange, router, flash, todayKey]
  );

  const loadMonth = useCallback(
    async (target: string) => {
      if (view === "month" && target === month) return;
      const range = gridRange(target);
      setLoading(true);
      try {
        const payload = await fetchRange(range.from, range.to);
        setData(payload);
        setMonth(target);
        setView("month");
        router.replace(`/calendar?view=month&month=${target}`, {
          scroll: false,
        });
      } catch (err) {
        flash(
          err instanceof ApiError ? err.message : "That month could not load.",
          "err"
        );
      } finally {
        setLoading(false);
      }
    },
    [fetchRange, flash, month, router, view]
  );

  const refresh = useCallback(async () => {
    const range = view === "week" ? weekRange(week) : gridRange(month);
    try {
      setData(await fetchRange(range.from, range.to));
    } catch (err) {
      flash(
        err instanceof ApiError
          ? err.message
          : "The calendar could not refresh.",
        "err"
      );
    }
  }, [view, week, month, fetchRange, flash]);

  const step = useCallback(
    (delta: number) => {
      if (view === "week") void loadWeek(addWeeks(week, delta));
      else void loadMonth(addMonths(month, delta));
    },
    [view, week, month, loadWeek, loadMonth]
  );

  const goToday = useCallback(() => {
    if (view === "week") void loadWeek(weekStartKey(todayKey));
    else void loadMonth(thisMonth);
  }, [view, todayKey, thisMonth, loadWeek, loadMonth]);

  const switchView = useCallback(
    (nextView: ViewMode) => {
      if (nextView === view) return;
      if (nextView === "week") {
        const anchor = month === thisMonth ? todayKey : `${month}-01`;
        void loadWeek(weekStartKey(anchor));
      } else {
        void loadMonth(week.slice(0, 7));
      }
    },
    [view, month, thisMonth, todayKey, week, loadWeek, loadMonth]
  );

  const closeEditor = useCallback(() => {
    if (!saving) setEditor(null);
  }, [saving]);

  function openExisting(item: CampaignCalendarItem) {
    const schedule = item.schedule;
    if (!schedule) return;
    const iso = new Date(schedule.scheduledAt).toISOString();
    setConfirmRemove(false);
    setEditor({
      item,
      existing: true,
      date: iso.slice(0, 10),
      time: iso.slice(11, 16),
      channel: schedule.channel,
      note: schedule.note ?? "",
      status: schedule.status,
    });
  }

  function openNew(item: CampaignCalendarItem, date: string) {
    setConfirmRemove(false);
    setSelectedDay(date);
    setEditor({
      item,
      existing: false,
      date,
      time: "19:30",
      channel: channel === "all" ? "whatsapp" : channel,
      note: "",
      status: "scheduled",
    });
  }

  function patchEditor(patch: Partial<Editor>) {
    setEditor((current) => (current ? { ...current, ...patch } : current));
  }

  async function saveEditor(status?: ScheduleStatus) {
    if (!editor) return;
    const when = new Date(`${editor.date}T${editor.time}:00.000Z`);
    if (!editor.date || !editor.time || Number.isNaN(when.getTime())) {
      flash("Pick a valid day and time first.", "err");
      return;
    }

    setSaving(true);
    try {
      await api(`/campaigns/${editor.item.id}/schedule`, {
        method: "PATCH",
        body: {
          scheduled_at: when.toISOString(),
          channel: editor.channel,
          note: editor.note,
          status: status ?? editor.status,
        },
      });
      const targetDay = when.toISOString().slice(0, 10);
      setEditor(null);
      setDayOpen(null);
      setSelectedDay(targetDay);
      if (status === "posted") {
        flash("Marked as posted. Nice work.");
      } else {
        flash(
          `On the runway for ${formatDay(when.toISOString())}, ${formatTime(
            when.toISOString()
          )}.`
        );
      }

      if (view === "week") {
        const end = addWeeks(week, 1);
        if (targetDay >= week && targetDay < end) await refresh();
        else await loadWeek(weekStartKey(targetDay));
      } else if (targetDay.slice(0, 7) === month) {
        await refresh();
      } else {
        await loadMonth(targetDay.slice(0, 7));
      }
    } catch (err) {
      flash(
        err instanceof ApiError ? err.message : "That slot could not be saved.",
        "err"
      );
    } finally {
      setSaving(false);
    }
  }

  async function unscheduleEditor() {
    if (!editor) return;
    setSaving(true);
    try {
      await api(`/campaigns/${editor.item.id}/schedule`, { method: "DELETE" });
      setEditor(null);
      setDayOpen(null);
      flash("Back on the bench — the plan is still in your library.");
      await refresh();
    } catch (err) {
      flash(
        err instanceof ApiError
          ? err.message
          : "That plan could not be unscheduled.",
        "err"
      );
    } finally {
      setSaving(false);
    }
  }

  async function moveTo(item: CampaignCalendarItem, targetDay: string) {
    const schedule = item.schedule;
    if (!schedule || schedule.scheduledAt.slice(0, 10) === targetDay) {
      setDragId(null);
      setDropDay(null);
      return;
    }

    const time = schedule.scheduledAt.slice(11, 16);
    const iso = `${targetDay}T${time}:00.000Z`;
    setMovingId(item.id);
    setDropDay(null);
    try {
      await api(`/campaigns/${item.id}/schedule`, {
        method: "PATCH",
        body: {
          scheduled_at: iso,
          channel: schedule.channel,
          note: schedule.note ?? "",
          status: schedule.status,
        },
      });
      setSelectedDay(targetDay);
      flash(`Moved to ${formatDay(iso)}, ${formatTime(iso)}.`);
      await refresh();
    } catch (err) {
      flash(
        err instanceof ApiError ? err.message : "That post could not be moved.",
        "err"
      );
    } finally {
      setMovingId(null);
      setDragId(null);
    }
  }

  const copyRecap = useCallback(async () => {
    const message = weekMessage(data.scheduled, recapDays);
    try {
      await navigator.clipboard.writeText(message);
      flash(
        recapItems.length > 0
          ? `Week recap copied — ${recapItems.length} post${
              recapItems.length === 1 ? "" : "s"
            }.`
          : "Week recap copied — nothing on this week yet."
      );
    } catch {
      flash("Clipboard is blocked in this browser.", "err");
    }
  }, [data.scheduled, recapDays, recapItems.length, flash]);

  const exportHref =
    view === "week"
      ? `/calendar/ics?week=${week}`
      : `/calendar/ics?month=${month}`;

  function handleDragOver(event: DragEvent<HTMLDivElement>, key: string) {
    if (!dragId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (dropDay !== key) setDropDay(key);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>, key: string) {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain") || dragId;
    const item = data.scheduled.find((entry) => entry.id === id);
    setDropDay(null);
    if (item) void moveTo(item, key);
    else setDragId(null);
  }

  return (
    <div className="shell-wide space-y-5">
      <div className="animate-in flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-400">
            Content runway
          </p>
          <h1 className="font-display text-[2rem] font-bold leading-[1.05] tracking-tight text-white sm:text-3xl md:text-[2.6rem]">
            One week.
            <br />
            <span className="gradient-text-hero glow-text-gold">
              Every post in its lane.
            </span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/50 md:text-base">
            Open a post to set its channel, hour and note. On desktop, drag it
            to move it. Copy the week as a WhatsApp rundown, or export it to
            your calendar.
          </p>
        </div>
        <Link
          href="/create"
          className="btn-primary inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold touch-target sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          New campaign
        </Link>
      </div>

      <div className="grid overflow-hidden rounded-2xl border border-white/8 bg-[#080b16]/85 sm:grid-cols-3 sm:divide-x sm:divide-white/6">
        <ConsoleCell
          label="Next up"
          value={
            next?.schedule
              ? `${formatWeekday(next.schedule.scheduledAt)} · ${formatTime(
                  next.schedule.scheduledAt
                )}`
              : "Clear"
          }
          hint={next ? next.headline : "No posts scheduled ahead."}
          icon={CalendarDays}
          tone="amber"
        />
        <ConsoleCell
          label={view === "week" ? "This week" : "This month"}
          value={`${viewItems.length} post${viewItems.length === 1 ? "" : "s"}`}
          hint={`${viewPosted} posted · ${
            viewItems.length - viewPosted
          } still to go`}
          icon={Sparkles}
          tone="violet"
        />
        <ConsoleCell
          label="On the bench"
          value={String(data.unscheduled.length)}
          hint="Plans waiting for a day"
          icon={Clock3}
          tone="teal"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section
          className="min-w-0 overflow-hidden rounded-3xl border border-white/8 bg-[#070a13]/90"
          aria-label={
            view === "week"
              ? `Calendar for the week of ${formatDay(weekBounds.from)}`
              : `Calendar for ${monthLabel(month)}`
          }
        >
          <div className="h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

          <div data-touchbar className="flex flex-wrap items-center gap-2.5 border-b border-white/6 p-3 md:p-4">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => step(-1)}
                disabled={loading}
                aria-label={view === "week" ? "Previous week" : "Previous month"}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 text-white/45 transition-colors before:absolute before:-inset-1 before:content-[''] hover:border-white/20 hover:text-white disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                disabled={loading}
                aria-label={view === "week" ? "Next week" : "Next month"}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 text-white/45 transition-colors before:absolute before:-inset-1 before:content-[''] hover:border-white/20 hover:text-white disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="truncate font-display text-base font-semibold leading-tight text-white md:text-lg">
                {view === "week"
                  ? formatWeekRange(weekDates)
                  : monthLabel(month)}
              </h2>
              <p className="mt-0.5 text-[11px] uppercase tracking-widest text-white/40">
                {loading
                  ? "Loading…"
                  : `${viewItems.length} scheduled · ${viewPosted} posted`}
              </p>
            </div>

            <div className="flex items-center rounded-xl border border-white/8 bg-white/[0.03] p-0.5">
              {(["week", "month"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => switchView(mode)}
                  aria-pressed={view === mode}
                  className={cn(
                    "rounded-[10px] px-2.5 py-1.5 text-[11px] font-semibold capitalize transition-colors",
                    view === mode
                      ? "bg-amber-500/15 text-amber-200 shadow-sm"
                      : "text-white/50 hover:text-white/70"
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={goToday}
              disabled={loading}
              className="rounded-xl border border-white/8 px-2.5 py-1.5 text-[11px] font-medium text-white/45 transition-colors hover:border-white/20 hover:text-white disabled:opacity-40"
            >
              Today
            </button>
          </div>

          <div data-touchbar className="flex flex-wrap items-center gap-2 border-b border-white/6 px-3 py-2.5 md:px-4">
            <div className="no-scrollbar -mx-1 flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto px-1 py-0.5">
              <FilterChip
                active={channel === "all"}
                onClick={() => setChannel("all")}
                label="All channels"
                count={data.scheduled.length}
              />
              {CHANNEL_ORDER.map((entry) => {
                const meta = CHANNELS[entry];
                const Icon = meta.icon;
                return (
                  <FilterChip
                    key={entry}
                    active={channel === entry}
                    onClick={() =>
                      setChannel((current) =>
                        current === entry ? "all" : entry
                      )
                    }
                    label={meta.label}
                    count={channelCounts[entry]}
                    icon={<Icon className={cn("h-3 w-3", meta.text)} />}
                  />
                );
              })}
            </div>

            <div className="flex w-full items-center gap-1.5 sm:w-auto">
              <button
                type="button"
                onClick={() => void copyRecap()}
                title={`Copy ${formatWeekRange(recapDays)}`}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/8 px-2.5 py-1.5 text-[11px] font-medium text-white/45 transition-colors hover:border-white/20 hover:text-white sm:flex-none"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy week
              </button>
              <a
                href={exportHref}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-white/8 px-2.5 py-1.5 text-[11px] font-medium text-white/45 transition-colors hover:border-white/20 hover:text-white sm:flex-none"
              >
                <Download className="h-3.5 w-3.5" />
                Export .ics
              </a>
            </div>
          </div>

          <div className="relative p-2.5 md:p-3">
            {loading && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#070a13]/60 backdrop-blur-[2px]">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#0c1120] px-3 py-1.5 text-xs text-white/60">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-300" />
                  Fetching {view === "week" ? "week" : monthLabel(month, "short")}
                </span>
              </div>
            )}

            {!loading && viewItems.length === 0 && (
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-400/15 bg-amber-500/[0.05] px-3.5 py-2.5 md:mb-3">
                <p className="text-xs leading-relaxed text-amber-100/65">
                  {channel === "all"
                    ? view === "week"
                      ? "This week is open. Pick a plan and give it a day."
                      : "This month is open. Pick a plan and give it a day."
                    : `Nothing on ${CHANNELS[channel].label} in this view.`}
                </p>
                {channel === "all" ? (
                  data.unscheduled[0] ? (
                    <button
                      type="button"
                      onClick={() => openNew(data.unscheduled[0]!, todayKey)}
                      className="touch-target inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold text-amber-200 transition-colors hover:border-amber-400/50"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" />
                      Place a plan
                    </button>
                  ) : (
                    <Link
                      href="/create"
                      className="touch-target inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold text-amber-200 transition-colors hover:border-amber-400/50"
                    >
                      Create a campaign
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => setChannel("all")}
                    className="touch-target inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 text-[11px] font-semibold text-amber-200 transition-colors hover:border-amber-400/50"
                  >
                    Show all channels
                  </button>
                )}
              </div>
            )}

            {view === "week" ? (
              <>
                <div className="hidden xl:grid xl:grid-cols-7 xl:gap-2">
                  {weekDates.map((day) => {
                    const key = dayKey(day);
                    return (
                      <WeekColumn
                        key={key}
                        day={day}
                        items={dayItems(visible, day)}
                        today={key === todayKey}
                        drop={dropDay === key && dragId !== null}
                        dragId={dragId}
                        movingId={movingId}
                        onOpenDay={setDayOpen}
                        onOpenItem={openExisting}
                        onDragStart={setDragId}
                        onDragEnd={() => {
                          setDragId(null);
                          setDropDay(null);
                        }}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                      />
                    );
                  })}
                </div>

                <div className="xl:hidden">
                  <div className="grid grid-cols-7 gap-1 rounded-2xl border border-white/6 bg-white/[0.02] p-1">
                    {weekDates.map((day) => {
                      const key = dayKey(day);
                      const items = dayItems(visible, day);
                      const selected = key === selectedDay;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedDay(key)}
                          data-calendar-day={key}
                          aria-pressed={selected}
                          className={cn(
                            "flex min-h-[54px] flex-col items-center justify-center rounded-xl px-0.5 py-1.5 transition-colors",
                            selected
                              ? "bg-amber-500/15 text-amber-100 ring-1 ring-inset ring-amber-400/30"
                              : "text-white/45 hover:bg-white/5 hover:text-white/75"
                          )}
                        >
                          <span className="text-[11px] font-semibold uppercase tracking-wider opacity-70">
                            {formatWeekday(day)}
                          </span>
                          <span
                            className={cn(
                              "font-display text-base font-semibold leading-tight tabular-nums",
                              key === todayKey && !selected && "text-amber-300"
                            )}
                          >
                            {day.getUTCDate()}
                          </span>
                          <span className="mt-0.5 flex h-1.5 items-center gap-0.5">
                            {items.slice(0, 3).map((item) => (
                              <span
                                key={item.id}
                                className={cn(
                                  "h-1 w-1 rounded-full",
                                  item.schedule
                                    ? CHANNELS[item.schedule.channel].dot
                                    : "bg-white/30"
                                )}
                              />
                            ))}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3">
                    <div className="mb-2 flex items-center justify-between gap-2 px-0.5">
                      <p className="min-w-0 truncate font-display text-sm font-semibold text-white/85">
                        {formatLongDay(isoDay(selectedDay))}
                      </p>
                      <button
                        type="button"
                        onClick={() => setDayOpen(selectedDay)}
                        data-calendar-day={selectedDay}
                        className="touch-target inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-amber-400/25 bg-amber-500/[0.08] px-3 py-1 text-[11px] font-semibold text-amber-200"
                      >
                        <Plus className="h-3 w-3" />
                        Add
                      </button>
                    </div>

                    {selectedItems.length > 0 ? (
                      <div className="space-y-2">
                        {selectedItems.map((item) => (
                          <PostCard
                            key={item.id}
                            item={item}
                            showBusiness
                            onOpen={() => openExisting(item)}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/8 px-4 py-8 text-center">
                        <CalendarPlus className="mx-auto h-5 w-5 text-white/40" />
                        <p className="mt-2 text-xs text-white/45">
                          {channel === "all"
                            ? "Nothing on this day yet."
                            : `No ${CHANNELS[channel].label} posts this day.`}
                        </p>
                        {channel === "all" ? (
                          <button
                            type="button"
                            onClick={() => setDayOpen(selectedDay)}
                            data-calendar-day={selectedDay}
                            className="touch-target mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl border border-amber-400/25 bg-amber-500/[0.08] px-4 py-2 text-[11px] font-semibold text-amber-200 transition-colors hover:border-amber-400/45"
                          >
                            <CalendarPlus className="h-3.5 w-3.5" />
                            Place a plan
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setChannel("all")}
                            className="touch-target mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/12 px-4 py-2 text-[11px] font-semibold text-white/60 transition-colors hover:border-amber-400/25 hover:text-amber-200"
                          >
                            Show all channels
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <MonthBoard
                days={monthDays}
                month={month}
                todayKey={todayKey}
                items={visible}
                onOpenDay={setDayOpen}
                onOpenItem={openExisting}
              />
            )}
          </div>
        </section>

        <aside className="space-y-4 self-start xl:sticky xl:top-24">
          <section className="rounded-2xl border border-white/8 bg-[#080b16]/85 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                  On the bench
                </p>
                <p className="mt-1 text-xs leading-relaxed text-white/45">
                  Briefed plans with credits attached. Give each one a day.
                </p>
              </div>
              <span className="flex h-8 min-w-8 items-center justify-center rounded-lg border border-white/8 bg-white/[0.03] px-2 font-display text-sm font-semibold text-white/65 tabular-nums">
                {data.unscheduled.length}
              </span>
            </div>

            <div className="mt-3 max-h-[430px] space-y-2 overflow-y-auto pr-0.5">
              {data.unscheduled.map((item) => (
                <UnscheduledCard
                  key={item.id}
                  item={item}
                  onPlace={() => openNew(item, selectedDay)}
                />
              ))}
              {data.unscheduled.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/8 px-3 py-6 text-center">
                  <Check className="mx-auto h-4 w-4 text-teal-300/70" />
                  <p className="mt-2 text-xs font-medium text-white/55">
                    Every plan has a slot.
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-white/40">
                    Brief the next campaign and it lands here.
                  </p>
                  <Link
                    href="/create"
                    className="touch-target mt-3 inline-flex items-center justify-center gap-1 rounded-lg border border-amber-400/25 bg-amber-500/[0.08] px-3 py-1.5 text-[11px] font-semibold text-amber-200/90 hover:border-amber-400/45 hover:text-amber-200"
                  >
                    Create a campaign
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-amber-400/15 bg-gradient-to-br from-amber-500/[0.07] via-transparent to-transparent p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-amber-300/80">
              <Sparkles className="h-3 w-3" />
              Week recap
            </p>
            <p className="mt-2 font-display text-2xl font-semibold leading-none text-white/90">
              {recapItems.length}
              <span className="ml-1.5 text-sm font-normal text-white/40">
                post{recapItems.length === 1 ? "" : "s"}
              </span>
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-white/50">
              {formatWeekRange(recapDays)} · {recapPosted} posted
            </p>
            <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
              <span
                className="h-full rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 transition-[width] duration-500"
                style={{ width: `${recapProgress}%` }}
              />
            </div>
            <button
              type="button"
              onClick={() => void copyRecap()}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-200 transition-colors hover:border-amber-400/45 touch-target"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy week recap
            </button>
          </section>
        </aside>
      </div>

      {dayOpen && (
        <DaySheet
          date={dayOpen}
          items={dayItems(data.scheduled, new Date(isoDay(dayOpen)))}
          unscheduled={data.unscheduled}
          onPickItem={(item) => {
            setDayOpen(null);
            openExisting(item);
          }}
          onPlace={(item) => {
            const date = dayOpen;
            setDayOpen(null);
            openNew(item, date);
          }}
          onClose={() => setDayOpen(null)}
        />
      )}

      {editor && (
        <ScheduleDialog
          editor={editor}
          saving={saving}
          confirmRemove={confirmRemove}
          todayKey={todayKey}
          onPatch={patchEditor}
          onClose={closeEditor}
          onSave={(status) => void saveEditor(status)}
          onRemove={() => void unscheduleEditor()}
          onConfirmRemove={setConfirmRemove}
        />
      )}

      {notice && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            "animate-in fixed bottom-5 left-1/2 z-[55] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border px-4 py-2.5 text-center text-xs font-medium shadow-2xl backdrop-blur-xl",
            notice.tone === "err"
              ? "border-rose-400/30 bg-rose-950/85 text-rose-100"
              : "border-teal-400/25 bg-teal-950/85 text-teal-100"
          )}
        >
          {notice.text}
        </div>
      )}
    </div>
  );
}

function ConsoleCell({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof CalendarDays;
  tone: "amber" | "violet" | "teal";
}) {
  const tones = {
    amber: "border-amber-400/15 bg-amber-500/[0.05] text-amber-300",
    violet: "border-violet-400/15 bg-violet-500/[0.05] text-violet-300",
    teal: "border-teal-400/15 bg-teal-500/[0.05] text-teal-300",
  } as const;

  return (
    <div className="flex items-center gap-3 border-b border-white/6 p-3.5 last:border-b-0 sm:border-b-0 sm:p-4">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border",
          tones[tone]
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/45">
          {label}
        </p>
        <p className="truncate font-display text-base font-semibold leading-tight text-white/90">
          {value}
        </p>
        <p className="mt-0.5 truncate text-xs text-white/45">{hint}</p>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-medium transition-colors",
        active
          ? "border-amber-400/35 bg-amber-500/10 text-amber-200"
          : "border-white/8 text-white/55 hover:border-white/20 hover:text-white/70"
      )}
    >
      {icon}
      {label}
      <span className="tabular-nums text-white/45">{count}</span>
    </button>
  );
}

function WeekColumn({
  day,
  items,
  today,
  drop,
  dragId,
  movingId,
  onOpenDay,
  onOpenItem,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  day: Date;
  items: CampaignCalendarItem[];
  today: boolean;
  drop: boolean;
  dragId: string | null;
  movingId: string | null;
  onOpenDay: (key: string) => void;
  onOpenItem: (item: CampaignCalendarItem) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLDivElement>, key: string) => void;
  onDrop: (event: DragEvent<HTMLDivElement>, key: string) => void;
}) {
  const key = dayKey(day);

  return (
    <div
      onDragOver={(event) => onDragOver(event, key)}
      onDrop={(event) => onDrop(event, key)}
      className={cn(
        "flex min-h-[460px] flex-col rounded-2xl border p-2 transition-colors",
        today
          ? "border-amber-400/20 bg-amber-500/[0.035]"
          : "border-white/6 bg-white/[0.015]",
        drop && "border-amber-400/50 bg-amber-500/[0.08]",
        dragId && !drop && "border-dashed"
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-1 px-1">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <span
            className={cn(
              "text-[11px] font-semibold uppercase tracking-widest",
              today ? "text-amber-300" : "text-white/45"
            )}
          >
            {formatWeekday(day)}
          </span>
          <span
            className={cn(
              "font-display text-lg font-semibold leading-none tabular-nums",
              today ? "text-amber-200" : "text-white/70"
            )}
          >
            {day.getUTCDate()}
          </span>
        </div>
        {items.length > 0 && (
          <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[11px] tabular-nums text-white/40">
            {items.length}
          </span>
        )}
      </div>

      {items.length > 0 ? (
        <div className="space-y-2">
          {items.map((item) => (
            <PostCard
              key={item.id}
              item={item}
              dragging={dragId === item.id}
              moving={movingId === item.id}
              onOpen={() => onOpenItem(item)}
              onDragStart={() => onDragStart(item.id)}
              onDragEnd={onDragEnd}
            />
          ))}
          <button
            type="button"
            onClick={() => onOpenDay(key)}
            data-calendar-day={key}
            className="touch-target flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-white/8 py-1.5 text-[11px] font-medium text-white/40 transition-colors hover:border-amber-400/30 hover:text-amber-200/80"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onOpenDay(key)}
          data-calendar-day={key}
          className="flex min-h-[112px] flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/8 text-white/40 transition-colors hover:border-amber-400/30 hover:bg-amber-500/[0.03] hover:text-amber-200/80"
        >
          <Plus className="h-4 w-4" />
          <span className="text-[11px] font-medium">Add a post</span>
        </button>
      )}
    </div>
  );
}

function PostCard({
  item,
  onOpen,
  onDragStart,
  onDragEnd,
  dragging = false,
  moving = false,
  showBusiness = false,
}: {
  item: CampaignCalendarItem;
  onOpen: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  dragging?: boolean;
  moving?: boolean;
  showBusiness?: boolean;
}) {
  const schedule = item.schedule;
  if (!schedule) return null;
  const meta = CHANNELS[schedule.channel];
  const Icon = meta.icon;
  const posted = schedule.status === "posted";
  const skipped = schedule.status === "skipped";
  const engines = ENGINE_BADGES.filter((engine) =>
    item.creative.engines.includes(engine.key)
  );

  return (
    <button
      type="button"
      draggable={Boolean(onDragStart)}
      onDragStart={(event) => {
        if (!onDragStart) return;
        event.dataTransfer.setData("text/plain", item.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onClick={onOpen}
      title={`${item.headline} · ${meta.label} · ${formatTime(
        schedule.scheduledAt
      )}`}
      className={cn(
        "group relative block w-full cursor-grab select-none overflow-hidden rounded-xl border border-white/8 bg-[#0b1020] p-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-[#0e152a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 active:cursor-grabbing",
        (posted || skipped) && "opacity-60",
        dragging && "opacity-30",
        moving && "animate-pulse"
      )}
    >
      <span
        className={cn(
          "absolute inset-y-2 left-0 w-[2px] rounded-full",
          meta.bar
        )}
      />
      <span
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-70",
          meta.tint
        )}
      />
      <span className="relative block">
        <span className="flex items-center gap-1.5">
          <span className="text-[11px] font-semibold tabular-nums text-white/55">
            {formatTime(schedule.scheduledAt)}
          </span>
          <span className="ml-auto flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-white/45">
            {posted ? (
              <>
                <Check className="h-2.5 w-2.5 text-teal-300" />
                Posted
              </>
            ) : skipped ? (
              "Skipped"
            ) : (
              <GripVertical className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60" />
            )}
          </span>
        </span>
        <span className="mt-1 line-clamp-2 block text-[11px] font-semibold leading-snug text-white/85">
          {item.headline}
        </span>
        {showBusiness && item.businessName && (
          <span className="mt-0.5 block truncate text-[11px] text-white/40">
            {item.businessName}
          </span>
        )}
        <span className="mt-2 flex items-center gap-1.5">
          <Icon className={cn("h-3 w-3 shrink-0", meta.text)} />
          <span className="truncate text-[11px] font-medium uppercase tracking-wider text-white/50">
            {meta.label}
          </span>
          {engines.length > 0 && (
            <span className="ml-auto flex items-center gap-1 text-white/35">
              {engines.map((engine) => (
                <engine.icon key={engine.key} className="h-2.5 w-2.5" />
              ))}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

function MonthBoard({
  days,
  month,
  todayKey,
  items,
  onOpenDay,
  onOpenItem,
}: {
  days: Date[];
  month: string;
  todayKey: string;
  items: CampaignCalendarItem[];
  onOpenDay: (key: string) => void;
  onOpenItem: (item: CampaignCalendarItem) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/8">
      <div className="grid grid-cols-7 gap-px border-b border-white/8 bg-white/[0.06]">
        {WEEKDAYS.map((label) => (
          <div
            key={label}
            className="bg-[#080b16] px-1 py-2 text-center text-[11px] font-semibold uppercase tracking-widest text-white/45 sm:px-2 sm:text-left sm:text-[11px]"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px bg-white/[0.06]">
        {days.map((day) => (
          <MonthCell
            key={day.toISOString()}
            day={day}
            month={month}
            todayKey={todayKey}
            items={dayItems(items, day)}
            onOpenDay={onOpenDay}
            onOpenItem={onOpenItem}
          />
        ))}
      </div>
    </div>
  );
}

function MonthCell({
  day,
  month,
  todayKey,
  items,
  onOpenDay,
  onOpenItem,
}: {
  day: Date;
  month: string;
  todayKey: string;
  items: CampaignCalendarItem[];
  onOpenDay: (key: string) => void;
  onOpenItem: (item: CampaignCalendarItem) => void;
}) {
  const key = dayKey(day);
  const inside = isInMonth(day, month);
  const today = key === todayKey;

  return (
    <div
      className={cn(
        "group relative min-h-[54px] p-1 transition-colors sm:min-h-[84px] sm:p-1.5 lg:min-h-[104px]",
        inside
          ? "bg-[#080b16] hover:bg-[#0b1020]"
          : "bg-[#060911] opacity-55"
      )}
    >
      <button
        type="button"
        onClick={() => onOpenDay(key)}
        data-calendar-day={key}
        aria-label={`Open ${formatLongDay(isoDay(key))}`}
        className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-400/60"
      />
      <div className="pointer-events-none relative z-10 flex h-full flex-col">
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold tabular-nums sm:h-6 sm:min-w-6 sm:text-[11px]",
              today
                ? "bg-amber-400 text-black"
                : inside
                  ? "text-white/55"
                  : "text-white/35"
            )}
          >
            {day.getUTCDate()}
          </span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenDay(key);
            }}
            aria-label={`Add to ${formatLongDay(isoDay(key))}`}
            className="pointer-events-auto hidden h-5 w-5 items-center justify-center rounded-md text-transparent transition-colors hover:bg-white/10 hover:text-white focus-visible:text-white/60 group-hover:text-white/50 sm:flex"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>

        <div className="mt-1 flex items-center justify-center gap-0.5 lg:hidden">
          {items.slice(0, 3).map((item) => (
            <span
              key={item.id}
              className={cn(
                "h-1 w-1 rounded-full sm:h-1.5 sm:w-1.5",
                item.schedule
                  ? CHANNELS[item.schedule.channel].dot
                  : "bg-white/30"
              )}
            />
          ))}
          {items.length > 3 && (
            <span className="ml-0.5 text-[11px] font-semibold tabular-nums text-white/45">
              +{items.length - 3}
            </span>
          )}
        </div>

        <div className="mt-1 hidden space-y-1 lg:block">
          {items.slice(0, 2).map((item) => (
            <MonthChip
              key={item.id}
              item={item}
              onOpen={() => onOpenItem(item)}
            />
          ))}
          {items.length > 2 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpenDay(key);
              }}
              className="pointer-events-auto w-full rounded px-1 text-left text-[11px] font-semibold text-white/45 transition-colors hover:text-white/70"
            >
              +{items.length - 2} more
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MonthChip({
  item,
  onOpen,
}: {
  item: CampaignCalendarItem;
  onOpen: () => void;
}) {
  const schedule = item.schedule;
  if (!schedule) return null;
  const meta = CHANNELS[schedule.channel];
  const posted = schedule.status === "posted";

  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpen();
      }}
      title={`${item.headline} · ${meta.label} · ${formatTime(
        schedule.scheduledAt
      )}`}
      className={cn(
        "pointer-events-auto flex w-full items-center gap-1 truncate rounded border px-1.5 py-0.5 text-left text-[11px] font-medium transition-colors hover:brightness-125",
        meta.chip,
        posted && "opacity-60"
      )}
    >
      <span className="shrink-0 tabular-nums opacity-70">
        {formatTime(schedule.scheduledAt)}
      </span>
      <span className="truncate">{item.headline}</span>
    </button>
  );
}

function UnscheduledCard({
  item,
  onPlace,
}: {
  item: CampaignCalendarItem;
  onPlace: () => void;
}) {
  const engines = ENGINE_BADGES.filter((engine) =>
    item.creative.engines.includes(engine.key)
  );

  return (
    <div className="group rounded-xl border border-white/8 bg-gradient-to-br from-white/[0.04] to-transparent p-2.5 transition-colors hover:border-amber-400/25">
      <p className="truncate text-[11px] font-semibold text-white/80">
        {item.headline}
      </p>
      <p className="mt-0.5 truncate text-[11px] text-white/45">
        {item.businessName ?? "Your brand"}
        {item.formats.length > 0 ? ` · ${item.formats.join(" · ")}` : ""}
      </p>
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {engines.map((engine) => (
            <span
              key={engine.key}
              className="inline-flex items-center gap-1 rounded-full border border-white/8 px-1.5 py-0.5 text-[11px] font-medium text-white/50"
            >
              <engine.icon className="h-2.5 w-2.5" />
              {engine.label}
            </span>
          ))}
          {engines.length === 0 && (
            <span className="text-[11px] text-white/35">
              {formatDay(item.createdAt)}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onPlace}
          className="touch-target inline-flex shrink-0 items-center justify-center gap-1 rounded-md border border-amber-400/25 bg-amber-500/[0.08] px-3 py-1 text-[11px] font-semibold text-amber-200 transition-colors hover:border-amber-400/45"
        >
          Place
          <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  returnFocusTo,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  /** Where focus goes when the element that opened this dialog has unmounted. */
  returnFocusTo?: () => HTMLElement | null;
  children: ReactNode;
}) {
  const panel = useDialogPanel<HTMLDivElement>(onClose, {
    fallback: returnFocusTo,
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-white/10 bg-[#0a0e1a] shadow-2xl outline-none sm:max-w-md sm:rounded-2xl"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-white/6 bg-[#0a0e1a]/95 px-4 py-3.5 backdrop-blur">
          <div className="min-w-0">
            <h2 className="font-display text-sm font-semibold text-white">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 truncate text-[11px] text-white/45">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/5 hover:text-white touch-target"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function DaySheet({
  date,
  items,
  unscheduled,
  onPickItem,
  onPlace,
  onClose,
}: {
  date: string;
  items: CampaignCalendarItem[];
  unscheduled: CampaignCalendarItem[];
  onPickItem: (item: CampaignCalendarItem) => void;
  onPlace: (item: CampaignCalendarItem) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      title={formatLongDay(isoDay(date))}
      subtitle={
        items.length > 0
          ? `${items.length} post${items.length === 1 ? "" : "s"} on this day`
          : "Nothing scheduled yet"
      }
      onClose={onClose}
    >
      <div className="space-y-4 p-4">
        {items.length > 0 && (
          <div className="space-y-1.5">
            {items.map((item) => {
              const schedule = item.schedule!;
              const meta = CHANNELS[schedule.channel];
              const Icon = meta.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onPickItem(item)}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.02] p-2.5 text-left transition-colors hover:border-white/20"
                >
                  <span
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
                      meta.chip
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-white/85">
                      {item.headline}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-white/45">
                      {formatTime(schedule.scheduledAt)} · {meta.label} ·{" "}
                      {STATUS_LABEL[schedule.status]}
                    </span>
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/40" />
                </button>
              );
            })}
          </div>
        )}

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-white/45">
            {items.length > 0 ? "Place another plan" : "Pick a plan to place"}
          </p>
          {unscheduled.length > 0 ? (
            <div className="mt-2 space-y-1.5">
              {unscheduled.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onPlace(item)}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-white/8 bg-white/[0.02] p-2.5 text-left transition-colors hover:border-amber-400/30"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-white/80">
                      {item.headline}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-white/45">
                      {item.businessName ?? "Your brand"}
                      {item.formats.length > 0
                        ? ` · ${item.formats.join(" · ")}`
                        : ""}
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-amber-300/80">
                    Place
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-2 rounded-xl border border-dashed border-white/8 px-3 py-4 text-center text-[11px] leading-relaxed text-white/45">
              No plans waiting.{" "}
              <Link href="/create" className="font-semibold text-amber-300/80">
                Brief a campaign
              </Link>{" "}
              and it will appear here.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}

function ScheduleDialog({
  editor,
  saving,
  confirmRemove,
  todayKey,
  onPatch,
  onClose,
  onSave,
  onRemove,
  onConfirmRemove,
}: {
  editor: Editor;
  saving: boolean;
  confirmRemove: boolean;
  todayKey: string;
  onPatch: (patch: Partial<Editor>) => void;
  onClose: () => void;
  onSave: (status?: ScheduleStatus) => void;
  onRemove: () => void;
  onConfirmRemove: (value: boolean) => void;
}) {
  const meta = CHANNELS[editor.channel];
  const schedule = editor.item.schedule;
  const policy = CHANNEL_POLICIES[editor.channel];
  const fits = useMemo(
    () =>
      rankChannels({
        hasVideo: editor.item.creative.engines.includes("motion"),
        formats: editor.item.formats,
        goal: editor.item.goal,
        vertical: editor.item.vertical,
      }),
    [editor.item]
  );
  const fit = fits.find((entry) => entry.channel === editor.channel) ?? fits[0];
  const best = fits[0];

  return (
    <Modal
      title={editor.item.headline}
      subtitle={`${editor.item.businessName ?? "Your brand"} · ${
        schedule ? "Edit slot" : "New slot"
      }`}
      onClose={onClose}
      returnFocusTo={() => {
        const cells = document.querySelectorAll<HTMLElement>(
          `[data-calendar-day="${editor.date}"]`
        );
        // Several views can render the same day; only one is on screen.
        return (
          Array.from(cells).find((cell) => cell.getClientRects().length > 0) ??
          null
        );
      }}
    >
      <div className="space-y-4 p-4">
        {schedule && (
          <div className="flex items-center gap-2 rounded-lg border border-white/6 bg-white/[0.02] px-2.5 py-1.5 text-[11px] text-white/40">
            <span
              className={cn(
                "rounded-full border px-1.5 py-0.5 font-semibold",
                meta.chip
              )}
            >
              {STATUS_LABEL[schedule.status]}
            </span>
            <span>
              Currently {formatDay(schedule.scheduledAt)} ·{" "}
              {formatTime(schedule.scheduledAt)}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          <label className="block">
            <span className="mb-1 block text-[11px] uppercase tracking-widest text-white/45">
              Day
            </span>
            <input
              type="date"
              value={editor.date}
              min={editor.existing ? undefined : todayKey}
              onChange={(event) => onPatch({ date: event.target.value })}
              className="min-h-[44px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs text-white/80 outline-none focus:border-amber-400/40 [color-scheme:dark]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[11px] uppercase tracking-widest text-white/45">
              Time
            </span>
            <input
              type="time"
              value={editor.time}
              step={900}
              onChange={(event) => onPatch({ time: event.target.value })}
              className="min-h-[44px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs text-white/80 outline-none focus:border-amber-400/40 [color-scheme:dark]"
            />
          </label>
        </div>

        <div>
          <p className="mb-1.5 text-[11px] uppercase tracking-widest text-white/45">
            Popular slots
          </p>
          <div className="flex flex-wrap gap-1.5">
            {policy.bestSlots?.map((time) => (
              <button
                key={time}
                type="button"
                onClick={() => onPatch({ time })}
                className={cn(
                  "inline-flex min-h-[44px] items-center justify-center rounded-full border px-3.5 text-[11px] font-medium transition-colors",
                  editor.time === time
                    ? "border-amber-400/40 bg-amber-500/10 text-amber-200"
                    : "border-white/8 text-white/55 hover:border-white/20 hover:text-white/70"
                )}
              >
                {prettyTime(time)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-[11px] uppercase tracking-widest text-white/45">
            Channel
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {CHANNEL_ORDER.map((channel) => {
              const channelMeta = CHANNELS[channel];
              const Icon = channelMeta.icon;
              const active = editor.channel === channel;
              const channelFit =
                fits.find((entry) => entry.channel === channel) ?? fits[0];
              return (
                <button
                  key={channel}
                  type="button"
                  aria-pressed={active}
                  title={`${CHANNEL_POLICIES[channel].purpose} — ${FIT_LABEL[channelFit.level]}`}
                  onClick={() => onPatch({ channel })}
                  className={cn(
                    "flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-2.5 text-[11px] font-medium transition-colors",
                    active
                      ? channelMeta.chip
                      : "border-white/8 text-white/55 hover:border-white/20 hover:text-white/70"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {channelMeta.label}
                  <span
                    aria-hidden
                    className={cn(
                      "ml-auto h-1.5 w-1.5 rounded-full",
                      FIT_DOT[channelFit.level]
                    )}
                  />
                </button>
              );
            })}
          </div>

          <div
            className={cn(
              "mt-2 rounded-xl border px-3 py-2.5",
              FIT_TONE[fit.level]
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-white/45">
                {FIT_LABEL[fit.level]}
              </p>
              {best.channel === editor.channel && (
                <span className="rounded-full border border-teal-400/25 bg-teal-500/10 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-teal-200">
                  Best fit
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] font-semibold leading-snug text-white/80">
              {policy.purpose}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/45">
              {fit.headline}. {fit.reasons[0]}
            </p>
            {fit.fix && (
              <p className="mt-1 text-xs leading-relaxed text-amber-200/75">
                {fit.fix}
              </p>
            )}
          </div>
        </div>

        <label className="block">
          <span className="mb-1 block text-[11px] uppercase tracking-widest text-white/45">
            Note{" "}
            <span className="normal-case tracking-normal text-white/35">
              (optional)
            </span>
          </span>
          <input
            value={editor.note}
            onChange={(event) =>
              onPatch({ note: event.target.value.slice(0, 140) })
            }
            maxLength={140}
            placeholder="Price drop ends Friday — post before lunch."
            className="min-h-[44px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs text-white/80 outline-none placeholder:text-white/18 focus:border-amber-400/40"
          />
        </label>

        <div className="space-y-2 border-t border-white/6 pt-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-medium text-white/50 transition-colors hover:border-white/20 hover:text-white/80 disabled:opacity-40 touch-target"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSave()}
              disabled={saving}
              className="btn-primary inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 touch-target"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CalendarPlus className="h-3.5 w-3.5" />
              )}
              {editor.existing ? "Save slot" : "Put on the runway"}
            </button>
          </div>

          {editor.existing && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
              <button
                type="button"
                onClick={() =>
                  onSave(editor.status === "posted" ? "scheduled" : "posted")
                }
                disabled={saving}
                className="touch-target inline-flex min-h-[44px] items-center gap-1 rounded-lg px-2 text-[11px] font-medium text-teal-300/75 transition-colors hover:text-teal-200 disabled:opacity-40"
              >
                <CheckCircle2 className="h-3 w-3" />
                {editor.status === "posted"
                  ? "Move back to planned"
                  : "Mark as posted"}
              </button>

              {confirmRemove ? (
                <span className="inline-flex flex-wrap items-center gap-2 text-[11px] text-white/50">
                  Remove from runway?
                  <button
                    type="button"
                    onClick={onRemove}
                    disabled={saving}
                    className="touch-target min-h-[44px] rounded-lg px-2 font-semibold text-rose-300 hover:text-rose-200 disabled:opacity-40"
                  >
                    Yes, remove
                  </button>
                  <button
                    type="button"
                    onClick={() => onConfirmRemove(false)}
                    className="touch-target min-h-[44px] rounded-lg px-2 text-white/50 hover:text-white/80"
                  >
                    Keep
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onConfirmRemove(true)}
                  className="touch-target inline-flex min-h-[44px] items-center rounded-lg px-2 text-[11px] text-white/40 transition-colors hover:text-rose-300"
                >
                  Unschedule
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
