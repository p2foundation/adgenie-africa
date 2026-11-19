import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ReceiptText, Zap } from "lucide-react";
import {
  PLANS,
  PAYMENT_TENDERS,
  currencyLabel,
  currencyNoun,
  formatGhs,
  formatMoney,
  rateFor,
  resolveCurrency,
} from "@adgenie/core";
import { CheckoutBoard, type CheckoutPlan } from "@/components/payments/checkout-board";
import { Pager } from "@/components/pagination/pager";
import { MoMoGlyph, CardGlyph } from "@/components/pictographs";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  readBalance,
  readCurrencyRates,
  readPaymentOptions,
  readPayments,
  readSession,
} from "@/lib/session";
import type { PaymentOptions } from "@/lib/api";

export const metadata: Metadata = { title: "Credits" };

const highlighted = "growth";

// Same promise as the landing pricing section — one source of truth for copy.
const planFeatures: Record<string, string[]> = {
  starter: [
    "120 credits every month",
    "Product, seller & event ads",
    "Images: 1:1, 4:5, 9:16",
    "Short video (9:16)",
    "English + French",
    "Twi & Ga (beta)",
  ],
  growth: [
    "350 credits every month",
    "All verticals",
    "All sizes + multi-concept",
    "Up to 3 short videos",
    "All 4 languages",
    "Brand kit upload",
  ],
  business: [
    "1,000 credits every month",
    "Everything in Growth",
    "Venue profile + events",
    "Posting calendar",
    "Priority generation",
    "Admin dashboard",
  ],
  topup: [
    "60 credits, one time",
    "Any vertical",
    "Same-day delivery",
    "Never expires",
  ],
};

const tenderGlyph = {
  mobile_money: MoMoGlyph,
  card: CardGlyph,
} as const;

const STATUS_TONES: Record<
  string,
  { label: string; pill: string; detail?: string }
> = {
  success: {
    label: "Paid",
    pill: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  },
  verifying: {
    label: "Checking",
    pill: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    detail: "Waiting for the provider to confirm.",
  },
  failed: {
    label: "Not completed",
    pill: "border-rose-400/20 bg-rose-400/10 text-rose-300",
  },
  refunded: {
    label: "Reversed",
    pill: "border-white/10 bg-white/5 text-white/50",
  },
};

const FALLBACK_OPTIONS: PaymentOptions = {
  sandbox: false,
  currency: "GHS",
  tenders: PAYMENT_TENDERS.map((tender) => ({
    id: tender.id,
    label: tender.label,
    detail: tender.detail,
    methods: [...tender.methods],
    available: false,
  })),
};

