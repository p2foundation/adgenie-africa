import { type Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, CreditCard, ReceiptText } from "lucide-react";
import { formatGhs } from "@adgenie/core";
import { Pager } from "@/components/pagination/pager";
import { AccountSummary } from "@/components/settings/account-summary";
import { ProfileForm } from "@/components/settings/profile-form";
import { BrandKitForm } from "@/components/settings/brand-kit-form";
import { PasswordForm } from "@/components/settings/password-form";
import { PushSettings } from "@/components/settings/push-settings";
import { SettingsChrome } from "@/components/settings/settings-chrome";
import { formatDate } from "@/lib/format";
import {
  readBalance,
  readBilling,
  readBrandKit,
  readPushConfig,
  readSession,
} from "@/lib/session";
import type { StudioVertical } from "@/lib/studio";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Account & settings" };

const PLAN_LABEL: Record<string, string> = {
  starter: "Starter",
  growth: "Growth",
  business: "Business",
  topup: "Top-up",
};

const PAYMENT_STATUS: Record<string, { label: string; className: string }> = {
  success: {
    label: "Paid",
    className: "border-teal-400/20 bg-teal-500/10 text-teal-200/85",
  },
  pending: {
    label: "Pending",
    className: "border-amber-400/20 bg-amber-500/10 text-amber-200/85",
  },
  failed: {
    label: "Failed",
    className: "border-rose-400/20 bg-rose-500/10 text-rose-200/85",
  },
  refunded: {
    label: "Refunded",
    className: "border-white/10 bg-white/5 text-white/45",
  },
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const [profile, kit, billingData, balance, pushConfig] = await Promise.all([
    readSession(),
    readBrandKit(),
    readBilling({ page }),
    readBalance(),
    readPushConfig(),
  ]);
  // Same reasoning as library/page.tsx: a null profile is a dead session, and
  // notFound() here would race the layout's redirect in the flight stream.
  if (!profile) redirect("/sign-in");

  const billing = billingData ?? {
    subscription: null,
    paidPesewas: 0,
    payments: { total: 0, page: 1, limit: 12, pages: 1, items: [] },
  };
  const paidTotal = billing.paidPesewas;
  const planLabel = billing.subscription
    ? PLAN_LABEL[billing.subscription.planCode] ?? billing.subscription.planCode
    : "Pay as you go";
  const studioVertical = (
    ["seller", "company", "fashion", "spot"].includes(profile.vertical ?? "")
      ? profile.vertical
      : "seller"
  ) as StudioVertical;

  return (
    <div className="shell-wide space-y-8">
      <div className="animate-in">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-400">
          Account &amp; settings
        </p>
        <h1 className="font-display text-3xl font-bold leading-[1.05] tracking-tight text-white md:text-[2.6rem]">
          Your account,
          <br />
          <span className="gradient-text-hero glow-text-gold">your rules.</span>
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/50 md:text-base">
          Your name, your voice, your colours and the money trail — kept on one
          page you control.
        </p>
      </div>

      <SettingsChrome
        email={profile.email}
        displayName={profile.displayName}
        roleLabel={
          profile.appRole === "user" ? "Client account" : "Staff account"
        }
        credits={balance}
        planLabel={planLabel}
        memberSince={formatDate(profile.createdAt)}
      >
        <AccountSummary
          profile={profile}
          balance={balance}
          planLabel={planLabel}
          subscription={billing.subscription}
        />
        <ProfileForm profile={profile} />
        <BrandKitForm
          kit={kit}
          vertical={studioVertical}
          country={profile.country}
          language={profile.language}
        />
        <PasswordForm email={profile.email} />
        <PushSettings
          config={
            pushConfig ?? {
              enabled: false,
              reason: "server_missing",
              config: null,
              vapidKey: null,
            }
          }
        />

        <section
            id="billing"
            className="glass-card scroll-mt-[calc(208px_+_env(safe-area-inset-top))] overflow-hidden rounded-2xl lg:scroll-mt-24"
            aria-labelledby="billing-title"
          >
            <div className="flex items-center gap-3 border-b border-white/6 px-5 py-4 md:px-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300">
                <ReceiptText className="h-4 w-4" />
              </span>
              <div>
                <h2 id="billing-title" className="font-display text-sm font-semibold text-white">
                  Billing
                </h2>
                <p className="mt-0.5 text-[11px] text-white/50">
                  Your plan and every payment on record.
                </p>
              </div>
              <Link
                href="/credits"
                className="touch-target ml-auto inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-white/10 px-3 text-[11px] text-amber-300/80 transition-colors hover:border-amber-400/30 hover:text-amber-200"
              >
                Plans
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-4 p-5 md:p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                  <p className="text-[11px] uppercase tracking-widest text-white/45">
                    Current plan
                  </p>
                  <p className="mt-1.5 font-display text-lg font-semibold text-white/90">
                    {billing.subscription
                      ? PLAN_LABEL[billing.subscription.planCode] ??
                        billing.subscription.planCode
                      : "Pay as you go"}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-white/50">
                    {billing.subscription
                      ? billing.subscription.status === "active"
                        ? `${billing.subscription.creditsPerPeriod} credits · runs until ${formatDate(
                            billing.subscription.currentPeriodEnd
                          )}${billing.subscription.cancelAtPeriodEnd ? " · will not renew" : ""}`
                        : `${billing.subscription.creditsPerPeriod} credits · ${billing.subscription.status.replace("_", " ")} — pay again to restart the period`
                      : "No monthly plan. Buy credits when you need them."}
                  </p>
                </div>
                <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                  <p className="text-[11px] uppercase tracking-widest text-white/45">
                    Paid to date
                  </p>
                  <p className="mt-1.5 font-display text-lg font-semibold text-white/90 tabular-nums">
                    {paidTotal > 0 ? formatGhs(paidTotal) : "—"}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-white/50">
                    {billing.payments.total > 0
                      ? `${billing.payments.total} payment${
                          billing.payments.total === 1 ? "" : "s"
                        } on record`
                      : "No payments on record yet."}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-white/8">
                <div className="flex items-center justify-between gap-3 border-b border-white/6 bg-white/[0.02] px-4 py-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-white/50">
                    Payment history
                  </p>
                  <span className="text-[11px] tabular-nums text-white/45">
                    {billing.payments.total}
                  </span>
                </div>

                {billing.payments.total > 0 ? (
                  <ul className="divide-y divide-white/4">
                    {billing.payments.items.map((payment) => {
                      const status = PAYMENT_STATUS[payment.status];
                      return (
                        <li
                          key={payment.id}
                          className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3.5"
                        >
                          <div className="min-w-0">
                            <p className="text-sm text-white/80">
                              {PLAN_LABEL[payment.planCode] ?? payment.planCode}
                            </p>
                            <p className="mt-0.5 text-[11px] text-white/50">
                              {formatDate(payment.createdAt)}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2.5">
                            <span className="text-sm tabular-nums text-white/70">
                              {formatGhs(payment.amountPesewas)}
                            </span>
                            <span className="text-sm tabular-nums text-amber-300/80">
                              +{payment.creditsGranted}
                              <span className="text-[11px] text-white/50"> cr</span>
                            </span>
                            <span
                              className={cn(
                                "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium",
                                status?.className ?? "border-white/10 text-white/40"
                              )}
                            >
                              {status?.label ?? payment.status}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="flex items-start gap-3 px-4 py-6">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/[0.03] text-white/45">
                      <CreditCard className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white/60">No payments yet.</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-white/50">
                        Pay with mobile money or card from the Plans page —
                        credits land the moment the payment clears.
                      </p>
                      <Link
                        href="/credits"
                        className="touch-target mt-2 inline-flex items-center justify-center gap-1 rounded-lg px-1.5 py-1 text-[11px] font-semibold text-amber-300/85 transition-colors hover:text-amber-200"
                      >
                        Choose a plan
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                )}

                <Pager
                  page={billing.payments.page}
                  pages={billing.payments.pages}
                  total={billing.payments.total}
                  label="payments"
                  basePath="/settings"
                  params={{}}
                  hash="billing"
                  className="border-t border-white/6"
                />
              </div>
            </div>
          </section>
      </SettingsChrome>
    </div>
  );
}
