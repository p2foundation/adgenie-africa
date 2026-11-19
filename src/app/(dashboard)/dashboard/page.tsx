import { type Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Zap,
  TrendingUp,
  ImageIcon,
  Video,
  CalendarDays,
  Clock3,
} from "lucide-react";
import {
  readBalance,
  readCalendar,
  readCampaigns,
  readLedger,
  readLibrary,
  readSession,
} from "@/lib/session";
import { currencyNoun, resolveCurrency } from "@adgenie/core";
import { buildCreditSeries } from "@/lib/credit-series";
import { formatDate } from "@/lib/format";
import { formatDay, formatTime } from "@/lib/calendar";
import { CHANNEL_LABEL } from "@/lib/studio";
import { CurveChart } from "@/components/charts/curve-chart";
import { FormatPreviewStrip } from "@/components/dashboard/format-preview-strip";
import { AssistantPageContext } from "@/components/assistant/page-context";
import type { AssistantContext } from "@/lib/assistant";
import {
  SellerGlyph,
  CompanyGlyph,
  FashionGlyph,
  EventGlyph,
} from "@/components/pictographs";

export const metadata: Metadata = { title: "Dashboard" };

const CHANNEL_DOT: Record<string, string> = {
  whatsapp: "bg-emerald-400",
  instagram: "bg-rose-400",
  tiktok: "bg-sky-400",
  facebook: "bg-indigo-400",
};

const quickStats = [
  { label: "Credits left", icon: Zap, color: "text-amber-400", bg: "bg-amber-500/10" },
  { label: "Campaigns", icon: TrendingUp, color: "text-violet-400", bg: "bg-violet-500/10" },
  { label: "Images made", icon: ImageIcon, color: "text-teal-400", bg: "bg-teal-500/10" },
  { label: "Videos made", icon: Video, color: "text-rose-400", bg: "bg-rose-500/10" },
];

const lanes = [
  {
    title: "Selling something",
    copy: "Market stall, WhatsApp catalogue, one clear offer.",
    icon: SellerGlyph,
    accent: "text-amber-300",
    vertical: "seller",
  },
  {
    title: "Running a company",
    copy: "A brand ad that clears the group chat and the boardroom.",
    icon: CompanyGlyph,
    accent: "text-sky-300",
    vertical: "company",
  },
  {
    title: "Sewing a drop",
    copy: "Lookbook frames for the feed and the story, same afternoon.",
    icon: FashionGlyph,
    accent: "text-rose-300",
    vertical: "fashion",
  },
  {
    title: "Filling a room",
    copy: "A flyer, a reel and the reminder that brings people out.",
    icon: EventGlyph,
    accent: "text-violet-300",
    vertical: "spot",
  },
];

const STATUS_COPY: Record<string, { label: string; tone: string }> = {
  draft: { label: "Draft plan", tone: "border-amber-400/20 bg-amber-500/10 text-amber-300" },
  planned: { label: "Planned", tone: "border-violet-400/20 bg-violet-500/10 text-violet-300" },
  running: { label: "Running", tone: "border-teal-400/20 bg-teal-500/10 text-teal-300" },
  done: { label: "Delivered", tone: "border-teal-400/20 bg-teal-500/10 text-teal-300" },
  failed: { label: "Failed", tone: "border-rose-400/20 bg-rose-500/10 text-rose-300" },
  cancelled: { label: "Cancelled", tone: "border-white/10 bg-white/5 text-white/40" },
};

const VERTICAL_LABEL: Record<string, string> = {
  seller: "Seller",
  company: "Company",
  fashion: "Fashion",
  spot: "Event",
};

