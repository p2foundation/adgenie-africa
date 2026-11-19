import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, Search, X } from "lucide-react";
import { CampaignStatusPill } from "@/components/admin/status-pills";
import { Pager } from "@/components/pagination/pager";
import { readAdminCampaigns, readSession } from "@/lib/session";
import { formatDateTime, formatRelative } from "@/lib/format";

export const metadata: Metadata = { title: "Campaigns" };

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "planned", label: "Planned" },
  { value: "running", label: "Running" },
  { value: "done", label: "Done" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export default async function AdminCampaignsPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; status?: string; health?: string; page?: string }>;
}) {
  const session = await readSession();
  if (!session) redirect("/sign-in");

  const params = await searchParams;
  const query = (params.query ?? "").trim().slice(0, 100);
  const status = STATUS_FILTERS.some((filter) => filter.value === params.status)
    ? (params.status ?? "")
    : "";
  const health = params.health === "failed" ? "failed" : "";
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const data = await readAdminCampaigns({ query, status, health, page });
  if (!data) redirect("/dashboard");

  function filterHref(nextStatus: string, nextHealth: string) {
    const search = new URLSearchParams();
    if (query) search.set("query", query);
    if (nextStatus) search.set("status", nextStatus);
    if (nextHealth) search.set("health", nextHealth);
    return search.size > 0 ? `/admin/campaigns?${search.toString()}` : "/admin/campaigns";
  }

  const filtered = Boolean(query || status || health);

  return (
    <div className="shell-wide space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 animate-in">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-400">
            Campaigns
          </p>
          <h1 className="font-display text-3xl font-bold leading-[1.05] tracking-tight text-white md:text-[2.6rem]">
            Every brief,
            <br />
            <span className="gradient-text-hero glow-text-gold">and what happened next.</span>
          </h1>
        </div>
        <p className="text-sm text-white/35">
          {data.total.toLocaleString("en-GH")} {data.total === 1 ? "campaign" : "campaigns"}
          {query ? ` matching “${query}”` : ""}
        </p>
      </div>

      <div className="sticky top-[calc(73px_+_env(safe-area-inset-top))] z-20 -mx-1 space-y-2.5 rounded-2xl border border-white/8 bg-[#080b16]/90 p-3 shadow-lg shadow-black/20 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2">
          <form action="/admin/campaigns" method="get" className="flex min-w-0 flex-1 items-center gap-2">
            {status && <input type="hidden" name="status" value={status} />}
            {health && <input type="hidden" name="health" value={health} />}
            <label htmlFor="campaign-search" className="sr-only">
              Search campaigns by title, brief, creator or email
            </label>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
              <input
                id="campaign-search"
                name="query"
                type="search"
                defaultValue={query}
                maxLength={100}
                placeholder="Title, brief, creator or email"
                className="min-h-[44px] w-full rounded-xl border border-white/10 bg-white/[0.03] py-2.5 pl-9 pr-3 text-sm text-white/85 placeholder:text-white/25 outline-none transition-colors focus:border-amber-400/40"
              />
            </div>
            <button
              type="submit"
              className="rounded-xl border border-white/10 px-3.5 py-2.5 text-xs font-semibold text-white/60 transition-colors hover:border-amber-400/30 hover:text-amber-300 touch-target"
            >
              Search
            </button>
            {query && (
              <Link
                href={filterHref(status, health)}
                aria-label="Clear search"
                className="rounded-xl border border-white/10 p-2.5 text-white/35 transition-colors hover:text-white/70 touch-target"
              >
                <X className="h-4 w-4" />
              </Link>
            )}
          </form>

          <Link
            href={filterHref(status, health === "failed" ? "" : "failed")}
            aria-pressed={health === "failed"}
            className={
              health === "failed"
                ? "inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-[11px] font-medium text-rose-200 touch-target"
                : "inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-[11px] font-medium text-white/40 transition-colors hover:border-rose-400/25 hover:text-rose-200 touch-target"
            }
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Had failures
          </Link>
        </div>

        <nav aria-label="Filter by status" className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {STATUS_FILTERS.map((filter) => {
            const current = status === filter.value;
            return (
              <Link
                key={filter.value || "all"}
                href={filterHref(filter.value, health)}
                aria-current={current ? "true" : undefined}
                className={
                  current
                    ? "shrink-0 rounded-lg border border-amber-400/20 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-medium text-amber-200 touch-target"
                    : "shrink-0 rounded-lg border border-transparent px-2.5 py-1.5 text-[11px] font-medium text-white/40 transition-colors hover:text-white/70 touch-target"
                }
              >
                {filter.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="glass-card overflow-hidden rounded-2xl">
        <div className="max-h-[calc(100vh-19rem)] overflow-auto">
          <table className="w-full min-w-[880px] border-collapse text-left text-sm">
            <caption className="sr-only">
              Campaigns with creator, status, credit budget, generations and last update
            </caption>
            <thead className="sticky top-0 z-10 bg-[#0a0d1b]/95 backdrop-blur-xl">
              <tr className="border-b border-white/8 text-[10px] uppercase tracking-wider text-white/30">
                <th scope="col" className="px-5 py-3 font-semibold">Campaign</th>
                <th scope="col" className="px-4 py-3 font-semibold">Creator</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Budget</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Outputs</th>
                <th scope="col" className="px-5 py-3 text-right font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.items.map((campaign) => {
                const ratio =
                  campaign.creditBudget > 0
                    ? Math.min(100, Math.round((campaign.creditsSpent / campaign.creditBudget) * 100))
                    : 0;
                return (
                  <tr key={campaign.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5">
                      <p className="max-w-[21rem] truncate text-sm font-medium text-white/85">
                        <Link
                          href={`/admin/campaigns/${campaign.id}`}
                          className="relative transition-colors before:absolute before:-inset-y-4 before:-inset-x-1 before:content-[''] hover:text-amber-200"
                        >
                          {campaign.title}
                        </Link>
                      </p>
                      <p className="mt-0.5 max-w-[21rem] truncate text-[11px] text-white/30">
                        {campaign.goal} · {campaign.vertical} · {campaign.language}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="max-w-[12rem] truncate text-xs text-white/60">
                        <Link
                          href={`/admin/users/${campaign.userId}`}
                          className="relative transition-colors before:absolute before:-inset-y-4 before:-inset-x-1 before:content-[''] hover:text-amber-200"
                        >
                          {campaign.creator?.trim() || "Unnamed creator"}
                        </Link>
                      </p>
                      <p className="max-w-[12rem] truncate text-[10px] text-white/25">
                        {campaign.email ?? "no email"}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <CampaignStatusPill status={campaign.status} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <p className="tabular-nums text-xs text-white/55">
                        {campaign.creditsSpent} / {campaign.creditBudget}
                      </p>
                      <div className="mt-1 ml-auto h-1 w-20 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <p className="tabular-nums text-xs text-white/55">{campaign.generations}</p>
                      {campaign.failedGenerations > 0 && (
                        <p className="text-[10px] text-rose-300/80">
                          {campaign.failedGenerations} failed
                        </p>
                      )}
                    </td>
                    <td
                      className="px-5 py-3.5 text-right text-xs text-white/35"
                      title={`Created ${formatDateTime(campaign.createdAt)} · updated ${formatDateTime(campaign.updatedAt)}`}
                    >
                      {formatRelative(campaign.updatedAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {data.items.length === 0 && (
            <div className="px-6 py-16 text-center">
              <p className="font-display text-lg font-semibold text-white/70">No campaigns found.</p>
              <p className="mt-1 text-sm text-white/35">
                {filtered
                  ? "Try a different search, status or the failure filter."
                  : "The first brief a creator builds will appear here."}
              </p>
            </div>
          )}
        </div>
      </div>

      <Pager
        page={data.page}
        pages={data.pages}
        total={data.total}
        label="campaigns"
        basePath="/admin/campaigns"
        params={{ query, status, health }}
        className="glass-card rounded-2xl"
      />
    </div>
  );
}
