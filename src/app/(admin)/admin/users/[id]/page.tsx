import { type Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { ROLE_RANK, countryName, currencyLabel, resolveCurrency, roleAtLeast } from "@adgenie/core";
import { AssignPlan } from "@/components/admin/assign-plan";
import { DetailChrome, type DetailSection } from "@/components/admin/detail-chrome";
import { GrantCredits } from "@/components/admin/grant-credits";
import { StatusPill as KycStatusPill } from "@/components/admin/kyc-status-pill";
import { RoleBadge } from "@/components/admin/role-badge";
import { RoleSelect } from "@/components/admin/role-select";
import { CampaignStatusPill, PaymentStatusPill, SubscriptionStatusPill } from "@/components/admin/status-pills";
import { Pager } from "@/components/pagination/pager";
import { ApiError } from "@/lib/api";
import { auditActionLabel, auditActionSummary } from "@/lib/audit";
import { formatDate, formatDateTime, formatGhs, formatRelative } from "@/lib/format";
import { readAdminUser, readSession } from "@/lib/session";

export const metadata: Metadata = { title: "Client record" };

const SECTIONS: DetailSection[] = [
  { id: "identity", label: "Identity", icon: "identity" },
  { id: "wallet", label: "Wallet", icon: "wallet" },
  { id: "subscription", label: "Subscription", icon: "subscription" },
  { id: "campaigns", label: "Campaigns", icon: "campaigns" },
  { id: "payments", label: "Payments", icon: "payments" },
  { id: "activity", label: "Staff activity", icon: "history" },
];

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

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="shrink-0 text-[11px] uppercase tracking-wide text-white/35">{label}</dt>
      <dd className="min-w-0 break-words text-right text-sm text-white/80">{children}</dd>
    </div>
  );
}

function reasonLabel(value: string) {
  return value.replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase());
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-white/35">
      {children}
    </p>
  );
}