export default async function DashboardPage() {
  const now = new Date();
  const horizon = new Date(now.getTime() + 14 * 86_400_000);

  const [balance, session, ledger, recent, runway, library] = await Promise.all([
    readBalance(),
    readSession(),
    readLedger({ limit: 50 }),
    readCampaigns({ limit: 5 }),
    readCalendar({ from: now.toISOString(), to: horizon.toISOString() }),
    readLibrary(),
  ]);

  const firstName = (session?.displayName ?? "").trim().split(" ")[0];
  const currency = resolveCurrency({
    currency: session?.currency,
    country: session?.country,
  });
  const campaigns = recent?.items ?? [];
  const campaignTotal = recent?.total ?? 0;
  const values = [
    balance === null ? "—" : String(balance),
    String(campaignTotal),
    library ? String(library.summary.images) : "—",
    library ? String(library.summary.videos) : "—",
  ];

  const runwayPosts = (runway?.scheduled ?? []).slice(0, 3);
  const waiting = runway?.unscheduled.length ?? 0;

  const series = buildCreditSeries(balance ?? 0, ledger?.items ?? []);
  const points = series.map((day) => ({ label: day.label, value: day.balance }));
  const gained = series.reduce((sum, day) => sum + day.gained, 0);
  const spent = series.reduce((sum, day) => sum + day.spent, 0);

  // What Genie knows when a question is asked here: the shelf, the next two
  // weeks and the balance — all already on the page.
  const genie: AssistantContext = {
    screen: "dashboard",
    language: session?.language ?? null,
    vertical: session?.vertical ?? null,
    credits: balance ?? null,
    recentCampaigns: campaigns.map((campaign) => ({
      status: campaign.status,
      title: campaign.goal,
    })),
    agenda: {
      unscheduled: waiting,
      items: (runway?.scheduled ?? []).slice(0, 7).map((item) => ({
        day: `${formatDay(item.schedule!.scheduledAt)}, ${formatTime(item.schedule!.scheduledAt)}`,
        title: item.headline,
        channel: item.schedule!.channel,
        status: item.schedule!.status,
      })),
    },
  };

  return (
    <div className="shell-wide space-y-10">
      <AssistantPageContext value={genie} />

      {/* Greeting */}
      <div className="animate-in">
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-3">
          Your studio
        </p>
        <h1 className="font-display text-3xl md:text-[2.6rem] font-bold leading-[1.05] tracking-tight text-white">
          Make something
          <br />
          <span className="gradient-text-hero glow-text-gold">worth posting{firstName ? `, ${firstName}` : ""}.</span>
        </h1>
        <p className="text-white/50 text-sm md:text-base mt-4 max-w-lg leading-relaxed">
          Brief it in thirty seconds, approve the price in {currencyNoun(currency)},
          post it tonight. Everything you make shows up here.
        </p>
      </div>

      <Link
        href="/create"
        className="group relative rounded-2xl p-[1px] block"
        aria-label="Create a new campaign"
      >
        <span className="absolute inset-0 rounded-2xl bg-[linear-gradient(120deg,rgba(251,191,36,0.55),rgba(139,92,246,0.35),rgba(251,191,36,0.55))] opacity-60 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
        <span className="relative flex items-center justify-between gap-4 rounded-2xl bg-[#0a0d1c]/90 px-5 py-5 md:px-7 md:py-6">
          <span className="flex min-w-0 items-center gap-4 md:gap-5">
            <span className="w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25 group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5 text-black" />
            </span>
            <span className="min-w-0">
              <span className="font-display font-semibold text-white text-base md:text-lg block">
                Start a new campaign
              </span>
              <span className="text-sm text-white/50">
                Seller, company, fashion or events — the agent does the heavy lifting.
              </span>
            </span>
          </span>
          <ArrowRight className="w-5 h-5 shrink-0 text-amber-300 group-hover:translate-x-1 transition-transform" />
        </span>
      </Link>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickStats.map((stat, i) => (
          <div key={stat.label} className="glass-card rounded-2xl p-4 md:p-5">
            <div className={`w-9 h-9 ${stat.bg} rounded-xl flex items-center justify-center mb-4`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div className="font-display text-2xl sm:text-3xl font-bold text-white leading-none tabular-nums">{values[i]}</div>
            <div className="text-xs text-white/40 mt-1.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Content runway — the next two weeks, straight from the calendar */}
      <section
        className="glass-card rounded-2xl p-5 md:p-6"
        aria-labelledby="runway-title"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2
              id="runway-title"
              className="flex items-center gap-2 font-display text-lg font-semibold text-white"
            >
              <CalendarDays className="h-4 w-4 text-amber-300" />
              Content runway
            </h2>
            <p className="mt-0.5 text-xs text-white/50">
              Next 14 days · {waiting > 0 ? `${waiting} plan${waiting === 1 ? "" : "s"} waiting` : "all plans slotted"}
            </p>
          </div>
          <Link
            href="/calendar"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] font-semibold text-white/50 transition-colors hover:border-amber-400/30 hover:text-amber-200 touch-target"
          >
            Open calendar
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {runwayPosts.length > 0 ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {runwayPosts.map((item) => {
              const schedule = item.schedule!;
              return (
                <Link
                  key={item.id}
                  href={`/calendar?month=${schedule.scheduledAt.slice(0, 7)}`}
                  className="group rounded-xl border border-white/8 bg-white/[0.02] p-3 transition-colors hover:border-amber-400/25 hover:bg-white/[0.04]"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="font-semibold uppercase tracking-wider text-amber-300/85">
                      {formatDay(schedule.scheduledAt)}
                    </span>
                    <span className="inline-flex items-center gap-1 tabular-nums text-white/50">
                      <Clock3 className="h-2.5 w-2.5" />
                      {formatTime(schedule.scheduledAt)}
                    </span>
                  </div>
                  <p className="mt-1.5 truncate text-sm font-semibold text-white/85">
                    {item.headline}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/50">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${CHANNEL_DOT[schedule.channel] ?? "bg-white/40"}`}
                      aria-hidden="true"
                    />
                    {CHANNEL_LABEL[schedule.channel]}
                    <span className="text-white/15">·</span>
                    {schedule.status === "posted" ? "Posted" : "Scheduled"}
                  </p>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-white/10 px-4 py-4">
            <p className="text-xs leading-relaxed text-white/50">
              {waiting > 0
                ? `${waiting} briefed plan${waiting === 1 ? "" : "s"} waiting for a day. Give each one a slot.`
                : "The runway is clear. Brief a campaign and put it on the calendar."}
            </p>
            <Link
              href={waiting > 0 ? "/calendar" : "/create"}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-400/25 bg-amber-500/[0.08] px-3 py-1.5 text-[11px] font-semibold text-amber-200 transition-colors hover:border-amber-400/45 touch-target"
            >
              {waiting > 0 ? "Place a plan" : "Create a campaign"}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        )}
      </section>

      {/* Credit curve — real ledger data, not a decorative squiggle */}
      <div className="grid gap-4 lg:grid-cols-3">
        <section
          className="glass-card rounded-2xl p-5 md:p-6 lg:col-span-2"
          aria-labelledby="credit-curve-title"
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 id="credit-curve-title" className="font-display text-lg font-semibold text-white">
                Your credit curve
              </h2>
              <p className="mt-0.5 text-xs text-white/50">End-of-day balance, last 14 days</p>
            </div>
            <p className="font-display text-2xl font-bold leading-none text-white">
              {balance ?? "—"}
              <span className="ml-1.5 text-[11px] font-medium uppercase tracking-wider text-white/50">
                now
              </span>
            </p>
          </div>
          <CurveChart
            points={points}
            tone="gold"
            height={180}
            ariaLabel="Your credit balance at the end of each of the last 14 days"
            empty={
              <div>
                <p className="text-sm font-medium text-white/55">Your line starts here.</p>
                <p className="mt-1 text-xs text-white/50">
                  A top-up or a campaign puts the first point on it.
                </p>
                <Link
                  href="/credits"
                  className="touch-target mt-3 inline-flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-amber-300/85 transition-colors hover:text-amber-200"
                >
                  Buy credits
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            }
          />
        </section>

        <section className="glass-card rounded-2xl p-5 md:p-6" aria-labelledby="fortnight-title">
          <h2 id="fortnight-title" className="font-display text-lg font-semibold text-white">
            This fortnight
          </h2>
          <p className="mt-0.5 text-xs text-white/50">Straight from your ledger</p>

          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-white/45">Credits in</dt>
              <dd className="font-medium tabular-nums text-emerald-300">
                {gained > 0 ? `+${gained.toLocaleString("en-GH")}` : "—"}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-white/45">Credits out</dt>
              <dd className="font-medium tabular-nums text-amber-300">
                {spent > 0 ? `−${spent.toLocaleString("en-GH")}` : "—"}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 border-t border-white/8 pt-3">
              <dt className="text-white/45">Balance now</dt>
              <dd className="font-display text-xl font-bold tabular-nums text-white">
                {(balance ?? 0).toLocaleString("en-GH")}
              </dd>
            </div>
          </dl>

          <p className="mt-5 text-xs leading-relaxed text-white/50">
            Every movement is a line in your ledger. No estimated numbers.
          </p>
        </section>
      </div>

      {/* Four ways in — bespoke pictographs, one per vertical */}
      <section aria-labelledby="lanes-title">
        <div className="mb-5">
          <h2 id="lanes-title" className="text-xs font-semibold text-white/50 uppercase tracking-widest">
            Four ways in
          </h2>
          <p className="mt-1 text-sm text-white/50">Pick the shape of the work. The brief stays short.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {lanes.map((lane) => (
            <Link
              key={lane.title}
              href={`/create?vertical=${lane.vertical}`}
              className="group glass-card rounded-2xl p-4"
            >
              <span
                className={`flex h-11 w-11 items-center justify-center rounded-xl border border-white/8 bg-white/[0.03] ${lane.accent} transition-transform duration-300 group-hover:-translate-y-0.5`}
              >
                <lane.icon className="h-6 w-6" />
              </span>
              <p className="mt-4 font-display text-sm font-semibold text-white/85">{lane.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/50">{lane.copy}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent campaigns */}
      <div>
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-xs font-semibold text-white/50 uppercase tracking-widest">
            Recent campaigns
          </h2>
          {campaignTotal > 0 && (
            <Link
              href="/create"
              className="touch-target inline-flex items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-amber-300 transition-colors hover:text-amber-200"
            >
              New campaign
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {campaignTotal === 0 ? (
          <div className="glass-card rounded-2xl px-6 pt-10 pb-8 flex flex-col items-center text-center gap-8">
            <FormatPreviewStrip />
            <div>
              <p className="text-white/80 font-semibold font-display text-lg mb-2">
                Nothing here yet — that&apos;s the point.
              </p>
              <p className="text-sm text-white/40 max-w-sm mx-auto leading-relaxed">
                This shelf fills up with everything you generate. Three sizes, one
                brief, ready to download and post.
              </p>
            </div>
            <Link
              href="/create"
              className="btn-primary inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold touch-target"
            >
              Create your first campaign
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="glass-card overflow-hidden rounded-2xl divide-y divide-white/5">
            {campaigns.map((campaign) => {
              const status = STATUS_COPY[campaign.status] ?? STATUS_COPY.draft;
              return (
                <Link
                  key={campaign.id}
                  href={`/campaigns/${campaign.id}`}
                  className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-white/[0.03] md:px-5"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/[0.03] text-violet-300">
                    <TrendingUp className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-sm font-semibold text-white/85">
                      {campaign.goal}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-white/50">
                      {VERTICAL_LABEL[campaign.vertical] ?? campaign.vertical} ·{" "}
                      {formatDate(campaign.createdAt)} ·{" "}
                      {campaign.creditBudget} credits
                    </span>
                    <span className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold sm:hidden ${status.tone}`}>
                      {status.label}
                    </span>
                  </span>
                  <span
                    className={`hidden shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider sm:inline-flex ${status.tone}`}
                  >
                    {status.label}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-white/25 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-300" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
