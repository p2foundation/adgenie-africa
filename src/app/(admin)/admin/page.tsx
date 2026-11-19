import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Coins,
  Flag,
  ReceiptText,
  ShieldCheck,
  TriangleAlert,
  Users,
  Wallet,
} from "lucide-react";
import { roleAtLeast, type AppRole } from "@adgenie/core";
import { CurveChart } from "@/components/charts/curve-chart";
import { FlowBars } from "@/components/charts/flow-bars";
import { Pager } from "@/components/pagination/pager";
import { RoleBadge, roleLabel } from "@/components/admin/role-badge";
import { auditActionLabel, auditActionSummary } from "@/lib/audit";
import { readAdminAudit, readAdminOverview, readSession } from "@/lib/session";
import { formatDateTime, formatGhs, formatRelative, formatUsdMicros } from "@/lib/format";
import type { CampaignStatus } from "@/lib/api";

export const metadata: Metadata = { title: "Overview" };

const shortDay = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const ROLE_ORDER: AppRole[] = ["root", "super_admin", "admin", "manager", "user"];
const ROLE_BAR: Record<AppRole, string> = {
  root: "bg-amber-400",
  super_admin: "bg-violet-400",
  admin: "bg-sky-400",
  manager: "bg-teal-400",
  user: "bg-white/20",
};

const PIPELINE: { key: CampaignStatus; label: string; bar: string }[] = [
  { key: "draft", label: "Draft", bar: "bg-white/25" },
  { key: "planned", label: "Planned", bar: "bg-sky-400" },
  { key: "running", label: "Running", bar: "bg-amber-400" },
  { key: "done", label: "Done", bar: "bg-emerald-400" },
  { key: "failed", label: "Failed", bar: "bg-rose-400" },
  { key: "cancelled", label: "Cancelled", bar: "bg-white/10" },
];

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[140px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 px-6 py-8 text-center">
      <p className="text-sm text-white/35">{children}</p>
    </div>
  );
}

const DECISIONS_PER_PAGE = 5;

