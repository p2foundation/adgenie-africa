import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Banknote,
  CircleAlert,
  Coins,
  Cpu,
  ReceiptText,
  Webhook,
} from "lucide-react";
import { CurveChart } from "@/components/charts/curve-chart";
import { Pager } from "@/components/pagination/pager";
import { PaymentRails } from "@/components/admin/payment-rails";
import { PaymentStatusPill } from "@/components/admin/status-pills";
import {
  readAdminEconomy,
  readPaymentReadiness,
  readSession,
} from "@/lib/session";
import {
  formatDateTime,
  formatGhs,
  formatRelative,
  formatUsdMicros,
} from "@/lib/format";

export const metadata: Metadata = { title: "Money" };

const shortDay = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[120px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 px-6 py-8 text-center">
      <p className="text-sm leading-relaxed text-white/35">{children}</p>
    </div>
  );
}

function pageOf(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function AdminEconomyPage({
  searchParams,
}: {
  searchParams: Promise<{ paymentsPage?: string; webhooksPage?: string }>;
}) {
  const params = await searchParams;
  const paymentsPage = pageOf(params.paymentsPage);
  const webhooksPage = pageOf(params.webhooksPage);

  const [session, data, readiness] = await Promise.all([
    readSession(),
    readAdminEconomy({ paymentsPage, webhooksPage }),
    // Manager-readable page, admin-only readiness: absence is not an error here.
    readPaymentReadiness().catch(() => null),
  ]);
  if (!session || !data) redirect("/dashboard");

  const { totals, plans, providers } = data;
  const pageParams = { paymentsPage, webhooksPage };
  const paymentAttention = totals.pendingPayments + totals.failedPayments;
  const providerCalls = providers.reduce((sum, provider) => sum + provider.calls, 0);
  const maxPlanRevenue = Math.max(...plans.map((plan) => plan.pesewas), 1);

  const revenuePoints = data.revenue.map((point) => ({
    label: shortDay.format(new Date(`${point.date}T00:00:00Z`)),
    value: point.pesewas,
  }));
  const aiPoints = data.aiSpend.map((point) => ({
    label: shortDay.format(new Date(`${point.date}T00:00:00Z`)),
    value: point.micros,
  }));
  const hasRevenue = revenuePoints.some((point) => point.value > 0);
  const hasAiSpend = aiPoints.some((point) => point.value > 0);

  const metrics = [
    {
      label: "Money in · 30 days",
      value: formatGhs(totals.revenue30dPesewas),
      note: `${formatGhs(totals.revenueAllPesewas)} since records began`,
      icon: Banknote,
      color: "text-emerald-300",
      bg: "bg-emerald-400/10",
    },
    {
      label: "Credits spent · 30 days",
      value: totals.creditsSpent30d.toLocaleString("en-GH"),
      note: `${totals.creditsSold30d.toLocaleString("en-GH")} sold in the same window`,
      icon: Coins,
      color: "text-amber-300",
      bg: "bg-amber-400/10",
    },
    {
      label: "AI spend · 30 days",
      value: formatUsdMicros(totals.aiCost30dMicros),
      note: `${providerCalls.toLocaleString("en-GH")} provider ${providerCalls === 1 ? "call" : "calls"} logged`,
      icon: Cpu,
      color: "text-violet-300",
      bg: "bg-violet-400/10",
    },
    {
      label: "Payments needing attention",
      value: String(paymentAttention),
      note:
        paymentAttention > 0
          ? `${totals.pendingPayments} pending · ${totals.failedPayments} failed`
          : "Nothing stuck in the pipe",
      icon: CircleAlert,
      color: paymentAttention > 0 ? "text-rose-300" : "text-emerald-300",
      bg: paymentAttention > 0 ? "bg-rose-400/10" : "bg-emerald-400/10",
    },
  ];

  return (
    <div className="shell-wide space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 animate-in">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-400">
            Money
          </p>
          <h1 className="font-display text-3xl font-bold leading-[1.05] tracking-tight text-white md:text-[2.6rem]">
            The economics,
            <br />
            <span className="gradient-text-hero glow-text-gold">without the fog.</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/50">
            What came in, what went to providers, and what is still moving.
            Revenue is successful GHS payments; AI spend is what providers billed.
          </p>
        </div>
        <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3 text-right">
          <p className="text-[10px] uppercase tracking-widest text-white/30">Active subscriptions</p>
          <p className="font-display text-2xl font-bold tabular-nums text-white/85">
            {totals.activeSubscriptions}
          </p>
          <p className="text-[10px] text-white/25">counted live, not prorated</p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="glass-card rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <dt className="text-[10px] uppercase tracking-wider text-white/35">{metric.label}</dt>
                <span className={`rounded-lg p-1.5 ${metric.bg}`}>
                  <Icon className={`h-3.5 w-3.5 ${metric.color}`} />
                </span>
              </div>
              <dd className={`mt-2 font-display text-2xl font-bold tabular-nums leading-none ${metric.color}`}>
                {metric.value}
              </dd>
              <p className="mt-1.5 text-[10px] leading-snug text-white/30">{metric.note}</p>
            </div>
          );
        })}
      </dl>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="glass-card rounded-2xl p-5 md:p-6" aria-labelledby="revenue-title">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 id="revenue-title" className="font-display text-lg font-semibold text-white">
                Money in
              </h2>
              <p className="mt-0.5 text-xs text-white/35">Successful payments, last 14 days</p>
            </div>
            <p className="font-display text-xl font-bold tabular-nums text-emerald-300">
              {formatGhs(totals.revenue30dPesewas)}
            </p>
          </div>
          {hasRevenue ? (
            <CurveChart
              points={revenuePoints}
              tone="green"
              ariaLabel="Daily revenue for the last 14 days"
              valueFormat="ghs-pesewas"
            />
          ) : (
            <EmptyNote>
              No successful payment has landed yet. Settled charges appear here.
            </EmptyNote>
          )}
        </section>

        <section className="glass-card rounded-2xl p-5 md:p-6" aria-labelledby="ai-title">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 id="ai-title" className="font-display text-lg font-semibold text-white">
                AI spend
              </h2>
              <p className="mt-0.5 text-xs text-white/35">Provider cost, last 14 days</p>
            </div>
            <p className="font-display text-xl font-bold tabular-nums text-violet-300">
              {formatUsdMicros(totals.aiCost30dMicros)}
            </p>
          </div>
          {hasAiSpend ? (
            <CurveChart
              points={aiPoints}
              tone="violet"
              ariaLabel="Daily provider AI cost for the last 14 days"
              valueFormat="usd-micros"
            />
          ) : (
            <EmptyNote>No provider calls have been billed against a campaign yet.</EmptyNote>
          )}
        </section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="glass-card rounded-2xl p-5 md:p-6" aria-labelledby="plans-title">
          <h2 id="plans-title" className="font-display text-lg font-semibold text-white">
            What people buy
          </h2>
          <p className="mt-0.5 text-xs text-white/35">Successful payments by plan</p>
          {plans.length === 0 ? (
            <div className="mt-4">
              <EmptyNote>No plan has been paid for yet.</EmptyNote>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {plans.map((plan) => (
                <li key={plan.planCode}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm capitalize text-white/75">{plan.planCode}</p>
                    <p className="text-xs tabular-nums text-white/40">
                      {plan.payments} {plan.payments === 1 ? "payment" : "payments"} ·{" "}
                      {plan.credits.toLocaleString("en-GH")} credits
                    </p>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500"
                        style={{ width: `${Math.max(3, Math.round((plan.pesewas / maxPlanRevenue) * 100))}%` }}
                      />
                    </div>
                    <span className="w-24 shrink-0 text-right text-xs tabular-nums text-emerald-300/90">
                      {formatGhs(plan.pesewas)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="glass-card rounded-2xl p-5 md:p-6" aria-labelledby="providers-title">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="providers-title" className="font-display text-lg font-semibold text-white">
                Where AI money goes
              </h2>
              <p className="mt-0.5 text-xs text-white/35">Provider and call type, all time</p>
            </div>
            <p className="font-display text-lg font-bold tabular-nums text-white/70">
              {formatUsdMicros(providers.reduce((sum, provider) => sum + provider.micros, 0))}
            </p>
          </div>
          {providers.length === 0 ? (
            <div className="mt-4">
              <EmptyNote>No provider cost has been recorded yet.</EmptyNote>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[360px] border-collapse text-left text-sm">
                <caption className="sr-only">AI provider cost by provider and call type</caption>
                <thead className="text-[10px] uppercase tracking-wider text-white/30">
                  <tr className="border-b border-white/6">
                    <th scope="col" className="px-2 py-2 font-semibold">Provider</th>
                    <th scope="col" className="px-2 py-2 font-semibold">Call</th>
                    <th scope="col" className="px-2 py-2 text-right font-semibold">Calls</th>
                    <th scope="col" className="px-2 py-2 text-right font-semibold">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {providers.map((provider) => (
                    <tr key={`${provider.provider}-${provider.callType}`}>
                      <td className="px-2 py-2 text-xs capitalize text-white/65">{provider.provider}</td>
                      <td className="px-2 py-2 text-xs capitalize text-white/40">{provider.callType}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-white/45">{provider.calls}</td>
                      <td className="px-2 py-2 text-right tabular-nums text-white/70">
                        {formatUsdMicros(provider.micros)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <PaymentRails readiness={readiness} />

      <section
        id="payments"
        className="glass-card scroll-mt-24 rounded-2xl p-5 md:p-6"
        aria-labelledby="payments-title"
      >        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="payments-title" className="flex items-center gap-2 font-display text-lg font-semibold text-white">
              <ReceiptText className="h-4 w-4 text-amber-400/80" />
              Payments
            </h2>
            <p className="mt-0.5 text-xs text-white/35">
              {data.payments.total.toLocaleString("en-GH")} on record, any status
            </p>
          </div>
          {paymentAttention > 0 && (
            <p className="rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-2.5 py-1 text-[11px] text-amber-200">
              {totals.pendingPayments} pending · {totals.failedPayments} failed
            </p>
          )}
        </div>

        {data.payments.items.length === 0 ? (
          <EmptyNote>
            No payment has been attempted. Balances still come from
            database-granted credits.
          </EmptyNote>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-left text-sm">
              <caption className="sr-only">Latest payments with account, plan and status</caption>
              <thead className="text-[10px] uppercase tracking-wider text-white/30">
                <tr className="border-b border-white/6">
                  <th scope="col" className="px-2 py-2.5 font-semibold">Who</th>
                  <th scope="col" className="px-2 py-2.5 font-semibold">Payment</th>
                  <th scope="col" className="px-2 py-2.5 font-semibold">Plan</th>
                  <th scope="col" className="px-2 py-2.5 text-right font-semibold">Amount</th>
                  <th scope="col" className="px-2 py-2.5 text-right font-semibold">Credits</th>
                  <th scope="col" className="px-2 py-2.5 font-semibold">Status</th>
                  <th scope="col" className="px-2 py-2.5 text-right font-semibold">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.payments.items.map((payment) => (
                  <tr key={payment.id}>
                    <td className="max-w-[15rem] px-2">
                      {payment.email ? (
                        <Link
                          href={`/admin/users?query=${encodeURIComponent(payment.email)}`}
                          className="flex min-h-[44px] items-center truncate text-xs text-white/65 transition-colors hover:text-amber-200"
                        >
                          {payment.email}
                        </Link>
                      ) : (
                        <span className="text-xs text-white/25">unknown account</span>
                      )}
                    </td>
                    <td className="px-2 py-2.5 font-mono text-[10px] text-white/30">
                      {payment.id.slice(0, 8)}
                    </td>
                    <td className="px-2 py-2.5 text-xs capitalize text-white/50">{payment.planCode}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-white/70">
                      {payment.currency === "GHS"
                        ? formatGhs(payment.amountPesewas)
                        : `${payment.currency} ${(payment.amountPesewas / 100).toFixed(2)}`}
                    </td>
                    <td className="px-2 py-2.5 text-right tabular-nums text-white/40">
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
          page={data.payments.page}
          pages={data.payments.pages}
          total={data.payments.total}
          label="payments"
          basePath="/admin/economy"
          pageParam="paymentsPage"
          params={pageParams}
          hash="payments"
          className="mt-3 rounded-xl border border-white/6"
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section
          id="webhooks"
          className="glass-card scroll-mt-24 rounded-2xl p-5 md:p-6"
          aria-labelledby="webhooks-title"
        >
          <h2 id="webhooks-title" className="flex items-center gap-2 font-display text-lg font-semibold text-white">
            <Webhook className="h-4 w-4 text-sky-400/80" />
            Webhook deliveries
          </h2>
          <p className="mt-0.5 text-xs text-white/35">
            {data.webhooks.total.toLocaleString("en-GH")} processed events
          </p>
          {data.webhooks.items.length === 0 ? (
            <div className="mt-4">
              <EmptyNote>No provider has called the webhook yet.</EmptyNote>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-white/5">
              {data.webhooks.items.map((event) => (
                <li key={event.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[11px] text-white/60">{event.eventType}</p>
                    <p className="text-[10px] text-white/25">{event.id.slice(0, 8)}</p>
                  </div>
                  <time
                    dateTime={event.processedAt}
                    title={formatDateTime(event.processedAt)}
                    className="shrink-0 text-[11px] text-white/35"
                  >
                    {formatRelative(event.processedAt)}
                  </time>
                </li>
              ))}
            </ul>
          )}
          <Pager
            page={data.webhooks.page}
            pages={data.webhooks.pages}
            total={data.webhooks.total}
            label="events"
            basePath="/admin/economy"
            pageParam="webhooksPage"
            params={pageParams}
            hash="webhooks"
            className="mt-3 rounded-xl border border-white/6"
          />
        </section>

        <section className="glass-card rounded-2xl p-5 md:p-6" aria-labelledby="spenders-title">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="spenders-title" className="font-display text-lg font-semibold text-white">
              Top spenders
            </h2>
            <Link
              href="/admin/users"
              className="inline-flex min-h-[44px] items-center px-1 text-[11px] font-medium text-amber-300/70 transition-colors hover:text-amber-200"
            >
              All clients →
            </Link>
          </div>
          <p className="mt-0.5 text-xs text-white/35">Credits consumed, all time</p>
          {data.topSpenders.length === 0 ? (
            <div className="mt-4">
              <EmptyNote>No credits have been consumed yet.</EmptyNote>
            </div>
          ) : (
            <ol className="mt-4 space-y-2">
              {data.topSpenders.map((spender, index) => (
                <li
                  key={spender.userId}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/6 bg-white/[0.02] px-3 py-1"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-5 shrink-0 text-center font-display text-xs font-bold tabular-nums text-white/25">
                      {index + 1}
                    </span>
                    <Link
                      href={`/admin/users/${spender.userId}`}
                      className="flex min-h-[44px] items-center truncate text-xs text-white/65 transition-colors hover:text-amber-200"
                    >
                      {spender.email ?? spender.userId.slice(0, 8)}
                    </Link>
                  </div>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-amber-200/90">
                    {spender.credits.toLocaleString("en-GH")}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
