import { type Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  BellOff,
  BellRing,
  Inbox,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { InboxItem } from "@/components/notifications/inbox-item";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read";
import { Pager } from "@/components/pagination/pager";
import { formatDate, formatRelative } from "@/lib/format";
import { readNotifications, readNotificationSummary, readSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications" };

const FILTERS = [
  { key: "all", label: "Everything" },
  { key: "unread", label: "Unread" },
] as const;

/** The inbox is not a record page: an API outage should not take the shell down. */
const quiet = <T,>(promise: Promise<T>): Promise<T | null> =>
  promise.catch(() => null);

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>;
}) {
  const [session, params] = await Promise.all([readSession(), searchParams]);
  if (!session) redirect("/sign-in");

  const filter = params.filter === "unread" ? "unread" : "all";
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const [inboxData, summaryData] = await Promise.all([
    quiet(readNotifications({ page, filter })),
    quiet(readNotificationSummary()),
  ]);
  // The session is already proven above; a missing page is the inbox API, not
  // the account. Say so instead of bouncing a signed-in user to sign-in.
  const unavailable = !inboxData;
  const data = inboxData ?? {
    total: 0,
    page: 1,
    limit: 20,
    pages: 1,
    items: [],
  };

  const summary = summaryData ?? { unread: 0, total: 0, lastAt: null };
  const unread = summary.unread;

  // Clearing the last item on the last page would otherwise leave an empty page.
  if (page > 1 && page > data.pages) {
    const search = new URLSearchParams();
    if (filter === "unread") search.set("filter", "unread");
    search.set("page", String(data.pages));
    redirect(`/notifications?${search.toString()}`);
  }

  return (
    <div className="shell-wide space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-5 animate-in">
        <div>
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-400">
            <span className="relative flex h-1.5 w-1.5">
              {unread > 0 && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
              )}
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
            </span>
            Notifications
          </p>
          <h1 className="font-display text-3xl font-bold leading-[1.05] tracking-tight text-white md:text-[2.6rem]">
            The studio&apos;s
            <br />
            <span className="gradient-text-hero glow-text-gold">side of the story.</span>
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/50 md:text-base">
            Verification decisions, campaign progress and the things that need
            you — kept in one quiet place, not buried in a group chat.
          </p>
        </div>

        <div className="flex gap-2.5">
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-right">
            <p className="font-display text-2xl font-bold leading-none tabular-nums text-amber-300">
              {unread}
            </p>
            <p className="mt-1.5 text-[10px] uppercase tracking-widest text-white/30">
              Unread
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.02] px-4 py-3 text-right">
            <p className="font-display text-2xl font-bold leading-none tabular-nums text-white/80">
              {summary.total}
            </p>
            <p className="mt-1.5 text-[10px] uppercase tracking-widest text-white/30">
              In inbox
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 space-y-4">
          {unavailable && (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/[0.06] px-4 py-3 text-xs leading-relaxed text-rose-200/80">
              The inbox cannot be reached right now. That is the service, not
              your account — anything already delivered is still stored.
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((entry) => {
                const active = filter === entry.key;
                const count = entry.key === "unread" ? unread : summary.total;
                return (
                  <Link
                    key={entry.key}
                    href={
                      entry.key === "unread"
                        ? "/notifications?filter=unread"
                        : "/notifications"
                    }
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors touch-target",
                      active
                        ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
                        : "border-white/8 text-white/45 hover:border-white/20 hover:text-white/70"
                    )}
                  >
                    {entry.label}
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[9px] tabular-nums",
                        active ? "bg-amber-400/15 text-amber-300" : "bg-white/5 text-white/30"
                      )}
                    >
                      {count}
                    </span>
                  </Link>
                );
              })}
            </div>
            <MarkAllReadButton count={unread} />
          </div>

          <div className="glass-card overflow-hidden rounded-2xl">
            {data.items.length > 0 ? (
              <ul className="divide-y divide-white/6">
                {data.items.map((item) => (
                  <li key={item.id}>
                    <InboxItem item={item} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-6 py-20 text-center">
                <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/8 bg-white/[0.02] text-white/20">
                  {filter === "unread" ? (
                    <BellOff className="h-6 w-6" />
                  ) : (
                    <Inbox className="h-6 w-6" />
                  )}
                </span>
                <p className="mt-5 font-display text-lg font-semibold text-white/65">
                  {filter === "unread" ? "Nothing unread." : "The inbox is quiet."}
                </p>
                <p className="mx-auto mt-1.5 max-w-sm text-xs leading-relaxed text-white/30">
                  {filter === "unread"
                    ? summary.total > 0
                      ? "You have seen everything we sent. We will only come back when there is something worth saying."
                      : "Nothing has reached you yet. The first message arrives when a campaign finishes running."
                    : "Verification decisions and campaign updates will land here. No broadcast blasts — only things tied to your account."}
                </p>
                {filter === "unread" && summary.total > 0 ? (
                  <Link
                    href="/notifications"
                    className="touch-target mt-5 inline-flex items-center justify-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-amber-300 transition-colors hover:text-amber-200"
                  >
                    See everything
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                ) : (
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
                    <Link
                      href="/create"
                      className="btn-primary touch-target inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Brief a campaign
                    </Link>
                    <Link
                      href="/verify"
                      className="touch-target inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3.5 py-2 text-xs text-white/50 transition-colors hover:border-amber-400/25 hover:text-amber-200"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Check verification
                    </Link>
                  </div>
                )}
              </div>
            )}

            <Pager
              page={data.page}
              pages={data.pages}
              total={data.total}
              label={filter === "unread" ? "unread notifications" : "notifications"}
              basePath="/notifications"
              params={{ filter: filter === "unread" ? "unread" : "" }}
              className="border-t border-white/6"
            />
          </div>

          <p className="px-1 text-[10px] leading-relaxed text-white/20">
            The inbox clears itself: 30 days after you read a notification, or 90
            days after it arrives if you never do. Dismiss anything sooner.
          </p>

          {summary.lastAt && (
            <p className="text-[10px] text-white/20">
              Last update {formatRelative(summary.lastAt)} ·{" "}
              {formatDate(summary.lastAt)}
            </p>
          )}
        </div>

        <aside className="space-y-4">
          <section
            className="relative overflow-hidden rounded-2xl border border-amber-400/15 bg-gradient-to-b from-amber-500/[0.08] to-transparent p-5"
            aria-labelledby="push-setup-title"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-amber-500/10 blur-2xl"
            />
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
              <BellRing className="h-[18px] w-[18px]" />
            </span>
            <h2
              id="push-setup-title"
              className="mt-4 font-display text-base font-semibold leading-snug text-white"
            >
              Take it off the tab.
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-white/40">
              Turn on push and a decision reaches your phone or desktop even when
              AdGenie is closed. On iPhone, add AdGenie to your Home Screen first.
            </p>
            <Link
              href="/settings#notifications"
              className="touch-target mt-4 inline-flex items-center justify-center gap-1 rounded-xl border border-amber-400/25 bg-amber-500/[0.08] px-4 py-2 text-[11px] font-semibold text-amber-200 transition-colors hover:border-amber-400/45"
            >
              Set up push on this device
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          </section>

          <section
            className="glass-card rounded-2xl p-5"
            aria-labelledby="inbox-contents-title"
          >
            <h2
              id="inbox-contents-title"
              className="font-display text-sm font-semibold text-white"
            >
              What lands here
            </h2>
            <ul className="mt-4 space-y-3">
              {[
                {
                  icon: ShieldCheck,
                  title: "Verification decisions",
                  copy: "The outcome, and the next step if something needs fixing.",
                  tone: "text-teal-300",
                },
                {
                  icon: Sparkles,
                  title: "Campaign milestones",
                  copy: "When a plan is ready, running or delivered.",
                  tone: "text-violet-300",
                },
                {
                  icon: Wallet,
                  title: "Money moments",
                  copy: "Top-ups that land and credits that run low.",
                  tone: "text-amber-300",
                },
              ].map((row) => (
                <li key={row.title} className="flex gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                    <row.icon className={cn("h-3.5 w-3.5", row.tone)} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] font-medium text-white/65">
                      {row.title}
                    </span>
                    <span className="mt-0.5 block text-[10px] leading-relaxed text-white/25">
                      {row.copy}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
