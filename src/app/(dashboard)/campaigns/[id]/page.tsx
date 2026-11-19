import { type Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Box,
  CalendarDays,
  Check,
  Clock,
  FileText,
  Film,
  Lock,
  Sparkles,
  Zap,
} from "lucide-react";
import { CampaignPreview } from "@/components/campaign/campaign-preview";
import { CampaignRun } from "@/components/campaign/campaign-run";
import { AssistantPageContext } from "@/components/assistant/page-context";
import type { AssistantContext } from "@/lib/assistant";
import { ApiError, type Campaign } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { formatDay, formatTime } from "@/lib/calendar";
import { readCampaign } from "@/lib/session";
import {
  AUDIENCES,
  CHANNEL_LABEL,
  PRODUCT_LABEL,
  SPIN_MODE_LABEL,
  engineFor,
  hooksFor,
} from "@/lib/studio";
import { cn } from "@/lib/utils";
import {
  CHANNEL_POLICIES,
  FIT_LABEL,
  rankChannels,
  type FitLevel,
} from "@adgenie/core";

export const metadata: Metadata = { title: "Campaign plan" };

const STATUS: Record<
  string,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft plan",
    className: "border-amber-400/25 bg-amber-500/10 text-amber-200",
  },
  planned: {
    label: "Planned",
    className: "border-violet-400/25 bg-violet-500/10 text-violet-200",
  },
  running: {
    label: "Running",
    className: "border-teal-400/25 bg-teal-500/10 text-teal-200",
  },
  done: {
    label: "Delivered",
    className: "border-teal-400/25 bg-teal-500/10 text-teal-200",
  },
  failed: {
    label: "Needs attention",
    className: "border-rose-400/25 bg-rose-500/10 text-rose-200",
  },
  cancelled: {
    label: "Cancelled",
    className: "border-white/10 bg-white/5 text-white/50",
  },
};

const VERTICAL_LABEL: Record<string, string> = {
  seller: "Market seller",
  company: "Company",
  fashion: "Fashion & beauty",
  spot: "Spot & event",
};

const LANGUAGE_LABEL: Record<string, string> = {
  en: "English",
  fr: "Français",
  tw: "Twi (beta)",
  gaa: "Ga (beta)",
};

const SCHEDULE_TONE: Record<string, string> = {
  scheduled: "border-amber-400/25 bg-amber-500/10 text-amber-200",
  posted: "border-teal-400/25 bg-teal-500/10 text-teal-200",
  skipped: "border-white/10 bg-white/5 text-white/45",
};

const FIT_DOT: Record<FitLevel, string> = {
  native: "bg-teal-400",
  workable: "bg-amber-400",
  off_purpose: "bg-rose-400",
};