export default async function AdminOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ decisions?: string }>;
}) {
  const [session, overview, params] = await Promise.all([
    readSession(),
    readAdminOverview(),
    searchParams,
  ]);
  if (!session || !overview) redirect("/dashboard");

  const requested = Number.parseInt(params.decisions ?? "1", 10);
  const decisionsPage = Number.isFinite(requested) && requested > 0 ? requested : 1;
  const decisions = overview.auditVisible
    ? await readAdminAudit({ page: decisionsPage, limit: DECISIONS_PER_PAGE })
    : null;
  const recentDecisions = decisions?.items ?? overview.recentAudit;

  const { totals, queues, pipeline, roles } = overview;
  const verifiedShare = totals.users > 0 ? Math.round((totals.verified / totals.users) * 100) : 0;
  const staffCount = roles.manager + roles.admin + roles.super_admin + roles.root;
  const pipelineTotal = Object.values(pipeline).reduce((sum, count) => sum + count, 0);
  const attention =
    queues.kycWaiting +
    queues.failedGenerations +
    queues.pendingPayments +
    queues.failedPayments +
    queues.openFlags;
  const paymentsToWatch = queues.pendingPayments + queues.failedPayments;

  const actions = [
    {
      href: "/admin/kyc",
      label: "Verification",
      count: queues.kycWaiting,
      note:
        queues.kycWaiting > 0
          ? `Oldest sent ${formatRelative(queues.kycOldestSubmittedAt)}`
          : "No one is waiting",
      icon: ShieldCheck,
      tone: "border-amber-400/20 bg-amber-400/[0.06] text-amber-300",
    },
    {
      href: "/admin/campaigns?health=failed",
      label: "Failed work",
      count: queues.failedGenerations,
      note:
        queues.failedGenerations > 0
          ? "Generations the worker gave up on"
          : "No failed generations",
      icon: TriangleAlert,
      tone: "border-rose-400/20 bg-rose-400/[0.06] text-rose-300",
    },
    {
      href: "/admin/economy#payments",
      label: "Payment follow-up",
      count: paymentsToWatch,
      note:
        paymentsToWatch > 0
          ? `${queues.pendingPayments} pending · ${queues.failedPayments} failed`
          : "No payment needs a nudge",
      icon: ReceiptText,
      tone: "border-violet-400/20 bg-violet-400/[0.06] text-violet-300",
    },
    {
      href: "/admin/campaigns",
      label: "Content flags",
      count: queues.openFlags,
      note: queues.openFlags > 0 ? "Open reports on campaigns" : "No open reports",
      icon: Flag,
      tone: "border-sky-400/20 bg-sky-400/[0.06] text-sky-300",
    },
  ];

  const metrics = [
    {
      label: "Money in · 30 days",
      value: formatGhs(totals.revenue30dPesewas),
      note:
        totals.revenue30dPesewas > 0
          ? "Settled mobile money and card payments"
          : "No settled payment yet",
      icon: Wallet,
      color: "text-emerald-300",
      bg: "bg-emerald-400/10",
    },
    {
      label: "Credits spent · 14 days",
      value: totals.spent14d.toLocaleString("en-GH"),
      note: `${totals.spenders7d} ${totals.spenders7d === 1 ? "creator" : "creators"} spending this week`,
      icon: Coins,
      color: "text-amber-300",
      bg: "bg-amber-400/10",
    },
    {
      label: "AI spend · 30 days",
      value: formatUsdMicros(totals.aiCost30dMicros),
      note: totals.aiCost30dMicros > 0 ? "Logged provider calls" : "No provider calls logged",
      icon: ReceiptText,
      color: "text-sky-300",
      bg: "bg-sky-400/10",
    },
    {
      label: "Accounts",
      value: totals.users.toLocaleString("en-GH"),
      note: `${verifiedShare}% verified · +${totals.new7d} this week`,
      icon: Users,
      color: "text-violet-300",
      bg: "bg-violet-400/10",
    },
  ];

  const signupPoints = overview.signups.map((point) => ({
    label: shortDay.format(new Date(`${point.date}T00:00:00Z`)),
    value: point.count,
  }));
  const spendPoints = overview.spend.map((point) => ({
    label: shortDay.format(new Date(`${point.date}T00:00:00Z`)),
    value: point.credits,
  }));
  const revenuePoints = overview.revenue.map((point) => ({
    label: shortDay.format(new Date(`${point.date}T00:00:00Z`)),
    value: point.pesewas,
  }));
  const revenue14d = overview.revenue.reduce((sum, point) => sum + point.pesewas, 0);

  return (
    <div className="shell-wide space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4 animate-in">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-400">
            Staff overview
          </p>
          <h1 className="font-display text-3xl font-bold leading-[1.05] tracking-tight text-white md:text-[2.6rem]">
            The whole hive,
            <br />
            <span className="gradient-text-hero glow-text-gold">one screen.</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/50 md:text-base">
            {attention > 0
              ? `${attention} ${attention === 1 ? "thing needs" : "things need"} a human. Everything else is moving.`
              : "Nothing is waiting on a human. The hive is moving on its own."}{" "}
            <span className="text-white/30">
              Updated {formatDateTime(overview.generatedAt)} UTC.
            </span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/campaigns"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white/70 transition-colors hover:border-amber-400/30 hover:text-amber-300 touch-target"
          >
            Campaigns
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-white/70 transition-colors hover:border-amber-400/30 hover:text-amber-300 touch-target"
          >
            Clients
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <section aria-labelledby="attention-title">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 id="attention-title" className="text-xs font-semibold uppercase tracking-[0.18em] text-white/35">
            Needs you now
          </h2>
          <p className="text-[11px] text-white/25">
            {attention > 0 ? "Start here" : "All clear"}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          {actions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="group glass-card relative overflow-hidden rounded-2xl p-4 transition-colors hover:border-white/15 md:p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border ${action.tone}`}
                >
                  <action.icon className="h-4 w-4" />
                </span>
                <ArrowUpRight className="h-4 w-4 text-white/15 transition-colors group-hover:text-amber-300/70" />
              </div>
              <p className="mt-4 font-display text-3xl font-bold leading-none tabular-nums text-white">
                {action.count}
              </p>
              <p className="mt-1.5 text-xs font-medium text-white/60">{action.label}</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-white/25">
                {action.note}
              </p>
              {action.count === 0 && (
                <span className="absolute right-4 top-[3.6rem] h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
              )}
            </Link>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="glass-card rounded-2xl p-4 md:p-5">
            <div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-xl ${metric.bg}`}>
              <metric.icon className={`h-4 w-4 ${metric.color}`} />
            </div>
            <div className="font-display text-3xl font-bold leading-none text-white">
              {metric.value}
            </div>
            <div className="mt-1.5 text-xs text-white/40">{metric.label}</div>
            <div className="mt-0.5 text-[11px] text-white/25">{metric.note}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="glass-card rounded-2xl p-5 md:p-6 lg:col-span-3" aria-labelledby="revenue-title">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 id="revenue-title" className="font-display text-lg font-semibold text-white">
                Money in
              </h2>
              <p className="mt-0.5 text-xs text-white/35">Successful payments, last 14 days</p>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl font-bold leading-none text-white">
                {formatGhs(revenue14d)}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-white/30">14 days</p>
            </div>
          </div>
          {revenue14d > 0 ? (
            <CurveChart
              points={revenuePoints}
              tone="green"
              height={190}
              ariaLabel="Revenue per day for the last 14 days"
              valueFormat="ghs-pesewas"
            />
          ) : (
            <EmptyNote>
              No settled payment yet. Every cedi that lands will be charted here.
            </EmptyNote>
          )}
        </section>

        <section className="glass-card rounded-2xl p-5 md:p-6 lg:col-span-2" aria-labelledby="spend-title">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 id="spend-title" className="font-display text-lg font-semibold text-white">
                Credits spent
              </h2>
              <p className="mt-0.5 text-xs text-white/35">Daily debits, last 14 days</p>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl font-bold leading-none text-white">
                {totals.spent14d.toLocaleString("en-GH")}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-white/30">total</p>
            </div>
          </div>
          {totals.spent14d > 0 ? (
            <FlowBars
              points={spendPoints}
              tone="gold"
              ariaLabel="Credits spent per day for the last 14 days"
              className="pt-2"
            />
          ) : (
            <EmptyNote>Nothing has been generated yet. Spend appears here the first time work runs.</EmptyNote>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="glass-card rounded-2xl p-5 md:p-6 lg:col-span-2" aria-labelledby="pipeline-title">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 id="pipeline-title" className="font-display text-lg font-semibold text-white">
                Campaign pipeline
              </h2>
              <p className="mt-0.5 text-xs text-white/35">
                {pipelineTotal} {pipelineTotal === 1 ? "campaign" : "campaigns"} on the bench
              </p>
            </div>
            <Link
              href="/admin/campaigns"
              className="inline-flex min-h-[44px] items-center gap-1 px-1 text-xs font-semibold text-amber-300 hover:text-amber-200"
            >
              Open
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mb-4 flex h-2.5 overflow-hidden rounded-full bg-white/5" aria-hidden="true">
            {PIPELINE.map((stage) =>
              pipeline[stage.key] > 0 ? (
                <span
                  key={stage.key}
                  className={stage.bar}
                  style={{ width: `${(pipeline[stage.key] / Math.max(pipelineTotal, 1)) * 100}%` }}
                />
              ) : null
            )}
          </div>

          <ul className="grid grid-cols-2 gap-2">
            {PIPELINE.map((stage) => (
              <li key={stage.key}>
                <Link
                  href={`/admin/campaigns?status=${stage.key}`}
                  className="flex min-h-[44px] items-center justify-between gap-2 rounded-lg border border-transparent px-2 py-1.5 text-[11px] text-white/40 transition-colors hover:border-white/8 hover:bg-white/[0.03] hover:text-white/70"
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${stage.bar}`} />
                    {stage.label}
                  </span>
                  <span className="font-semibold tabular-nums text-white/70">
                    {pipeline[stage.key]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="glass-card rounded-2xl p-5 md:p-6 lg:col-span-3" aria-labelledby="signups-title">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 id="signups-title" className="font-display text-lg font-semibold text-white">
                New accounts
              </h2>
              <p className="mt-0.5 text-xs text-white/35">Daily registrations, last 14 days</p>
            </div>
            <div className="text-right">
              <p className="font-display text-2xl font-bold leading-none text-white">{totals.new7d}</p>
              <p className="text-[10px] uppercase tracking-wider text-white/30">this week</p>
            </div>
          </div>
          {signupPoints.some((point) => point.value > 0) ? (
            <CurveChart
              points={signupPoints}
              tone="violet"
              height={190}
              ariaLabel="New accounts per day for the last 14 days"
              empty={<p className="text-sm text-white/35">No registrations in this window.</p>}
            />
          ) : (
            <EmptyNote>No registrations in this window.</EmptyNote>
          )}
        </section>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        <section className="glass-card rounded-2xl p-5 md:p-6 lg:col-span-2" aria-labelledby="team-title">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 id="team-title" className="font-display text-lg font-semibold text-white">
                Staff &amp; roles
              </h2>
              <p className="mt-0.5 text-xs text-white/35">
                {staffCount} {staffCount === 1 ? "person" : "people"} can open this room
              </p>
            </div>
            {roleAtLeast(session.appRole, "admin") && (
              <Link
                href="/admin/users"
                className="inline-flex min-h-[44px] items-center gap-1 px-1 text-xs font-semibold text-amber-300 hover:text-amber-200"
              >
                Manage roles
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          <div className="mb-5 flex h-2 overflow-hidden rounded-full bg-white/5" aria-hidden="true">
            {ROLE_ORDER.map((role) =>
              roles[role] > 0 ? (
                <span
                  key={role}
                  className={ROLE_BAR[role]}
                  style={{ width: `${totals.users > 0 ? (roles[role] / totals.users) * 100 : 0}%` }}
                />
              ) : null
            )}
          </div>

          <ul className="mb-5 flex flex-wrap gap-x-5 gap-y-2">
            {ROLE_ORDER.map((role) => (
              <li key={role} className="flex items-center gap-1.5 text-[11px] text-white/40">
                <span className={`h-1.5 w-1.5 rounded-full ${ROLE_BAR[role]}`} />
                {roleLabel(role)}
                <span className="font-semibold text-white/70">{roles[role]}</span>
              </li>
            ))}
          </ul>

          {overview.staff.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/35">
              No staff yet. Promote the first account with{" "}
              <code className="text-amber-300/80">node scripts/admin.mjs</code>.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {overview.staff.map((person) => (
                <li key={person.id} className="flex items-center gap-3 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400/80 to-orange-500/80 text-xs font-bold text-black">
                    {(person.displayName?.trim() || person.email || "A").charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/admin/users/${person.id}`}
                      className="relative block truncate text-sm font-medium text-white/85 transition-colors before:absolute before:-inset-y-3 before:inset-x-0 before:content-[''] hover:text-amber-200"
                    >
                      {person.displayName ?? "Unnamed"}
                    </Link>
                    <p className="truncate text-[11px] text-white/35">{person.email}</p>
                  </div>
                  <span className="hidden text-[11px] text-white/30 sm:block" title={person.lastSignInAt ?? undefined}>
                    {formatRelative(person.lastSignInAt)}
                  </span>
                  <RoleBadge role={person.appRole} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          id="decisions"
          className="glass-card scroll-mt-24 rounded-2xl p-5 md:p-6 lg:sticky lg:top-24"
          aria-labelledby="audit-title"
        >
          <div className="mb-4">
            <h2 id="audit-title" className="font-display text-lg font-semibold text-white">
              {overview.auditVisible ? "Recent decisions" : "Your lane"}
            </h2>
            <p className="mt-0.5 text-xs text-white/35">
              {overview.auditVisible
                ? "Roles and verification, newest first"
                : "Managers see the hive; admins change access"}
            </p>
          </div>

          {!overview.auditVisible && (
            <div className="space-y-3 rounded-xl border border-white/8 bg-white/[0.02] p-4 text-sm leading-relaxed text-white/45">
              <p>You can watch accounts, campaigns and spend.</p>
              <p>
                Changing a role, and the audit log behind it, needs an admin or
                above. Ask one of the staff listed here.
              </p>
            </div>
          )}

          {overview.auditVisible && recentDecisions.length === 0 && (
            <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-white/35">
              No decisions yet.
            </p>
          )}

          {overview.auditVisible && recentDecisions.length > 0 && (
            <>
              <ul className="space-y-3">
                {recentDecisions.map((entry) => (
                  <li key={entry.id} className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] uppercase tracking-wider text-white/30">
                        {auditActionLabel(entry.action)}
                      </p>
                      {entry.targetEmail && entry.action.startsWith("kyc_") && (
                        <CheckCircle2 className="h-3 w-3 text-emerald-400/60" />
                      )}
                    </div>
                    <p className="mt-1 text-xs text-white/60">
                      <span className="font-medium text-white/85">{entry.actorEmail ?? "System"}</span>{" "}
                      <span className="text-white/80">{entry.targetEmail ?? "an account"}</span>
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-white/35">
                      {auditActionSummary(entry)}
                      <span className="ml-2 text-white/20">{formatRelative(entry.createdAt)}</span>
                    </p>
                  </li>
                ))}
              </ul>
              {decisions && (
                <Pager
                  page={decisions.page}
                  pages={decisions.pages}
                  total={decisions.total}
                  label="decisions"
                  basePath="/admin"
                  pageParam="decisions"
                  hash="decisions"
                  className="mt-5 border-white/5 px-0 pb-0"
                />
              )}
            </>
          )}

          {overview.auditVisible && (
            <Link
              href="/admin/audit"
              className="mt-1 inline-flex min-h-[44px] items-center gap-1 px-1 text-xs font-semibold text-amber-300 hover:text-amber-200"
            >
              Full audit log
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </section>
      </div>

      <p className="pb-2 text-center text-[11px] text-white/20">
        You are {roleLabel(session.appRole)} · the API re-checks your role on every
        request · every change is logged
      </p>
    </div>
  );
}
