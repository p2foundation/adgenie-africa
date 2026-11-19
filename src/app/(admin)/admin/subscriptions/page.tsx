import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Search, X } from "lucide-react";
import { SubscriptionStatusPill } from "@/components/admin/status-pills";
import { Pager } from "@/components/pagination/pager";
import { readAdminSubscriptions, readSession } from "@/lib/session";
import { formatDate, formatDateTime, formatRelative } from "@/lib/format";

export const metadata: Metadata = { title: "Subscriptions" };

const STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "past_due", label: "Past due" },
  { value: "cancelled", label: "Cancelled" },
  { value: "expired", label: "Expired" },
] as const;

export default async function AdminSubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; status?: string; page?: string }>;
}) {
  const session = await readSession();
  if (!session) redirect("/sign-in");

  const params = await searchParams;
  const query = (params.query ?? "").trim().slice(0, 100);
  const status = STATUS_FILTERS.some((f) => f.value === params.status)
    ? (params.status ?? "")
    : "";
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const data = await readAdminSubscriptions({ query, status, page });
  if (!data) redirect("/admin");

  function filterHref(value: string) {
    const search = new URLSearchParams();
    if (query) search.set("query", query);
    if (value) search.set("status", value);
    return `/admin/subscriptions?${search.toString()}`;
  }

  return (
    <div className="shell-wide space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 animate-in">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-400">
            Subscriptions
          </p>
          <h1 className="font-display text-3xl font-bold leading-[1.05] tracking-tight text-white md:text-[2.6rem]">
            Plans people hold,
            <br />
            <span className="gradient-text-hero glow-text-gold">and when they run out.</span>
          </h1>
        </div>
        <p className="text-sm text-white/35">
          {data.total.toLocaleString("en-GH")}{" "}
          {data.total === 1 ? "subscription" : "subscriptions"}
          {query ? ` matching “${query}”` : ""}
        </p>
      </div>

      <div className="sticky top-[calc(73px_+_env(safe-area-inset-top))] z-20 -mx-1 space-y-2.5 rounded-2xl border border-white/8 bg-[#080b16]/90 p-3 shadow-lg shadow-black/20 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2">
          <form
            action="/admin/subscriptions"
            method="get"
            className="flex min-w-0 flex-1 items-center gap-2"
          >
            {status && <input type="hidden" name="status" value={status} />}
            <label htmlFor="subscription-search" className="sr-only">
              Search subscriptions by email or name
            </label>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
              <input
                id="subscription-search"
                name="query"
                type="search"
                defaultValue={query}
                maxLength={100}
                placeholder="Email or name"
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
                href={filterHref(status)}
                aria-label="Clear search"
                className="rounded-xl border border-white/10 p-2.5 text-white/35 transition-colors hover:text-white/70 touch-target"
              >
                <X className="h-4 w-4" />
              </Link>
            )}
          </form>
        </div>

        <nav aria-label="Filter by subscription status" className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {STATUS_FILTERS.map((filter) => {
            const current = status === filter.value;
            return (
              <Link
                key={filter.value || "all"}
                href={filterHref(filter.value)}
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
          <table className="w-full min-w-[860px] border-collapse text-left text-sm">
            <caption className="sr-only">
              Subscriptions with holder, plan, status and billing period
            </caption>
            <thead className="sticky top-0 z-10 bg-[#0a0d1b]/95 backdrop-blur-xl">
              <tr className="border-b border-white/8 text-[10px] uppercase tracking-wider text-white/30">
                <th scope="col" className="px-5 py-3 font-semibold">Holder</th>
                <th scope="col" className="px-4 py-3 font-semibold">Plan</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Credits / period</th>
                <th scope="col" className="px-4 py-3 font-semibold">Period start</th>
                <th scope="col" className="px-4 py-3 font-semibold">Period end</th>
                <th scope="col" className="px-5 py-3 font-semibold">Started</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.items.map((sub) => {
                const name = sub.displayName?.trim() || "Unnamed creator";
                return (
                  <tr key={sub.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/users/${sub.userId}`}
                        className="relative block font-medium text-white/85 transition-colors before:absolute before:-inset-y-4 before:-inset-x-1 before:content-[''] hover:text-amber-200"
                      >
                        {name}
                      </Link>
                      <p className="truncate text-[11px] text-white/35">{sub.email ?? "no email"}</p>
                    </td>
                    <td className="px-4 py-3.5 text-xs capitalize text-white/65">
                      {sub.planName ?? sub.planCode}
                      {sub.cancelAtPeriodEnd && (
                        <span className="ml-1.5 text-[10px] text-white/30">ends at period</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <SubscriptionStatusPill status={sub.status} />
                      {sub.overdueActive && (
                        <span
                          className="ml-1.5 inline-flex items-center rounded-md border border-rose-400/25 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium text-rose-300"
                          title="Past its period end — the expiry sweep will lapse it"
                        >
                          Overdue
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-white/70">
                      {sub.creditsPerPeriod.toLocaleString("en-GH")}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-white/40" title={formatDateTime(sub.currentPeriodStart)}>
                      {formatDate(sub.currentPeriodStart)}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-white/40" title={formatDateTime(sub.currentPeriodEnd)}>
                      {formatRelative(sub.currentPeriodEnd)}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-white/40" title={formatDateTime(sub.createdAt)}>
                      {formatDate(sub.createdAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {data.items.length === 0 && (
            <div className="px-6 py-16 text-center">
              <p className="font-display text-lg font-semibold text-white/70">No subscriptions found.</p>
              <p className="mt-1 text-sm text-white/35">
                {query || status
                  ? "Try a different search or filter."
                  : "The first paid plan will appear here after the first settled charge."}
              </p>
            </div>
          )}
        </div>
      </div>

      <Pager
        page={data.page}
        pages={data.pages}
        total={data.total}
        label="subscriptions"
        basePath="/admin/subscriptions"
        params={{ query, status }}
        className="glass-card rounded-2xl"
      />
    </div>
  );
}
