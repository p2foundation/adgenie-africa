import { type Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { ApiError } from "@/lib/api";
import { DetailChrome, type DetailSection } from "@/components/admin/detail-chrome";
import { CampaignStatusPill } from "@/components/admin/status-pills";
import { Pager } from "@/components/pagination/pager";
import { formatDateTime, formatRelative } from "@/lib/format";
import { readAdminCampaign, readSession } from "@/lib/session";

export const metadata: Metadata = { title: "Campaign record" };

const SECTIONS: DetailSection[] = [
  { id: "brief", label: "Brief & quote", icon: "brief" },
  { id: "outputs", label: "Outputs", icon: "outputs" },
  { id: "runs", label: "Agent runs", icon: "runs" },
  { id: "flags", label: "Flags", icon: "flags" },
];

const GENERATION_LABELS: Record<string, string> = {
  image: "Image",
  video: "Video",
  copy: "Copy",
  overlay: "Overlay",
};

const STATUS_STYLES: Record<string, string> = {
  queued: "border-white/10 bg-white/5 text-white/45",
  running: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  done: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  failed: "border-rose-400/25 bg-rose-400/10 text-rose-300",
  refunded: "border-violet-400/20 bg-violet-400/10 text-violet-300",
};

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium capitalize ${
        STATUS_STYLES[status] ?? STATUS_STYLES.queued
      }`}
    >
      {status}
    </span>
  );
}

function Panel({
  id,
  title,
  aside,
  children,
}: {
  id?: string;
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="glass-card scroll-mt-[9rem] rounded-2xl p-5 md:p-6 lg:scroll-mt-24"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-base font-semibold text-white/85">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-white/35">
      {children}
    </p>
  );
}

function safeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

function duration(start: string | null, end: string | null): string {
  if (!start || !end) return "—";
  const seconds = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000);
  if (seconds < 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

export default async function AdminCampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    outputsPage?: string;
    runsPage?: string;
    flagsPage?: string;
  }>;
}) {
  const [{ id }, session, query] = await Promise.all([
    params,
    readSession(),
    searchParams,
  ]);
  if (!session) redirect("/sign-in");

  const pageOf = (value: string | undefined) => {
    const parsed = Number.parseInt(value ?? "1", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  };
  const outputsPage = pageOf(query.outputsPage);
  const runsPage = pageOf(query.runsPage);
  const flagsPage = pageOf(query.flagsPage);

  let data;
  try {
    data = await readAdminCampaign(id, { outputsPage, runsPage, flagsPage });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) notFound();
    throw err;
  }
  if (!data) redirect("/admin");

  const { campaign, generations, runs, flags } = data;
  const pageParams = { outputsPage, runsPage, flagsPage };
  const plan = campaign.plan;
  const brief = plan?.brief ?? null;
  const quote = plan?.quote ?? null;
  const sourceUrl = safeUrl(brief?.sourceUrl);
  const ratio =
    campaign.creditBudget > 0
      ? Math.min(100, Math.round((campaign.creditsSpent / campaign.creditBudget) * 100))
      : 0;
  const openFlags = campaign.openFlags;

  return (
    <div className="shell-wide space-y-6">
      <div className="animate-in">
        <Link
          href="/admin/campaigns"
          className="inline-flex min-h-[44px] items-center gap-1.5 px-1 text-xs text-white/40 transition-colors hover:text-amber-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Campaigns
        </Link>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-400">
              Campaign record · {campaign.vertical} · {campaign.language}
            </p>
            <h1 className="font-display text-3xl font-bold leading-[1.05] tracking-tight text-white">
              {campaign.title}
            </h1>
            <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-white/35">
              {campaign.goal}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/40">
              <CampaignStatusPill status={campaign.status} />
              <span>
                by{" "}
                <Link
                  href={`/admin/users/${campaign.userId}`}
                  className="relative text-white/65 transition-colors before:absolute before:-inset-y-3.5 before:-inset-x-1 before:content-[''] hover:text-amber-200"
                >
                  {campaign.creator?.trim() || campaign.email || "Unnamed creator"}
                </Link>
              </span>
              <span className="text-white/20">·</span>
              <span>created {formatRelative(campaign.createdAt)}</span>
            </div>
          </div>
          <Link
            href={`/admin/users/${campaign.userId}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3.5 py-2.5 text-xs font-semibold text-white/55 transition-colors hover:border-amber-400/30 hover:text-amber-200 touch-target"
          >
            Client record
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <DetailChrome
        sections={SECTIONS}
        meta={
          <div>
            <CampaignStatusPill status={campaign.status} />
            <p className="mt-2.5 font-display text-sm font-semibold text-white/85">
              {campaign.title}
            </p>
            <p className="truncate text-[10px] text-white/30">{campaign.email ?? "no email"}</p>

            <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-white/30">Budget used</span>
                <span className="text-[10px] tabular-nums text-white/45">
                  {campaign.creditsSpent}/{campaign.creditBudget}
                </span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                  style={{ width: `${ratio}%` }}
                />
              </div>
              <p className="mt-1.5 text-[10px] text-white/25">
                {campaign.failedGenerations} failed of {generations.total} outputs
              </p>
            </div>

            <dl className="mt-3 space-y-1.5 border-t border-white/6 pt-3 text-[11px]">
              <div className="flex justify-between gap-3">
                <dt className="text-white/30">Plan</dt>
                <dd className="text-white/60">{plan ? `v${plan.version}` : "none"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-white/30">Updated</dt>
                <dd className="text-white/60">{formatRelative(campaign.updatedAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-white/30">Open flags</dt>
                <dd className={openFlags > 0 ? "text-rose-300" : "text-white/60"}>{openFlags}</dd>
              </div>
            </dl>
          </div>
        }
      >
        <Panel
          id="brief"
          title="Brief & quote"
          aside={plan ? <span className="text-[11px] text-white/30">Plan v{plan.version}</span> : null}
        >
          {brief ? (
            <>
              <dl className="grid gap-x-8 gap-y-1 md:grid-cols-2">
                <div className="min-w-0">
                  <dt className="text-[10px] uppercase tracking-wide text-white/30">Headline</dt>
                  <dd className="mt-1 text-sm text-white/85">{brief.headline}</dd>
                  <dt className="mt-3 text-[10px] uppercase tracking-wide text-white/30">Business</dt>
                  <dd className="mt-1 text-sm text-white/70">{brief.businessName || "—"}</dd>
                  <dt className="mt-3 text-[10px] uppercase tracking-wide text-white/30">Details</dt>
                  <dd className="mt-1 whitespace-pre-line text-sm leading-relaxed text-white/65">
                    {brief.details || "No extra detail was given."}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[10px] uppercase tracking-wide text-white/30">Offer</dt>
                  <dd className="mt-1 text-sm text-white/70">
                    {[brief.priceLabel, brief.offerLabel].filter(Boolean).join(" · ") || "—"}
                  </dd>
                  <dt className="mt-3 text-[10px] uppercase tracking-wide text-white/30">Formats</dt>
                  <dd className="mt-1 text-sm text-white/70">
                    {brief.formats.length > 0 ? brief.formats.join(" · ") : "—"}
                    {brief.video ? " · video" : " · no video"}
                  </dd>
                  <dt className="mt-3 text-[10px] uppercase tracking-wide text-white/30">Source</dt>
                  <dd className="mt-1 truncate text-sm text-white/70">
                    {sourceUrl ? (
                      <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative text-amber-300/80 underline decoration-amber-300/20 underline-offset-2 transition-colors before:absolute before:-inset-y-3.5 before:-inset-x-1 before:content-[''] hover:text-amber-200"
                      >
                        {sourceUrl}
                      </a>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
              </dl>

              {quote && (
                <div className="mt-5 overflow-hidden rounded-xl border border-white/6">
                  <table className="w-full border-collapse text-left text-sm">
                    <caption className="sr-only">Quoted credits for this campaign</caption>
                    <thead className="bg-white/[0.02] text-[10px] uppercase tracking-wider text-white/30">
                      <tr>
                        <th scope="col" className="px-4 py-2.5 font-semibold">Line</th>
                        <th scope="col" className="px-3 py-2.5 text-right font-semibold">Units</th>
                        <th scope="col" className="px-3 py-2.5 text-right font-semibold">Each</th>
                        <th scope="col" className="px-4 py-2.5 text-right font-semibold">Credits</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {quote.lines.map((line, index) => (
                        <tr key={`${line.kind}-${index}`}>
                          <td className="px-4 py-2.5 text-xs text-white/65">{line.label}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-white/45">{line.units}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-white/45">
                            {line.unitCredits}
                          </td>
                          <td className="px-4 py-2.5 text-right tabular-nums text-white/70">
                            {line.credits.toLocaleString("en-GH")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-white/8 bg-white/[0.02]">
                      <tr>
                        <td colSpan={3} className="px-4 py-2.5 text-right text-[11px] text-white/35">
                          Quoted total against a {quote.budget.toLocaleString("en-GH")} budget
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-amber-200">
                          {quote.total.toLocaleString("en-GH")}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </>
          ) : (
            <Empty>
              This campaign has no saved plan. It was created before plans were stored,
              or the brief was never quoted.
            </Empty>
          )}
        </Panel>

        <Panel
          id="outputs"
          title="Outputs"
          aside={
            <span className="text-[11px] text-white/30">
              {generations.total} on record · {campaign.failedGenerations} failed
            </span>
          }
        >
          {generations.items.length === 0 ? (
            <Empty>No generation has run for this campaign yet.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                <caption className="sr-only">Generations for this campaign, newest first</caption>
                <thead className="text-[10px] uppercase tracking-wider text-white/30">
                  <tr className="border-b border-white/6">
                    <th scope="col" className="px-2 py-2.5 font-semibold">Kind</th>
                    <th scope="col" className="px-2 py-2.5 font-semibold">Status</th>
                    <th scope="col" className="px-2 py-2.5 text-right font-semibold">Reserved</th>
                    <th scope="col" className="px-2 py-2.5 text-right font-semibold">Spent</th>
                    <th scope="col" className="px-2 py-2.5 font-semibold">Error</th>
                    <th scope="col" className="px-2 py-2.5 text-right font-semibold">Started</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {generations.items.map((generation) => (
                    <tr key={generation.id}>
                      <td className="px-2 py-2.5 text-xs text-white/65">
                        {GENERATION_LABELS[generation.kind] ?? generation.kind}
                      </td>
                      <td className="px-2 py-2.5">
                        <StatusPill status={generation.status} />
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-white/40">
                        {generation.creditsReserved}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-white/60">
                        {generation.creditsSpent}
                      </td>
                      <td className="max-w-[16rem] px-2 py-2.5">
                        {generation.error ? (
                          <p
                            className="truncate text-[11px] text-rose-300/80"
                            title={generation.error}
                          >
                            {generation.error}
                          </p>
                        ) : (
                          <span className="text-[11px] text-white/20">—</span>
                        )}
                      </td>
                      <td
                        className="px-2 py-2.5 text-right text-[11px] text-white/35"
                        title={formatDateTime(generation.createdAt)}
                      >
                        {formatRelative(generation.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pager
            page={generations.page}
            pages={generations.pages}
            total={generations.total}
            label="outputs"
            basePath={`/admin/campaigns/${id}`}
            pageParam="outputsPage"
            params={pageParams}
            hash="outputs"
            className="mt-3 rounded-xl border border-white/6"
          />
        </Panel>

        <Panel
          id="runs"
          title="Agent runs"
          aside={
            <span className="text-[11px] text-white/30">
              {runs.total} {runs.total === 1 ? "run" : "runs"} · newest first
            </span>
          }
        >
          {runs.items.length === 0 ? (
            <Empty>No agent run has touched this campaign yet.</Empty>
          ) : (
            <ul className="space-y-2">
              {runs.items.map((run) => (
                <li key={run.id} className="rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <StatusPill status={run.status} />
                      <span className="font-mono text-[10px] text-white/30">{run.id.slice(0, 8)}</span>
                      <span className="text-white/50">{run.model ?? "no model recorded"}</span>
                      <span className="text-white/20">·</span>
                      <span className="text-white/40">
                        {run.steps} {run.steps === 1 ? "step" : "steps"}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/35">
                      {run.creditsSpent}/{run.creditsReserved} credits · {duration(run.startedAt, run.finishedAt)}
                    </p>
                  </div>
                  {run.error && (
                    <p className="mt-2 break-words rounded-lg border border-rose-400/15 bg-rose-500/[0.05] px-2.5 py-1.5 text-[11px] leading-relaxed text-rose-200/75">
                      {run.error}
                    </p>
                  )}
                  <p className="mt-1.5 text-[10px] text-white/25">
                    Started {formatDateTime(run.startedAt)} · created {formatDateTime(run.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Pager
            page={runs.page}
            pages={runs.pages}
            total={runs.total}
            label="runs"
            basePath={`/admin/campaigns/${id}`}
            pageParam="runsPage"
            params={pageParams}
            hash="runs"
            className="mt-3 rounded-xl border border-white/6"
          />
        </Panel>

        <Panel
          id="flags"
          title="Moderation flags"
          aside={
            <span className="text-[11px] text-white/30">
              {openFlags} open of {flags.total}
            </span>
          }
        >
          {flags.items.length === 0 ? (
            <Empty>No content flag has been raised on this campaign.</Empty>
          ) : (
            <ul className="space-y-2">
              {flags.items.map((flag) => (
                <li
                  key={flag.id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs leading-relaxed text-white/75">{flag.reason}</p>
                    <p className="mt-1 text-[10px] text-white/25" title={formatDateTime(flag.createdAt)}>
                      Raised {formatRelative(flag.createdAt)}
                    </p>
                  </div>
                  <span
                    className={
                      flag.resolvedAt
                        ? "rounded-md border border-emerald-400/20 bg-emerald-400/10 px-1.5 py-0.5 text-[10px] text-emerald-300"
                        : "rounded-md border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 text-[10px] text-amber-300"
                    }
                  >
                    {flag.resolvedAt ? "Resolved" : "Open"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Pager
            page={flags.page}
            pages={flags.pages}
            total={flags.total}
            label="flags"
            basePath={`/admin/campaigns/${id}`}
            pageParam="flagsPage"
            params={pageParams}
            hash="flags"
            className="mt-3 rounded-xl border border-white/6"
          />
        </Panel>
      </DetailChrome>
    </div>
  );
}