export default async function CreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ paymentsPage?: string; resume?: string }>;
}) {
  const params = await searchParams;
  const requested = Number.parseInt(params.paymentsPage ?? "1", 10);
  const historyPage = Number.isFinite(requested) && requested > 0 ? requested : 1;
  const resumePaymentId =
    params.resume && /^[0-9a-f-]{20,64}$/i.test(params.resume)
      ? params.resume
      : null;

  const [balance, session, rateView, optionsData, history] = await Promise.all([
    readBalance(),
    readSession(),
    readCurrencyRates(),
    readPaymentOptions(),
    readPayments({ page: historyPage, limit: 6 }),
  ]);
  if (!session) redirect("/sign-in");

  const options = optionsData ?? FALLBACK_OPTIONS;
  const currency = resolveCurrency({
    currency: session.currency,
    country: session.country,
  });
  const rate = rateFor(currency, rateView?.rates ?? {});
  const converted = currency !== "GHS";

  const checkoutPlans: CheckoutPlan[] = Object.values(PLANS).map((plan) => ({
    code: plan.code,
    name: plan.name,
    description: plan.description,
    interval: plan.interval,
    priceLabel: formatMoney(plan.price_pesewas, currency, rate),
    chargeLabel: `${formatGhs(plan.price_pesewas)} incl. 20% VAT`,
    credits: plan.credits,
    features: planFeatures[plan.code] ?? [],
    highlighted: plan.code === highlighted,
  }));

  const parts = (session.displayName ?? "").trim().split(/\s+/).filter(Boolean);
  const defaults = {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
    email: session.email ?? "",
    phone: session.phone ?? "",
  };

  return (
    <div className="shell-wide space-y-10">
      {/* Header */}
      <div className="animate-in">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
            Credits
          </p>
          {options.sandbox && (
            <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
              Test payments
            </span>
          )}
        </div>
        <h1 className="font-display text-3xl font-bold leading-[1.05] tracking-tight text-white md:text-[2.6rem]">
          Pay in {currencyNoun(currency)}.
          <br />
          <span className="gradient-text-hero glow-text-gold">Spend on output.</span>
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/50 md:text-base">
          Credits buy generated ads, video and copy. The exact cost of every
          campaign is shown for approval before anything is made — no surprise
          billing.
        </p>
      </div>

      {/* Balance */}
      <div className="glass-card relative overflow-hidden rounded-2xl px-6 py-6 md:px-8">
        <div
          className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="mb-2 text-xs uppercase tracking-widest text-white/35">
              Current balance
            </p>
            <p className="font-display text-4xl font-bold leading-none tabular-nums text-white sm:text-5xl md:text-6xl">
              {balance ?? "—"}
              <span className="ml-3 text-base font-medium text-white/35 md:text-lg">
                credits
              </span>
            </p>
            <p className="mt-3 text-xs text-white/30">
              New accounts get 10 free credits after email or phone verification.
            </p>
            {balance === 0 && (
              <Link
                href="#plans"
                className="btn-primary mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold touch-target"
              >
                <Zap className="h-3.5 w-3.5" />
                Top up to keep running
              </Link>
            )}
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/25 sm:h-14 sm:w-14 md:h-16 md:w-16">
            <Zap className="h-7 w-7 text-black" />
          </div>
        </div>
      </div>

      {/* Plans */}
      <div id="plans" className="scroll-mt-[9.5rem]">
        <h2 className="mb-6 text-xs font-semibold uppercase tracking-widest text-white/50">
          Plans and top-ups
        </h2>
        <CheckoutBoard
          plans={checkoutPlans}
          options={options}
          defaults={defaults}
          resumePaymentId={resumePaymentId}
        />
        <p className="mt-6 text-xs text-white/25">
            Top-up credits never expire. Monthly credits refresh each billing period.{" "}
            {converted
              ? `Shown in ${currencyLabel(currency)} at an indicative rate${
                  rateView?.updatedAt ? ` updated ${formatDate(rateView.updatedAt)}` : ""
                }; you are charged in Ghana Cedis.`
              : "Prices in Ghana Cedis, VAT included."}
          </p>
      </div>

      {/* Payment methods */}
      <div className="glass-card rounded-2xl p-6">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/50">
          We accept
        </p>
        <div className="flex flex-wrap gap-3">
          {options.tenders.map((tender) => {
            const Glyph = tenderGlyph[tender.id];
            return (
              <span
                key={tender.id}
                className="glass inline-flex items-start gap-2.5 rounded-xl border border-white/8 px-3.5 py-2.5 text-sm text-white/65"
              >
                <Glyph className="mt-0.5 h-4 w-4 text-amber-400" />
                <span>
                  <span className="block leading-tight">{tender.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-tight text-white/35">
                    {tender.detail}
                  </span>
                </span>
                {!tender.available && (
                  <span className="ml-1 mt-0.5 rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/35">
                    Setup
                  </span>
                )}
              </span>
            );
          })}
        </div>
        <p className="mt-4 text-xs text-white/25">
          {converted
            ? "Checkout charges Ghana Cedis, whatever currency prices are shown in."
            : "Prices in Ghana Cedis, VAT included."}{" "}
          Nothing renews automatically — every month is a payment you approve.
        </p>
      </div>

      {/* History */}
      <div className="glass-card overflow-hidden rounded-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/6 px-5 py-4">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-amber-400/80" />
            <h2 className="font-display text-sm font-semibold text-white">
              Payment history
            </h2>
          </div>
          {history && history.total > 0 && (
            <p className="text-[11px] text-white/30">
              {history.total.toLocaleString("en-GH")}{" "}
              {history.total === 1 ? "payment" : "payments"}
            </p>
          )}
        </div>

        {!history || history.items.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-white/30">
              No payments yet. Everything here is a purchase you approved.
            </p>
            <Link
              href="#plans"
              className="touch-target mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3.5 py-2 text-xs text-white/50 transition-colors hover:border-amber-400/25 hover:text-amber-200"
            >
              <ReceiptText className="h-3.5 w-3.5" />
              Choose a plan
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {history.items.map((payment) => {
              const tone = STATUS_TONES[payment.status] ?? STATUS_TONES["verifying"]!;
              const tender =
                payment.tender === "mobile_money"
                  ? "Mobile money"
                  : payment.tender === "card"
                    ? "Card"
                    : "Test";
              return (
                <li
                  key={payment.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white/80">
                      {payment.plan_name}
                      <span className="text-white/25"> · {tender}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-white/30">
                      {formatDateTime(payment.created_at)}
                      {payment.reference ? ` · ${payment.reference}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {payment.test && (
                      <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-amber-200/80">
                        Test
                      </span>
                    )}
                    <span className="text-sm tabular-nums text-white/70">
                      {formatGhs(payment.amount_pesewas)}
                    </span>
                    {payment.status === "verifying" ? (
                      <>
                        <Link
                          href={`/credits?resume=${payment.id}&paymentsPage=${historyPage}`}
                          className="touch-target inline-flex items-center justify-center rounded-full border border-amber-300/30 bg-amber-400/10 px-3 py-1 text-[10px] font-semibold text-amber-100 transition-colors hover:border-amber-300/55 hover:bg-amber-400/15"
                        >
                          Resume payment
                        </Link>
                        <Link
                          href={`/billing/return?payment=${payment.id}`}
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors hover:brightness-125",
                            tone.pill
                          )}
                        >
                          {tone.label}
                        </Link>
                      </>
                    ) : (
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                          tone.pill
                        )}
                      >
                        {tone.label}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {history && (
          <Pager
            page={history.page}
            pages={history.pages}
            total={history.total}
            label="payments"
            basePath="/credits"
            pageParam="paymentsPage"
          />
        )}
      </div>
    </div>
  );
}