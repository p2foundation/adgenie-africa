"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  Copy,
  FileText,
  ImageIcon,
  LayoutGrid,
  Library,
  Plus,
  Search,
  Sparkles,
  Video,
  X,
} from "lucide-react";
import { CampaignPreview } from "@/components/campaign/campaign-preview";
import { PrivateImage } from "@/components/media/private-image";
import { Pager } from "@/components/pagination/pager";
import { formatDay, formatTime } from "@/lib/calendar";
import { formatDate } from "@/lib/format";
import type {
  CreativeEngine,
  LibraryFile,
  LibraryOverview,
  LibraryPlan,
  LibrarySummary,
} from "@/lib/api";
import { CHANNEL_LABEL } from "@/lib/studio";
import { cn } from "@/lib/utils";

type Tab = "all" | "plans" | "images" | "video" | "copy";

const TABS: { id: Tab; label: string; icon: typeof LayoutGrid }[] = [
  { id: "all", label: "Everything", icon: LayoutGrid },
  { id: "plans", label: "On the bench", icon: Clock3 },
  { id: "images", label: "Images", icon: ImageIcon },
  { id: "video", label: "Video", icon: Video },
  { id: "copy", label: "Captions", icon: FileText },
];

const STATUS: Record<string, { label: string; className: string }> = {
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
  failed: {
    label: "Needs attention",
    className: "border-rose-400/25 bg-rose-500/10 text-rose-200",
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
  tw: "Twi",
  gaa: "Ga",
};

const KIND_LABEL: Record<LibraryFile["kind"], string> = {
  image: "Image",
  video: "Video",
  copy: "Caption",
  overlay: "Overlay",
};

const ENGINE_BADGE: Record<
  CreativeEngine,
  { label: string; className: string }
> = {
  image: {
    label: "Still",
    className: "border-white/8 bg-white/[0.03] text-white/45",
  },
  motion: {
    label: "Motion",
    className: "border-amber-400/20 bg-amber-500/[0.07] text-amber-300/80",
  },
  spin: {
    label: "360",
    className: "border-teal-400/20 bg-teal-500/[0.07] text-teal-300/80",
  },
};

function libraryHref(input: {
  q?: string;
  tab?: Tab;
  plansPage?: number;
  filesPage?: number;
}) {
  const search = new URLSearchParams();
  const q = input.q?.trim();
  if (q) search.set("q", q);
  if (input.tab && input.tab !== "all") search.set("tab", input.tab);
  if (input.plansPage !== undefined && input.plansPage > 1)
    search.set("plansPage", String(input.plansPage));
  if (input.filesPage !== undefined && input.filesPage > 1)
    search.set("filesPage", String(input.filesPage));
  const qs = search.toString();
  return qs ? `/library?${qs}` : "/library";
}

export function LibraryView({
  data,
  query: initialQuery,
  tab,
}: {
  data: LibraryOverview;
  query: string;
  tab: Tab;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [appliedQuery, setAppliedQuery] = useState(initialQuery);
  const [copied, setCopied] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (appliedQuery !== initialQuery) {
    setAppliedQuery(initialQuery);
    if (query !== initialQuery) setQuery(initialQuery);
  }

  useEffect(() => {
    if (query === initialQuery) return;
    const timer = window.setTimeout(() => {
      startTransition(() => {
        router.replace(libraryHref({ q: query, tab }), { scroll: false });
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query, initialQuery, tab, router]);

  const needle = initialQuery.trim().toLowerCase();
  const plans = data.plans.items;
  const files = data.files.items;

  const benchVisible =
    (tab === "all" || tab === "plans") &&
    (data.summary.plans > 0 || tab === "plans");
  const shelfVisible = tab !== "plans";
  const somethingToClear = needle.length > 0 || tab !== "all";
  const tabParams = { q: initialQuery, tab: tab === "all" ? "" : tab };

  async function copyCaption(file: LibraryFile) {
    if (!file.outputText) return;
    try {
      await navigator.clipboard.writeText(file.outputText);
      setCopied(file.id);
      window.setTimeout(() => setCopied((id) => (id === file.id ? null : id)), 1800);
    } catch {
      setCopied(null);
    }
  }

  return (
    <div className="shell-wide space-y-8" aria-busy={isPending}>
      <div className="animate-in">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
            Library
          </p>
          {data.summary.plans > 0 && (
            <Link
              href={libraryHref({ q: query, tab: "plans" })}
              scroll={false}
              className="group inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-500/[0.07] px-3 py-1.5 text-[11px] font-semibold text-amber-200/85 transition-colors hover:border-amber-400/40 hover:text-amber-100 touch-target"
            >
              <Clock3 className="h-3.5 w-3.5" />
              {data.summary.plans} plan{data.summary.plans === 1 ? "" : "s"} on the bench
              <ArrowRight className="h-3 w-3 opacity-60 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
        <h1 className="font-display text-3xl font-bold leading-[1.05] tracking-tight text-white md:text-[2.6rem]">
          Everything you make,
          <br />
          <span className="gradient-text-hero glow-text-gold">filed.</span>
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/50 md:text-base">
          Saved plans wait on the bench. Finished images, video and captions
          land on the shelf — searchable, and ready to post again.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ShelfStat label="Files" value={data.summary.files} icon={Library} tone="amber" />
        <ShelfStat label="Images" value={data.summary.images} icon={ImageIcon} tone="teal" />
        <ShelfStat label="Video" value={data.summary.videos} icon={Video} tone="rose" />
        <ShelfStat label="Captions" value={data.summary.captions} icon={FileText} tone="violet" />
      </div>

      <div className="sticky top-[calc(72px_+_env(safe-area-inset-top))] z-20 rounded-2xl border border-white/8 bg-[#080b16] p-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          <label className="relative block min-w-0 flex-1">
            <span className="sr-only">Search your library</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search a headline, caption or campaign"
              className="w-full rounded-xl border border-white/8 bg-white/[0.03] py-2.5 pl-10 pr-3 text-sm text-white/85 outline-none transition-colors placeholder:text-white/45 focus:border-amber-500/30 focus:ring-1 focus:ring-amber-500/15 touch-target"
            />
          </label>

          <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5 sm:pb-0">
            {TABS.map((item) => {
              const active = tab === item.id;
              const count = countFor(item.id, data.summary);
              return (
                <Link
                  key={item.id}
                  href={libraryHref({ q: query, tab: item.id })}
                  scroll={false}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] font-medium transition-colors touch-target",
                    active
                      ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
                      : "border-white/8 bg-white/[0.02] text-white/40 hover:border-white/15 hover:text-white/70"
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                  {count > 0 && (
                    <span className={cn("tabular-nums", active ? "text-amber-300/70" : "text-white/45")}>
                      {count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {benchVisible && (
        <section id="bench" aria-labelledby="bench-title" className="scroll-mt-56 space-y-4 xl:scroll-mt-40">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="bench-title" className="font-display text-lg font-semibold text-white">
                On the bench
              </h2>
              <p className="mt-0.5 text-xs text-white/50">
                Directions saved and priced. They move to the shelf when the agent runs.
              </p>
            </div>
            <span className="shrink-0 text-[11px] tabular-nums text-white/50">
              {data.plans.total} of {data.summary.plans}
            </span>
          </div>

          {plans.length > 0 ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                {plans.map((plan) => (
                  <PlanCard key={plan.id} plan={plan} />
                ))}
              </div>
              <Pager
                page={data.plans.page}
                pages={data.plans.pages}
                total={data.plans.total}
                label="plans"
                basePath="/library"
                pageParam="plansPage"
                params={{
                  ...tabParams,
                  filesPage: data.files.page > 1 ? data.files.page : undefined,
                }}
                hash="bench"
                className="rounded-2xl border border-white/8"
              />
            </>
          ) : (
            <NoMatch query={initialQuery} filtered={somethingToClear} scope="bench" />
          )}
        </section>
      )}

      {shelfVisible && (
        <section id="shelf" aria-labelledby="shelf-title" className="scroll-mt-56 space-y-4 xl:scroll-mt-40">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 id="shelf-title" className="font-display text-lg font-semibold text-white">
                The shelf
              </h2>
              <p className="mt-0.5 text-xs text-white/50">
                Finished files, kept at full size for the next post.
              </p>
            </div>
            {data.summary.files > 0 && (
              <span className="shrink-0 text-[11px] tabular-nums text-white/50">
                {data.files.total} of {data.summary.files}
              </span>
            )}
          </div>

          {files.length > 0 ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {files.map((file) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    copied={copied === file.id}
                    onCopy={() => copyCaption(file)}
                  />
                ))}
              </div>
              <Pager
                page={data.files.page}
                pages={data.files.pages}
                total={data.files.total}
                label="files"
                basePath="/library"
                pageParam="filesPage"
                params={{
                  ...tabParams,
                  plansPage: data.plans.page > 1 ? data.plans.page : undefined,
                }}
                hash="shelf"
                className="rounded-2xl border border-white/8"
              />
            </>
          ) : !somethingToClear && data.summary.files === 0 ? (
            <EmptyShelf hasPlans={data.summary.plans > 0} />
          ) : (
            <NoMatch query={initialQuery} filtered={somethingToClear} scope="shelf" />
          )}
        </section>
      )}

      {somethingToClear && needle.length > 0 && (
        <p className="text-center text-[11px] text-white/45">
          Searching for “{initialQuery.trim()}”.{" "}
          <Link
            href={libraryHref({ tab })}
            scroll={false}
            onClick={() => setQuery("")}
            className="touch-target inline-flex items-center justify-center rounded-lg px-2 text-amber-300/85 underline-offset-2 hover:underline"
          >
            Clear
          </Link>
        </p>
      )}
    </div>
  );
}

function countFor(tab: Tab, summary: LibrarySummary): number {
  if (tab === "plans") return summary.plans;
  if (tab === "images") return summary.images;
  if (tab === "video") return summary.videos;
  if (tab === "copy") return summary.captions;
  return summary.files + summary.plans;
}

function ShelfStat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Library;
  tone: "amber" | "teal" | "rose" | "violet";
}) {
  const colors = {
    amber: { chip: "bg-amber-500/10 text-amber-300", num: "text-white" },
    teal: { chip: "bg-teal-500/10 text-teal-300", num: "text-white" },
    rose: { chip: "bg-rose-500/10 text-rose-300", num: "text-white" },
    violet: { chip: "bg-violet-500/10 text-violet-300", num: "text-white" },
  }[tone];

  return (
    <div className="glass-card flex items-center gap-3 rounded-2xl px-4 py-3.5">
      <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", colors.chip)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className={cn("font-display text-2xl font-bold leading-none tabular-nums", colors.num)}>
          {value}
        </p>
        <p className="mt-1 truncate text-[11px] text-white/50">{label}</p>
      </div>
    </div>
  );
}

function PlanCard({ plan }: { plan: LibraryPlan }) {
  const brief = plan.plan?.brief;
  const status = STATUS[plan.status] ?? STATUS.draft;
  const formats = brief?.formats ?? [];
  const total = plan.plan?.quote.total ?? plan.creditBudget;
  const schedule = plan.plan?.schedule;
  const storedEngines = brief?.creative?.engines;
  const engines: CreativeEngine[] =
    storedEngines && storedEngines.length > 0
      ? storedEngines
      : brief?.video
        ? ["image", "motion"]
        : ["image"];

  return (
    <Link
      href={`/campaigns/${plan.id}`}
      className="group relative overflow-hidden rounded-2xl border border-white/8 bg-[#080b16]/70 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-400/25 hover:bg-[#0a0e1c]"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-amber-500/0 blur-3xl transition-colors duration-500 group-hover:bg-amber-500/10"
      />
      <div className="relative flex gap-3.5">
        <div className="w-[104px] shrink-0 self-start sm:w-[112px]">
          <CampaignPreview
            vertical={
              (["seller", "company", "fashion", "spot"].includes(plan.vertical)
                ? plan.vertical
                : "seller") as "seller" | "company" | "fashion" | "spot"
            }
            businessName={brief?.businessName ?? ""}
            headline={brief?.headline ?? plan.goal}
            priceLabel={brief?.priceLabel ?? ""}
            offerLabel={brief?.offerLabel ?? ""}
            language={plan.language}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col py-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider",
                status.className
              )}
            >
              <span className="h-1 w-1 rounded-full bg-current" />
              {status.label}
            </span>
            <span className="text-[11px] uppercase tracking-wider text-white/50">
              {VERTICAL_LABEL[plan.vertical] ?? plan.vertical}
            </span>
          </div>

          <h3 className="mt-2 line-clamp-2 font-display text-[15px] font-semibold leading-snug text-white/90">
            {brief?.headline || plan.goal}
          </h3>
          <p className="mt-1 truncate text-[11px] text-white/50">
            {brief?.businessName || "Your business"} · {LANGUAGE_LABEL[plan.language] ?? plan.language}
          </p>

          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
            {formats.map((format) => (
              <span
                key={format}
                className="rounded-md border border-white/8 bg-white/[0.03] px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white/45"
              >
                {format}
              </span>
            ))}
            {engines.map((engine) => (
              <span
                key={engine}
                className={cn(
                  "rounded-md border px-1.5 py-0.5 text-[11px] font-semibold",
                  ENGINE_BADGE[engine].className
                )}
              >
                {ENGINE_BADGE[engine].label}
              </span>
            ))}
            <span className="ml-auto inline-flex items-center gap-1 font-display text-xs font-bold tabular-nums text-amber-300/85">
              {total}
              <span className="text-[11px] font-medium uppercase tracking-wide text-white/45">
                cr
              </span>
              <ArrowUpRight className="ml-0.5 h-3.5 w-3.5 text-white/45 transition-all group-hover:translate-x-0.5 group-hover:text-amber-300" />
            </span>
          </div>

          {schedule ? (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-teal-300/60">
              <Clock3 className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {formatDay(schedule.scheduledAt)} · {formatTime(schedule.scheduledAt)}
                {schedule.status === "posted"
                  ? " · posted"
                  : ` · ${CHANNEL_LABEL[schedule.channel]}`}
              </span>
            </p>
          ) : (
            <p className="mt-1.5 text-[11px] text-white/45">
              saved {formatDate(plan.createdAt)}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

function FileCard({
  file,
  copied,
  onCopy,
}: {
  file: LibraryFile;
  copied: boolean;
  onCopy: () => void;
}) {
  if (file.kind === "copy") {
    return (
      <article className="group flex min-w-0 flex-col rounded-2xl border border-white/8 bg-[#080b16]/70 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-violet-300/80">
            <FileText className="h-3.5 w-3.5" />
            Caption
          </span>
          <span className="text-[11px] text-white/45">{formatDate(file.createdAt)}</span>
        </div>
        <p className="mt-3 line-clamp-5 whitespace-pre-line text-sm leading-relaxed text-white/60">
          {file.outputText || "Caption filed with this campaign."}
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-white/6 pt-3">
          <span className="truncate text-[11px] text-white/45">
            {file.campaignGoal || "Campaign caption"}
          </span>
          <button
            onClick={onCopy}
            disabled={!file.outputText}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white/55 transition-colors hover:border-amber-400/25 hover:text-amber-200 disabled:opacity-40 touch-target"
          >
            <Copy className="h-3 w-3" />
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </article>
    );
  }

  const Icon = file.kind === "video" ? Video : ImageIcon;
  const preview = file.files?.[0];

  return (
    <article className="group min-w-0 overflow-hidden rounded-2xl border border-white/8 bg-[#080b16]/70">
      <div className="relative flex aspect-[4/5] items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_35%_25%,rgba(251,191,36,0.12),transparent_60%),linear-gradient(160deg,#15102a,#070a14)]">
        {preview ? (
          <PrivateImage
            generationId={file.id}
            index={preview.index}
            width={420}
            alt={file.campaignGoal || `${KIND_LABEL[file.kind]} file`}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-amber-300/70">
            <Icon className="h-7 w-7" />
          </span>
        )}
        <span className="absolute left-3 top-3 rounded-md border border-white/10 bg-black/30 px-2 py-0.5 text-[11px] font-bold uppercase tracking-widest text-white/45 backdrop-blur-sm">
          {KIND_LABEL[file.kind]}
        </span>
        {file.hasFiles && (
          <span className="absolute bottom-3 right-3 rounded-full border border-teal-400/20 bg-teal-500/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-teal-200/80">
            Filed
          </span>
        )}
      </div>
      <div className="p-3.5">
        <p className="truncate text-sm font-medium text-white/70">
          {file.campaignGoal || `${KIND_LABEL[file.kind]} file`}
        </p>
        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-white/45">
          <span>{formatDate(file.createdAt)}</span>
          <span className="tabular-nums">{file.creditsSpent} cr</span>
        </div>
      </div>
    </article>
  );
}

function EmptyShelf({ hasPlans }: { hasPlans: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-[#080b16]/60 p-6 md:p-9">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-28 h-64 w-64 rounded-full bg-amber-500/[0.07] blur-3xl"
      />
      <div className="relative flex flex-col items-center gap-7 md:flex-row md:items-end md:gap-10">
        <div className="flex shrink-0 items-end gap-2.5 border-b border-white/10 pb-4" aria-hidden="true">
          <span className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/[0.02] text-white/20">
            <ImageIcon className="h-5 w-5" />
          </span>
          <span className="flex h-20 w-16 items-center justify-center rounded-lg border border-dashed border-amber-400/25 bg-amber-500/[0.04] text-amber-300/40">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="flex h-[88px] w-14 items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/[0.02] text-white/20">
            <Video className="h-5 w-5" />
          </span>
        </div>

        <div className="max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-400/80">
            Awaiting first run
          </p>
          <h3 className="mt-2 font-display text-xl font-semibold text-white md:text-2xl">
            The shelf is clear.
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-white/40">
            Files land here the moment the agent finishes a run. Your plans are
            safe and priced on the bench — nothing is charged while they wait.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {hasPlans ? (
              <Link
                href={libraryHref({ tab: "plans" })}
                scroll={false}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/60 transition-colors hover:border-amber-400/25 hover:text-amber-200 touch-target"
              >
                <Clock3 className="h-4 w-4" />
                See plans on the bench
              </Link>
            ) : (
              <Link
                href="/create"
                className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold touch-target"
              >
                <Plus className="h-4 w-4" />
                Create a plan
              </Link>
            )}
            {hasPlans && (
              <Link
                href="/create"
                className="touch-target inline-flex items-center gap-1.5 rounded-lg px-2 py-2.5 text-xs text-white/50 transition-colors hover:text-white/65"
              >
                New plan
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * One component covers two different silences: "you searched and missed" and
 * "you have never run anything". They need different next actions, so the copy
 * and buttons branch on which one the customer is actually in.
 */
function NoMatch({
  query,
  filtered,
  scope,
}: {
  query: string;
  filtered: boolean;
  scope: "bench" | "shelf";
}) {
  const searching = query.trim().length > 0;
  const noun = scope === "bench" ? "direction" : "file";

  return (
    <div className="glass-card flex flex-col items-center rounded-2xl px-6 py-10 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/8 bg-white/[0.03] text-white/50">
        {searching || filtered ? (
          <Search className="h-5 w-5" />
        ) : (
          <Sparkles className="h-5 w-5" />
        )}
      </span>
      <p className="mt-4 text-sm font-medium text-white/65">
        {searching
          ? `No ${noun} mentions “${query.trim()}”.`
          : scope === "bench"
            ? "The bench is clear."
            : "Nothing on this shelf yet."}
      </p>
      <p className="mt-1 max-w-xs text-xs leading-relaxed text-white/50">
        {searching
          ? "Try a shorter word, or widen the view to see everything again."
          : scope === "bench"
            ? "Directions you brief wait here, priced and ready. Nothing is charged until the agent runs."
            : filtered
              ? "This view has nothing in it. Widen it, or run a plan to fill it."
              : "Run a plan and its finished files appear here at full size."}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
        {searching ? (
          <Link
            href="/library"
            scroll={false}
            className="btn-primary touch-target inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold"
          >
            <X className="h-3.5 w-3.5" />
            Clear search
          </Link>
        ) : (
          <>
            {filtered && (
              <Link
                href="/library"
                scroll={false}
                className="touch-target inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3.5 py-2 text-xs text-white/50 transition-colors hover:border-amber-400/25 hover:text-amber-200"
              >
                <X className="h-3.5 w-3.5" />
                Clear filters
              </Link>
            )}
            <Link
              href="/create"
              className="btn-primary touch-target inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              {scope === "bench" ? "Brief a campaign" : "Run your first plan"}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