export default async function CampaignPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // A 404 from the API is a genuinely missing campaign; a 401 (null) is a dead
  // session. notFound() on the 401 would race the layout's redirect in the
  // flight stream, which Next 16 mishandles — redirect instead.
  let campaign: Campaign | null;
  try {
    campaign = await readCampaign(id);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }
  if (!campaign) redirect("/sign-in");

  const brief = campaign.plan?.brief;
  const quote = campaign.plan?.quote;
  const status = STATUS[campaign.status] ?? STATUS.draft;
  const formats = brief?.formats ?? ["1:1", "4:5", "9:16"];
  const previewVertical = (
    ["seller", "company", "fashion", "spot"].includes(campaign.vertical)
      ? campaign.vertical
      : "seller"
  ) as "seller" | "company" | "fashion" | "spot";

  const schedule = campaign.plan?.schedule;
  const calendarMonth =
    schedule?.scheduledAt.slice(0, 7) ?? new Date().toISOString().slice(0, 7);
  const creative = brief?.creative;
  // Plans saved before the studio engines existed still describe themselves:
  // images are always made, and the legacy video flag means a motion cut.
  const engines = creative?.engines?.length
    ? creative.engines
    : brief?.video
      ? (["image", "motion"] as const)
      : (["image"] as const);
  const channelFits = rankChannels({
    hasVideo: engines.some((engine) => engine === "motion"),
    formats,
    goal: campaign.goal,
    vertical: campaign.vertical,
  });
  const hookLabel = creative
    ? hooksFor(previewVertical).find((hook) => hook.value === creative.motionHook)?.label
    : null;

  // Genie reads this campaign as the page shows it: the locked brief, where the
  // plan stands, and the slot it already has on the calendar.
  const genie: AssistantContext = {
    screen: "campaign",
    language: campaign.language,
    vertical: previewVertical,
    businessName: brief?.businessName ?? null,
    headline: brief?.headline || campaign.goal,
    details: brief?.details ?? null,
    goal: campaign.goal,
    priceLabel: brief?.priceLabel ?? null,
    offerLabel: brief?.offerLabel ?? null,
    formats,
    campaignStatus: campaign.status,
    agenda: schedule
      ? {
          items: [
            {
              day: `${formatDay(schedule.scheduledAt)}, ${formatTime(schedule.scheduledAt)}`,
              title: brief?.headline || campaign.goal,
              channel: schedule.channel,
              status: schedule.status,
            },
          ],
        }
      : null,
  };
  const audienceLabel =
    creative && previewVertical !== "company"
      ? AUDIENCES.find((audience) => audience.value === creative.spinAudience)?.label
      : null;
  const productLabel = creative
    ? PRODUCT_LABEL[creative.spinProduct]
    : null;
  const spinLabel =
    creative && previewVertical === "fashion" && creative.spinProduct === "outfit"
      ? [audienceLabel, SPIN_MODE_LABEL[creative.spinMode]].filter(Boolean).join(" ")
      : [audienceLabel, productLabel].filter(Boolean).join(" ");

  return (
    <div className="shell-wide space-y-8">
      <AssistantPageContext value={genie} />
      <div className="animate-in">
        <Link
          href="/dashboard"
          className="touch-target -ml-2 mb-5 inline-flex items-center justify-center gap-2 px-2 text-xs text-white/40 transition-colors hover:text-white/70"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to studio
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-400">
              {VERTICAL_LABEL[campaign.vertical] ?? "Campaign"} ·{" "}
              {LANGUAGE_LABEL[campaign.language] ?? campaign.language}
            </p>
            <h1 className="max-w-2xl font-display text-3xl font-bold leading-[1.08] tracking-tight text-white md:text-[2.4rem]">
              {brief?.headline || campaign.goal}
            </h1>
            <p className="mt-2 text-sm text-white/45">
              {brief?.businessName || "Your business"} · saved{" "}
              {formatDateTime(campaign.createdAt)}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider",
              status.className
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {status.label}
          </span>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-5">
          <CampaignRun campaign={campaign} />

          <section className="glass-card rounded-2xl p-5 md:p-6">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-300" />
              <h2 className="font-display text-sm font-semibold text-white">
                The brief
              </h2>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-white/55">
              {brief?.details || campaign.goal}
            </p>

            <dl className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-[10px] uppercase tracking-widest text-white/30">
                  Headline
                </dt>
                <dd className="mt-1 text-sm text-white/75">
                  {brief?.headline || campaign.goal}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-widest text-white/30">
                  Price / offer
                </dt>
                <dd className="mt-1 text-sm text-white/75">
                  {brief?.priceLabel || "—"}
                  {brief?.offerLabel ? ` · ${brief.offerLabel}` : ""}
                </dd>
              </div>
              {brief?.sourceUrl && (
                <div className="sm:col-span-2">
                  <dt className="text-[10px] uppercase tracking-widest text-white/30">
                    Source
                  </dt>
                  <dd className="mt-1 truncate text-sm text-teal-300/70">
                    {brief.sourceUrl}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <section className="glass-card rounded-2xl p-5 md:p-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-300" />
              <h2 className="font-display text-sm font-semibold text-white">
                Deliverables
              </h2>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {formats.map((format) => (
                <div
                  key={format}
                  className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-3"
                >
                  <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg border border-white/10">
                    <span
                      className={cn(
                        "rounded-[2px] border-2 border-amber-300/70",
                        format === "1:1"
                          ? "aspect-square w-5"
                          : format === "4:5"
                            ? "aspect-[4/5] w-4"
                            : "aspect-[9/16] w-3"
                      )}
                    />
                  </span>
                  <p className="text-center text-xs font-semibold text-white/70">
                    {format}
                  </p>
                </div>
              ))}
              {brief?.video && (
                <div className="rounded-xl border border-amber-400/20 bg-amber-500/[0.07] px-3 py-3">
                  <span className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg border border-amber-400/20 text-amber-300">
                    <Zap className="h-4 w-4" />
                  </span>
                  <p className="text-center text-xs font-semibold text-amber-200">
                    Video
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 border-t border-white/6 pt-4">
              <p className="text-[10px] uppercase tracking-widest text-white/25">
                Creative engines
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {engines.map((engine) => (
                  <span
                    key={engine}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-white/55"
                  >
                    {engine === "motion" ? (
                      <Film className="h-3 w-3 text-amber-300/70" />
                    ) : engine === "spin" ? (
                      <Box className="h-3 w-3 text-violet-300/70" />
                    ) : (
                      <Sparkles className="h-3 w-3 text-teal-300/70" />
                    )}
                    {engineFor(previewVertical, engine).label}
                    {engine === "motion" && hookLabel && (
                      <span className="text-white/25">· {hookLabel} hook</span>
                    )}
                    {engine === "spin" && spinLabel && (
                      <span className="text-white/25">· {spinLabel}</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="glass-card rounded-2xl p-5 md:p-6">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-teal-300" />
              <h2 className="font-display text-sm font-semibold text-white">
                What happens next
              </h2>
            </div>
            <ol className="mt-4 space-y-3">
              {[
                {
                  title: "Plan saved",
                  copy: "Your brief and price are locked in as a draft.",
                  done: true,
                },
                {
                  title: "Agent plans the work",
                  copy: "The angle, sizes and tools are chosen and written down as steps.",
                  done: false,
                },
                {
                  title: "You approve the charge",
                  copy: "Credits are reserved one piece at a time, and refunded if a step fails.",
                  done: false,
                },
                {
                  title: "Files land in your library",
                  copy: "Ready-to-post sizes, caption and a WhatsApp share link.",
                  done: false,
                },
              ].map((item) => (
                <li key={item.title} className="flex gap-3">
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
                      item.done
                        ? "bg-teal-400/20 text-teal-300"
                        : "bg-white/5 text-white/25"
                    )}
                  >
                    {item.done ? (
                      <Check className="h-3 w-3" strokeWidth={3} />
                    ) : (
                      <Clock className="h-3 w-3" />
                    )}
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-white/75">
                      {item.title}
                    </span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-white/35">
                      {item.copy}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            <div className="mt-5 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
              <p className="text-xs leading-relaxed text-white/40">
                One run writes the caption, shoots each size and lays out the text.
                Credits are reserved per piece, and any piece that fails is refunded.
              </p>
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/create"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/55 transition-colors hover:border-white/20 hover:text-white/85 touch-target"
            >
              Brief another
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/dashboard"
              className="touch-target inline-flex items-center justify-center gap-2 px-2 py-2.5 text-sm text-white/35 transition-colors hover:text-white/70"
            >
              Back to studio
            </Link>
          </div>
        </div>

        <aside className="h-fit space-y-4 rounded-2xl border border-white/8 bg-[#080b16]/80 p-4 backdrop-blur-xl lg:sticky lg:top-24">
          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/40">
                <CalendarDays className="h-3.5 w-3.5 text-amber-300" />
                Calendar
              </p>
              {schedule && (
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                    SCHEDULE_TONE[schedule.status] ?? SCHEDULE_TONE.scheduled
                  )}
                >
                  {schedule.status}
                </span>
              )}
            </div>
            {schedule ? (
              <>
                <p className="mt-2.5 font-display text-lg font-semibold leading-tight text-white/90">
                  {formatDay(schedule.scheduledAt)}
                </p>
                <p className="mt-0.5 text-[11px] text-white/40">
                  {formatTime(schedule.scheduledAt)} ·{" "}
                  {CHANNEL_LABEL[schedule.channel]}
                </p>
                {schedule.note && (
                  <p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-white/30">
                    {schedule.note}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-2 text-[11px] leading-relaxed text-white/35">
                Not on the runway yet. Pick a day, channel and time.
              </p>
            )}
            <Link
              href={`/calendar?month=${calendarMonth}`}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-amber-400/25 bg-amber-500/[0.08] px-2.5 py-1.5 text-[10px] font-semibold text-amber-200 transition-colors hover:border-amber-400/45 touch-target"
            >
              {schedule ? "Manage in calendar" : "Schedule this plan"}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-3.5">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/40">
              <Sparkles className="h-3.5 w-3.5 text-teal-300" />
              Channel fit
            </p>
            <ul className="mt-2.5 space-y-1.5">
              {channelFits.map((fit) => (
                <li key={fit.channel} className="flex items-start gap-2 text-[10px]">
                  <span
                    className={cn(
                      "mt-1 h-1.5 w-1.5 shrink-0 rounded-full",
                      FIT_DOT[fit.level]
                    )}
                  />
                  <span className="min-w-0 flex-1 leading-snug">
                    <span className="font-semibold text-white/65">
                      {CHANNEL_POLICIES[fit.channel].label}
                    </span>
                    <span className="text-white/30"> · {fit.headline}</span>
                  </span>
                  <span className="shrink-0 text-[8px] uppercase tracking-wider text-white/28">
                    {FIT_LABEL[fit.level]}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 border-t border-white/5 pt-2 text-[9px] leading-relaxed text-white/25">
              Ranked by what this kit can actually carry. TikTok is off-purpose
              without motion.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
              Direction
            </p>
            <span className="text-[10px] uppercase tracking-widest text-white/25">
              Draft preview
            </span>
          </div>

          <div className="mx-auto w-full max-w-[230px] lg:max-w-none">
            <CampaignPreview
              vertical={previewVertical}
              businessName={brief?.businessName ?? ""}
              headline={brief?.headline ?? campaign.goal}
              priceLabel={brief?.priceLabel ?? ""}
              offerLabel={brief?.offerLabel ?? ""}
              language={campaign.language}
            />
          </div>

          {quote ? (
            <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
              <div className="flex items-end justify-between gap-3">
                <p className="text-[10px] uppercase tracking-widest text-white/30">
                  Plan total
                </p>
                <p className="font-display text-3xl font-bold leading-none text-amber-300">
                  {quote.total}
                  <span className="ml-1 text-xs font-medium text-white/35">
                    credits
                  </span>
                </p>
              </div>
              <ul className="mt-3 space-y-1.5 border-t border-white/5 pt-3">
                {quote.lines.map((line) => (
                  <li
                    key={line.kind}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="text-white/40">
                      {line.label}
                      {line.kind === "video" && (
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-white/30">
                          not in this run
                        </span>
                      )}
                    </span>
                    <span className="tabular-nums text-white/65">
                      {line.credits}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3 text-[11px] text-white/30">
                <span>Budget cap</span>
                <span className="tabular-nums text-white/50">
                  {quote.budget} credits
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4 text-sm text-white/40">
              Budget: {campaign.creditBudget} credits
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
