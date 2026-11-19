import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Search, ShieldCheck, X } from "lucide-react";
import { roleAtLeast } from "@adgenie/core";
import { Pager } from "@/components/pagination/pager";
import { auditActionLabel, auditActionSummary } from "@/lib/audit";
import { readAdminAudit, readSession } from "@/lib/session";
import { formatDateTime, formatRelative } from "@/lib/format";

export const metadata: Metadata = { title: "Audit log" };

const ACTION_TONES: Record<string, { dot: string; pill: string }> = {
  role_changed: {
    dot: "from-sky-300 to-sky-500",
    pill: "border-sky-400/20 bg-sky-400/10 text-sky-300",
  },
  role_provisioned: {
    dot: "from-violet-300 to-violet-500",
    pill: "border-violet-400/20 bg-violet-400/10 text-violet-300",
  },
  kyc_verified: {
    dot: "from-emerald-300 to-teal-500",
    pill: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  },
  kyc_rejected: {
    dot: "from-rose-300 to-rose-500",
    pill: "border-rose-400/25 bg-rose-400/10 text-rose-300",
  },
};

const VERBS: Record<string, string> = {
  role_changed: "changed the role of",
  role_provisioned: "provisioned",
  kyc_verified: "approved the identity of",
  kyc_rejected: "sent verification back for",
};

const FALLBACK_TONE = {
  dot: "from-amber-300 to-orange-500",
  pill: "border-amber-400/20 bg-amber-400/10 text-amber-300",
};

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string; query?: string }>;
}) {
  const session = await readSession();
  if (!session) redirect("/sign-in");
  if (!roleAtLeast(session.appRole, "admin")) redirect("/admin");

  const params = await searchParams;
  const action = /^[a-z0-9_]{1,40}$/.test(params.action ?? "") ? (params.action ?? "") : "";
  const query = (params.query ?? "").trim().slice(0, 100);
  const requested = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(requested) && requested > 0 ? requested : 1;

  const data = await readAdminAudit({ page, action, query });
  if (!data) redirect("/admin");

  const filtered = Boolean(action || query);

  function filterHref(nextAction: string) {
    const search = new URLSearchParams();
    if (query) search.set("query", query);
    if (nextAction) search.set("action", nextAction);
    return search.size > 0 ? `/admin/audit?${search.toString()}` : "/admin/audit";
  }

  return (
    <div className="shell-wide space-y-6">
      <div className="animate-in">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-400">
          Audit log
        </p>
        <h1 className="font-display text-3xl font-bold leading-[1.05] tracking-tight text-white md:text-[2.6rem]">
          Accountability,
          <br />
          <span className="gradient-text-hero glow-text-gold">in order.</span>
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/50 md:text-base">
          Role changes and verification decisions, made from this dashboard or by
          the provisioning script. Append-only; nothing here can be edited from the app.
        </p>
      </div>

      <div className="sticky top-[calc(73px_+_env(safe-area-inset-top))] z-20 -mx-1 space-y-2.5 rounded-2xl border border-white/8 bg-[#080b16]/90 p-3 shadow-lg shadow-black/20 backdrop-blur-xl">
        <form action="/admin/audit" method="get" className="flex flex-wrap items-center gap-2">
          {action && <input type="hidden" name="action" value={action} />}
          <label htmlFor="audit-search" className="sr-only">
            Search by staff or account email
          </label>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
            <input
              id="audit-search"
              name="query"
              type="search"
              defaultValue={query}
              maxLength={100}
              placeholder="Staff or account email"
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
              href={filterHref(action)}
              aria-label="Clear search"
              className="rounded-xl border border-white/10 p-2.5 text-white/35 transition-colors hover:text-white/70 touch-target"
            >
              <X className="h-4 w-4" />
            </Link>
          )}
        </form>

        <nav aria-label="Filter by action" className="no-scrollbar flex gap-1.5 overflow-x-auto">
          <Link
            href={filterHref("")}
            aria-current={!action ? "true" : undefined}
            className={
              !action
                ? "shrink-0 rounded-lg border border-amber-400/20 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-medium text-amber-200 touch-target"
                : "shrink-0 rounded-lg border border-transparent px-2.5 py-1.5 text-[11px] font-medium text-white/40 transition-colors hover:text-white/70 touch-target"
            }
          >
            All
          </Link>
          {data.actions.map((name) => {
            const current = action === name;
            return (
              <Link
                key={name}
                href={filterHref(name)}
                aria-current={current ? "true" : undefined}
                className={
                  current
                    ? `shrink-0 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium touch-target ${
                        (ACTION_TONES[name] ?? FALLBACK_TONE).pill
                      }`
                    : "shrink-0 rounded-lg border border-transparent px-2.5 py-1.5 text-[11px] font-medium text-white/40 transition-colors hover:text-white/70 touch-target"
                }
              >
                {auditActionLabel(name)}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="glass-card rounded-2xl p-5 md:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-white/55">
            <ShieldCheck className="h-4 w-4 text-amber-400/80" />
            {data.total.toLocaleString("en-GH")} {data.total === 1 ? "decision" : "decisions"}
            {action ? ` · ${auditActionLabel(action)}` : ""}
            {query ? ` matching “${query}”` : ""}
          </div>
          <p className="text-xs text-white/30">
            Page {data.page} of {data.pages}
          </p>
        </div>

        {data.items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 px-4 py-12 text-center text-sm leading-relaxed text-white/35">
            {filtered
              ? "Nothing matches that search. Try a different action or email."
              : "No staff decision has been recorded yet. Promote the first account with node scripts/admin.mjs."}
          </p>
        ) : (
          <ol className="relative space-y-4 border-l border-white/8 pl-5">
            {data.items.map((entry) => {
              const tone = ACTION_TONES[entry.action] ?? FALLBACK_TONE;
              const verb = VERBS[entry.action] ?? auditActionLabel(entry.action).toLowerCase();
              const actor = entry.actorEmail ?? "The server script";
              const target = entry.targetEmail ?? "a deleted account";

              return (
                <li key={entry.id} className="relative">
                  <span
                    className={`absolute -left-[1.42rem] top-1.5 h-2 w-2 rounded-full bg-gradient-to-br ring-4 ring-[#080b16] ${tone.dot}`}
                    aria-hidden="true"
                  />
                  <div className="rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <p className="min-w-0 text-sm leading-relaxed text-white/65">
                        <span className="font-medium text-white/90">{actor}</span> {verb}{" "}
                        <span className="font-medium text-white/85">{target}</span>
                      </p>
                      <time
                        dateTime={entry.createdAt}
                        title={formatDateTime(entry.createdAt)}
                        className="shrink-0 text-[11px] text-white/30"
                      >
                        {formatRelative(entry.createdAt)}
                      </time>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${tone.pill}`}>
                        {auditActionLabel(entry.action)}
                      </span>
                      <span className="text-[11px] text-white/35">{auditActionSummary(entry)}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <Pager
        page={data.page}
        pages={data.pages}
        total={data.total}
        label="decisions"
        basePath="/admin/audit"
        params={{ action, query }}
        className="glass-card rounded-2xl"
      />
    </div>
  );
}