export default async function AdminUserDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    ledgerPage?: string;
    campaignsPage?: string;
    paymentsPage?: string;
    auditPage?: string;
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
  const ledgerPage = pageOf(query.ledgerPage);
  const campaignsPage = pageOf(query.campaignsPage);
  const paymentsPage = pageOf(query.paymentsPage);
  const auditPage = pageOf(query.auditPage);

  let data;
  try {
    data = await readAdminUser(id, {
      ledgerPage,
      campaignsPage,
      paymentsPage,
      auditPage,
    });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) notFound();
    throw err;
  }
  if (!data) redirect("/admin");

  const { user, stats, ledger, subscription, campaigns, payments, audit } = data;
  const pageParams = { campaignsPage, paymentsPage, auditPage, ledgerPage };
  const name = user.displayName?.trim() || user.legalName?.trim() || "Unnamed creator";
  const canChangeRole =
    roleAtLeast(session.appRole, "admin") &&
    user.id !== session.id &&
    user.appRole !== "root" &&
    ROLE_RANK[user.appRole] < ROLE_RANK[session.appRole];
  const canMoveMoney = roleAtLeast(session.appRole, "admin");

  return (
    <div className="shell-wide space-y-6">
      <div className="animate-in">
        <Link
          href="/admin/users"
          className="inline-flex min-h-[44px] items-center gap-1.5 px-1 text-xs text-white/40 transition-colors hover:text-amber-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Clients
        </Link>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400/80 to-orange-500/80 font-display text-lg font-bold text-black shadow-lg shadow-amber-500/20 ring-2 ring-white/10">
              {name.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-amber-400">
                {user.businessName || (user.appRole === "user" ? "Creator account" : "Staff account")}
              </p>
              <h1 className="truncate font-display text-3xl font-bold leading-[1.05] tracking-tight text-white">
                {name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/40">
                <RoleBadge role={user.appRole} />
                {user.kycStatus ? (
                  <KycStatusPill status={user.kycStatus} />
                ) : (
                  <span className="inline-flex items-center rounded-md border border-white/8 bg-white/[0.02] px-1.5 py-0.5 text-[10px] text-white/25">
                    Verification not started
                  </span>
                )}
                <span className="truncate">{user.email ?? "no email"}</span>
                {user.id === session.id && (
                  <span className="text-[10px] uppercase tracking-wider text-amber-300/70">you</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canChangeRole && (
              <div className="rounded-xl border border-white/8 bg-white/[0.02] p-2">
                <p className="mb-1 text-[9px] uppercase tracking-widest text-white/30">Change role</p>
                <RoleSelect
                  userId={user.id}
                  currentRole={user.appRole}
                  viewerRole={session.appRole}
                />
              </div>
            )}
            {user.kycStatus && (
              <Link
                href={`/admin/kyc/${user.id}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-3.5 py-2.5 text-xs font-semibold text-amber-200 transition-colors hover:border-amber-400/40 hover:bg-amber-400/10 touch-target"
              >
                Verification file
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>

      <DetailChrome
        sections={SECTIONS}
        meta={
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/70 to-orange-500/70 text-xs font-bold text-black">
                {name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-semibold text-white/90">{name}</p>
                <p className="truncate text-[10px] text-white/30">{user.email ?? "no email"}</p>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-widest text-white/30">Credit balance</p>
              <p className="font-display text-xl font-bold tabular-nums text-amber-200">
                {user.balance.toLocaleString("en-GH")}
              </p>
              <p className="mt-0.5 text-[10px] text-white/25">
                {stats.creditsSpent30d.toLocaleString("en-GH")} spent in 30d
              </p>
            </div>

            <dl className="mt-3 space-y-1.5 border-t border-white/6 pt-3 text-[11px]">
              <div className="flex justify-between gap-3">
                <dt className="text-white/30">Campaigns</dt>
                <dd className="tabular-nums text-white/60">{user.campaigns}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-white/30">Joined</dt>
                <dd className="text-white/60">{formatDate(user.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-white/30">Last seen</dt>
                <dd className="text-white/60">{formatRelative(user.lastSignInAt)}</dd>
              </div>
            </dl>
          </div>
        }
      >
        <Panel
          id="identity"
          title="Identity & verification"
          aside={
            user.kycStatus ? (
              <KycStatusPill status={user.kycStatus} />
            ) : (
              <span className="text-[11px] text-white/30">Not started</span>
            )
          }
        >
          <div className="grid gap-x-8 gap-y-1 md:grid-cols-2">
            <dl className="divide-y divide-white/5">
              <Fact label="Display name">{user.displayName || "—"}</Fact>
              <Fact label="Legal name">{user.legalName || "—"}</Fact>
              <Fact label="Business">{user.businessName || "—"}</Fact>
              <Fact label="Country">{countryName(user.country) ?? "not answered"}</Fact>
              <Fact label="Email">
                {user.email ?? "—"}
                <span className={user.emailVerified ? "ml-2 text-teal-300/80" : "ml-2 text-rose-300/70"}>
                  {user.emailVerified ? "verified" : "unverified"}
                </span>
              </Fact>
            </dl>
            <dl className="divide-y divide-white/5">
              <Fact label="Phone">
                {user.phone ?? "—"}
                {user.phone && (
                  <span className={user.phoneVerified ? "ml-2 text-teal-300/80" : "ml-2 text-rose-300/70"}>
                    {user.phoneVerified ? "verified" : "unverified"}
                  </span>
                )}
              </Fact>
              <Fact label="Joined">{formatDateTime(user.createdAt)}</Fact>
              <Fact label="Last sign-in">{formatDateTime(user.lastSignInAt)}</Fact>
              <Fact label="Prices shown in">{currencyLabel(resolveCurrency(user))}</Fact>
              <Fact label="Account ID">
                <span className="font-mono text-[11px] text-white/45">{user.id}</span>
              </Fact>
            </dl>
          </div>

          <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
            {user.kycStatus ? (
              <div className="space-y-2">
                <dl className="grid gap-x-6 gap-y-1 text-xs sm:grid-cols-3">
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-white/30">Sent for review</dt>
                    <dd className="mt-0.5 text-white/70">{formatDateTime(user.kycSubmittedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-white/30">Verified</dt>
                    <dd className="mt-0.5 text-white/70">{formatDateTime(user.kycVerifiedAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wide text-white/30">Status</dt>
                    <dd className="mt-0.5 text-white/70">
                      {user.kycStatus === "rejected" ? "Sent back to the client" : reasonLabel(user.kycStatus)}
                    </dd>
                  </div>
                </dl>
                {user.kycRejectionReason && (
                  <p className="rounded-lg border border-rose-400/20 bg-rose-500/[0.06] px-3 py-2 text-xs leading-relaxed text-rose-100/80">
                    Last reason: {user.kycRejectionReason}
                  </p>
                )}
                <Link
                  href={`/admin/kyc/${user.id}`}
                  className="inline-flex min-h-[44px] items-center gap-1 px-1 text-[11px] font-medium text-amber-300/80 transition-colors hover:text-amber-200"
                >
                  Open the evidence and decision file
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <p className="text-xs leading-relaxed text-white/40">
                This account has not started verification. Nothing blocks them from
                creating work, and payouts are not tied to verification yet.
              </p>
            )}
          </div>
        </Panel>

        <Panel
          id="wallet"
          title="Wallet & ledger"
          aside={
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-white/30">
                {ledger.total.toLocaleString("en-GH")} {ledger.total === 1 ? "entry" : "entries"} · 20 per page
              </span>
              {canMoveMoney && (
                <GrantCredits userId={user.id} balance={user.balance} />
              )}
            </div>
          }
        >
          <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              { label: "Balance", value: user.balance.toLocaleString("en-GH"), tone: "text-amber-200" },
              { label: "Spent 30d", value: stats.creditsSpent30d.toLocaleString("en-GH"), tone: "text-white/80" },
              { label: "Top-ups", value: formatGhs(stats.topupsPesewas), tone: "text-emerald-300/90" },
              {
                label: "Failed work",
                value: String(stats.failedGenerations),
                tone: stats.failedGenerations > 0 ? "text-rose-300" : "text-white/50",
              },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
                <dt className="text-[10px] uppercase tracking-wider text-white/30">{stat.label}</dt>
                <dd className={`mt-0.5 font-display text-lg font-bold tabular-nums ${stat.tone}`}>
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 text-[11px] text-white/25">
            {stats.paymentCount} successful {stats.paymentCount === 1 ? "payment" : "payments"} on this account.
            Ledger rows are append-only.
          </p>

          <div className="mt-4 overflow-hidden rounded-xl border border-white/6">
            {ledger.items.length === 0 ? (
              <Empty>No credit has moved on this account yet.</Empty>
            ) : (
              <table className="w-full border-collapse text-left text-sm">
                <caption className="sr-only">Credit ledger entries</caption>
                <thead className="bg-white/[0.02] text-[10px] uppercase tracking-wider text-white/30">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Reason</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Type</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">When</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-semibold">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {ledger.items.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-4 py-2.5 text-xs text-white/70">{reasonLabel(entry.reason)}</td>
                      <td className="px-3 py-2.5 text-[11px] capitalize text-white/35">{entry.creditType}</td>
                      <td
                        className="px-3 py-2.5 text-[11px] text-white/35"
                        title={formatDateTime(entry.createdAt)}
                      >
                        {formatRelative(entry.createdAt)}
                      </td>
                      <td
                        className={`px-4 py-2.5 text-right font-medium tabular-nums ${
                          entry.delta > 0 ? "text-emerald-300/90" : "text-white/65"
                        }`}
                      >
                        {entry.delta > 0 ? "+" : ""}
                        {entry.delta.toLocaleString("en-GH")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <Pager
              page={ledger.page}
              pages={ledger.pages}
              total={ledger.total}
              label="entries"
              basePath={`/admin/users/${id}`}
              pageParam="ledgerPage"
              params={pageParams}
              hash="wallet"
            />
          </div>
        </Panel>

        <Panel
          id="subscription"
          title="Subscription"
          aside={
            <div className="flex items-center gap-3">
              {canMoveMoney && (
                <AssignPlan
                  userId={user.id}
                  activePlanCode={
                    subscription?.status === "active"
                      ? subscription.planCode
                      : null
                  }
                />
              )}
              <Link
                href="/admin/subscriptions"
                className="inline-flex min-h-[44px] items-center px-1 text-[11px] font-medium text-amber-300/70 transition-colors hover:text-amber-200"
              >
                All subscriptions →
              </Link>
            </div>
          }
        >
          {subscription ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-sm font-semibold text-white/85">
                  {subscription.planName ?? subscription.planCode}
                </span>
                <SubscriptionStatusPill status={subscription.status} />
                {subscription.cancelAtPeriodEnd && (
                  <span className="inline-flex items-center rounded-md border border-white/8 bg-white/[0.02] px-1.5 py-0.5 text-[10px] text-white/35">
                    Set to end at period close
                  </span>
                )}
              </div>
              <dl className="grid gap-x-8 gap-y-1 divide-y divide-white/5 text-xs sm:grid-cols-3">
                <Fact label="Credits / period">{subscription.creditsPerPeriod.toLocaleString("en-GH")}</Fact>
                <Fact label="Period start">{formatDate(subscription.currentPeriodStart)}</Fact>
                <Fact label="Period end">{formatDate(subscription.currentPeriodEnd)}</Fact>
              </dl>
              <p className="text-[11px] leading-relaxed text-white/30">
                {subscription.status === "active"
                  ? "Active until the period end. Renewal is a new customer-approved checkout, not an automatic charge."
                  : subscription.status === "past_due"
                    ? "Past due: the credits are already granted; the next checkout is what renews it."
                    : "This plan no longer grants credits. A new checkout opens a fresh period."}
              </p>
            </div>
          ) : (
            <Empty>
              No subscription on record. Balances here come from signup credits and
              one-time top-ups, which do not create a period.
            </Empty>
          )}
        </Panel>

        <Panel
          id="campaigns"
          title="Campaigns"
          aside={
            <div className="flex items-center gap-3">
              <span className="text-[11px] tabular-nums text-white/30">
                {campaigns.total.toLocaleString("en-GH")} total
              </span>
              {user.email ? (
                <Link
                  href={`/admin/campaigns?query=${encodeURIComponent(user.email)}`}
                  className="inline-flex min-h-[44px] items-center px-1 text-[11px] font-medium text-amber-300/70 transition-colors hover:text-amber-200"
                >
                  All in campaigns →
                </Link>
              ) : null}
            </div>
          }
        >
          {campaigns.items.length === 0 ? (
            <Empty>No campaigns from this account yet.</Empty>
          ) : (
            <ul className="space-y-2">
              {campaigns.items.map((campaign) => {
                const ratio =
                  campaign.creditBudget > 0
                    ? Math.min(100, Math.round((campaign.creditsSpent / campaign.creditBudget) * 100))
                    : 0;
                return (
                  <li key={campaign.id}>
                    <Link
                      href={`/admin/campaigns/${campaign.id}`}
                      className="group block rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3 transition-colors hover:border-amber-400/20 hover:bg-white/[0.04]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white/80 group-hover:text-amber-100">
                            {campaign.title}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-white/30">
                            {campaign.goal} · {campaign.vertical} · {campaign.language}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="text-[11px] tabular-nums text-white/40">
                            {campaign.creditsSpent}/{campaign.creditBudget} credits
                          </span>
                          <CampaignStatusPill status={campaign.status} />
                        </div>
                      </div>
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <Pager
            page={campaigns.page}
            pages={campaigns.pages}
            total={campaigns.total}
            label="campaigns"
            basePath={`/admin/users/${id}`}
            pageParam="campaignsPage"
            params={pageParams}
            hash="campaigns"
            className="mt-3 rounded-xl border border-white/6"
          />
        </Panel>

        <Panel
          id="payments"
          title="Payments"
          aside={
            <span className="text-[11px] text-white/30">
              {payments.total.toLocaleString("en-GH")} on record · 10 per page
            </span>
          }
        >
          {payments.items.length === 0 ? (
            <Empty>
              No payments yet. Every balance here came from credits the
              database granted.
            </Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px] border-collapse text-left text-sm">
                <caption className="sr-only">Payments on this account</caption>
                <thead className="text-[10px] uppercase tracking-wider text-white/30">
                  <tr className="border-b border-white/6">
                    <th scope="col" className="px-2 py-2.5 font-semibold">Payment</th>
                    <th scope="col" className="px-2 py-2.5 font-semibold">Plan</th>
                    <th scope="col" className="px-2 py-2.5 text-right font-semibold">Amount</th>
                    <th scope="col" className="px-2 py-2.5 text-right font-semibold">Credits</th>
                    <th scope="col" className="px-2 py-2.5 font-semibold">Status</th>
                    <th scope="col" className="px-2 py-2.5 text-right font-semibold">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {payments.items.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-2 py-2.5 font-mono text-[10px] text-white/35">
                        {payment.id.slice(0, 8)}
                      </td>
                      <td className="px-2 py-2.5 text-xs capitalize text-white/65">{payment.planCode}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-white/70">
                        {payment.currency === "GHS"
                          ? formatGhs(payment.amountPesewas)
                          : `${payment.currency} ${(payment.amountPesewas / 100).toFixed(2)}`}
                      </td>
                      <td className="px-2 py-2.5 text-right tabular-nums text-white/45">
                        {payment.creditsGranted.toLocaleString("en-GH")}
                      </td>
                      <td className="px-2 py-2.5">
                        <PaymentStatusPill status={payment.status} />
                      </td>
                      <td
                        className="px-2 py-2.5 text-right text-[11px] text-white/35"
                        title={formatDateTime(payment.createdAt)}
                      >
                        {formatRelative(payment.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pager
            page={payments.page}
            pages={payments.pages}
            total={payments.total}
            label="payments"
            basePath={`/admin/users/${id}`}
            pageParam="paymentsPage"
            params={pageParams}
            hash="payments"
            className="mt-3 rounded-xl border border-white/6"
          />
        </Panel>

        <Panel
          id="activity"
          title="Staff activity"
          aside={
            <span className="text-[11px] text-white/30">
              {audit.total.toLocaleString("en-GH")} actions · newest first
            </span>
          }
        >
          {audit.items.length === 0 ? (
            <Empty>No staff action has touched this account.</Empty>
          ) : (
            <ol className="relative space-y-4 border-l border-white/8 pl-5">
              {audit.items.map((entry) => (
                <li key={entry.id} className="relative">
                  <span
                    className="absolute -left-[1.42rem] top-1.5 h-2 w-2 rounded-full bg-gradient-to-br from-amber-300 to-orange-500 ring-4 ring-[#080b16]"
                    aria-hidden="true"
                  />
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <p className="text-sm text-white/70">
                      <span className="font-medium text-white/85">
                        {entry.actorEmail ?? "Server script"}
                      </span>{" "}
                      · {auditActionLabel(entry.action)}
                    </p>
                    <time
                      dateTime={entry.createdAt}
                      title={formatDateTime(entry.createdAt)}
                      className="text-[11px] text-white/30"
                    >
                      {formatRelative(entry.createdAt)}
                    </time>
                  </div>
                  <p className="mt-0.5 text-[11px] text-white/40">{auditActionSummary(entry)}</p>
                </li>
              ))}
            </ol>
          )}
          <Pager
            page={audit.page}
            pages={audit.pages}
            total={audit.total}
            label="actions"
            basePath={`/admin/users/${id}`}
            pageParam="auditPage"
            params={pageParams}
            hash="activity"
            className="mt-3 rounded-xl border border-white/6"
          />
        </Panel>
      </DetailChrome>
    </div>
  );
}
