import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Search, ShieldCheck, X } from "lucide-react";
import { roleAtLeast, ROLE_RANK } from "@adgenie/core";
import { StatusPill as KycStatusPill } from "@/components/admin/kyc-status-pill";
import { RoleBadge } from "@/components/admin/role-badge";
import { RoleSelect } from "@/components/admin/role-select";
import { Pager } from "@/components/pagination/pager";
import { readAdminUsers, readSession } from "@/lib/session";
import { formatDate, formatDateTime, formatRelative } from "@/lib/format";

export const metadata: Metadata = { title: "Clients" };

const KYC_FILTERS = [
  { value: "", label: "All" },
  { value: "verified", label: "Verified" },
  { value: "under_review", label: "Waiting" },
  { value: "rejected", label: "Sent back" },
  { value: "none", label: "Not started" },
] as const;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ query?: string; page?: string; kyc?: string }>;
}) {
  const session = await readSession();
  if (!session) redirect("/sign-in");

  const params = await searchParams;
  const query = (params.query ?? "").trim().slice(0, 100);
  const kyc = KYC_FILTERS.some((filter) => filter.value === params.kyc) ? (params.kyc ?? "") : "";
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const data = await readAdminUsers({ query, kyc, page });
  if (!data) redirect("/dashboard");

  const canChangeRoles = roleAtLeast(session.appRole, "admin");

  function filterHref(value: string) {
    const search = new URLSearchParams();
    if (query) search.set("query", query);
    if (value) search.set("kyc", value);
    return `/admin/users?${search.toString()}`;
  }

  return (
    <div className="shell-wide space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 animate-in">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-400">
            Clients
          </p>
          <h1 className="font-display text-3xl font-bold leading-[1.05] tracking-tight text-white md:text-[2.6rem]">
            Every account,
            <br />
            <span className="gradient-text-hero glow-text-gold">and who they are here.</span>
          </h1>
        </div>
        <p className="text-sm text-white/35">
          {data.total.toLocaleString("en-GH")} {data.total === 1 ? "account" : "accounts"}
          {query ? ` matching “${query}”` : ""}
        </p>
      </div>

      {/* Sticky toolbar: search and the verification filter stay in reach. */}
      <div className="sticky top-[calc(73px_+_env(safe-area-inset-top))] z-20 -mx-1 space-y-2.5 rounded-2xl border border-white/8 bg-[#080b16]/90 p-3 shadow-lg shadow-black/20 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-2">
          <form
            action="/admin/users"
            method="get"
            className="flex min-w-0 flex-1 items-center gap-2"
          >
            {kyc && <input type="hidden" name="kyc" value={kyc} />}
            <label htmlFor="client-search" className="sr-only">
              Search clients by email, name or phone
            </label>
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
              <input
                id="client-search"
                name="query"
                type="search"
                defaultValue={query}
                maxLength={100}
                placeholder="Email, name or phone"
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
                href={filterHref(kyc)}
                aria-label="Clear search"
                className="rounded-xl border border-white/10 p-2.5 text-white/35 transition-colors hover:text-white/70 touch-target"
              >
                <X className="h-4 w-4" />
              </Link>
            )}
          </form>

          {!canChangeRoles && (
            <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/8 px-3 py-2 text-[11px] text-white/35">
              <ShieldCheck className="h-3.5 w-3.5" />
              View only
            </span>
          )}
        </div>

        <nav aria-label="Filter by verification" className="no-scrollbar flex gap-1.5 overflow-x-auto">
          {KYC_FILTERS.map((filter) => {
            const current = kyc === filter.value;
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
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <caption className="sr-only">
              Client accounts with role, verification, credits, spend and last sign-in
            </caption>
            <thead className="sticky top-0 z-10 bg-[#0a0d1b]/95 backdrop-blur-xl">
              <tr className="border-b border-white/8 text-[10px] uppercase tracking-wider text-white/30">
                <th scope="col" className="px-5 py-3 font-semibold">Creator</th>
                <th scope="col" className="px-4 py-3 font-semibold">Role</th>
                <th scope="col" className="px-4 py-3 font-semibold">Verification</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Credits</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Spent</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Campaigns</th>
                <th scope="col" className="px-4 py-3 font-semibold">Joined</th>
                <th scope="col" className="px-5 py-3 font-semibold">Last seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.items.map((user) => {
                const name = user.displayName?.trim() || "Unnamed creator";
                const editable =
                  canChangeRoles &&
                  user.id !== session.id &&
                  ROLE_RANK[user.appRole] < ROLE_RANK[session.appRole];

                return (
                  <tr key={user.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/70 to-orange-500/70 text-xs font-bold text-black">
                          {(user.displayName?.trim() || user.email || "A").charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white/85">
                            <Link
                              href={`/admin/users/${user.id}`}
                              className="relative transition-colors before:absolute before:-inset-y-4 before:-inset-x-1 before:content-[''] hover:text-amber-200"
                            >
                              {name}
                            </Link>
                            {user.id === session.id && (
                              <span className="ml-2 text-[10px] font-normal uppercase tracking-wider text-amber-300/70">
                                you
                              </span>
                            )}
                          </p>
                          <p className="truncate text-[11px] text-white/35">
                            {user.email ?? "no email"}
                            <span className="ml-1.5 text-white/20">
                              {user.emailVerified ? "✓ email" : "email unverified"}
                              {" · "}
                              {user.phoneVerified ? "✓ phone" : "phone unverified"}
                            </span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {editable ? (
                        <RoleSelect
                          userId={user.id}
                          currentRole={user.appRole}
                          viewerRole={session.appRole}
                        />
                      ) : (
                        <RoleBadge role={user.appRole} />
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      {user.kycStatus ? (
                        <Link
                          href={`/admin/kyc/${user.id}`}
                          className="relative inline-block before:absolute before:-inset-y-3 before:-inset-x-1 before:content-['']"
                        >
                          <KycStatusPill status={user.kycStatus} />
                        </Link>
                      ) : (
                        <span className="inline-flex items-center rounded-md border border-white/8 bg-white/[0.02] px-1.5 py-0.5 text-[10px] text-white/25">
                          Not started
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right font-medium tabular-nums text-white/70">
                      {user.balance.toLocaleString("en-GH")}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-white/45">
                      {user.creditsSpent.toLocaleString("en-GH")}
                    </td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-white/45">
                      {user.campaigns.toLocaleString("en-GH")}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-white/40" title={formatDateTime(user.createdAt)}>
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-white/40" title={user.lastSignInAt ? formatDateTime(user.lastSignInAt) : "Never signed in"}>
                      {formatRelative(user.lastSignInAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {data.items.length === 0 && (
            <div className="px-6 py-16 text-center">
              <p className="font-display text-lg font-semibold text-white/70">No accounts found.</p>
              <p className="mt-1 text-sm text-white/35">
                {query || kyc ? "Try a different search or filter." : "The first sign-up will appear here."}
              </p>
            </div>
          )}
        </div>
      </div>

      <Pager
        page={data.page}
        pages={data.pages}
        total={data.total}
        label="accounts"
        basePath="/admin/users"
        params={{ query, kyc }}
        className="glass-card rounded-2xl"
      />
    </div>
  );
}
