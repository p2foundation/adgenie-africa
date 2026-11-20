"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CreditCard,
  Loader2,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import {
  detectMobileMoneyNetwork,
  formatGhanaMsisdn,
  formatGhs,
  GHANA_MOBILE_MONEY_NETWORKS,
  normalizeGhanaMsisdn,
  type PaymentTenderId,
} from "@adgenie/core";
import {
  api,
  ApiError,
  type CheckoutResult,
  type PaymentOptions,
  type PaymentView,
  type PaymentsPage,
} from "@/lib/api";
import { useDialogPanel } from "@/lib/dialog-panel";
import { cn } from "@/lib/utils";

export interface CheckoutPlan {
  code: string;
  name: string;
  description: string;
  interval: "monthly" | "one_time";
  priceLabel: string;
  chargeLabel: string;
  credits: number;
  features: string[];
  highlighted: boolean;
}

interface Props {
  plans: CheckoutPlan[];
  options: PaymentOptions;
  defaults: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  resumePaymentId?: string | null;
  initialPlanCode?: string | null;
}

type Phase = "form" | "submitting" | "verifying" | "success" | "failed";

type WalletInfo = NonNullable<CheckoutResult["wallet"]>;

const IDLE_MESSAGE = "Approve the prompt on your phone.";

/**
 * "MTN Mobile Money · AndrewKenneth Afful" — the bank's answer when it gave one,
 * the prefix guess when it did not. Null means we say nothing rather than
 * implying we checked.
 */
function walletSummary(wallet: WalletInfo | null, guessedLabel?: string | null): string | null {
  const fromProvider = wallet
    ? GHANA_MOBILE_MONEY_NETWORKS.find((entry) => entry.id === wallet.network_id)?.label ??
      wallet.network_label
    : null;
  const label = fromProvider ?? guessedLabel ?? null;
  const holder = wallet?.holder_name ?? null;
  if (!label && !holder) return null;
  return [label, holder].filter(Boolean).join(" · ");
}

export function CheckoutBoard({
  plans,
  options,
  defaults,
  resumePaymentId,
  initialPlanCode,
}: Props) {
  const router = useRouter();
  const [openPlan, setOpenPlan] = useState<CheckoutPlan | null>(null);
  const [tender, setTender] = useState<PaymentTenderId>("mobile_money");
  const [msisdn, setMsisdn] = useState("");
  const [firstName, setFirstName] = useState(defaults.firstName);
  const [lastName, setLastName] = useState(defaults.lastName);
  const [phone, setPhone] = useState(defaults.phone);
  const [phase, setPhase] = useState<Phase>("form");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [credits, setCredits] = useState(0);
  const [pollNonce, setPollNonce] = useState(0);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const [boardError, setBoardError] = useState<string | null>(null);
  const resumeHandled = useRef<string | null>(null);

  const available = useMemo(
    () => options.tenders.filter((entry) => entry.available),
    [options.tenders]
  );

  // The number on the account, if it is a Ghana wallet at all. offered, never
  // forced — plenty of people pay for ads from a number they don't live on.
  const savedMsisdn = useMemo(
    () => normalizeGhanaMsisdn(defaults.phone ?? ""),
    [defaults.phone]
  );

  function open(plan: CheckoutPlan) {
    setOpenPlan(plan);
    setTender(available[0]?.id ?? "mobile_money");
    setPhase("form");
    setError(null);
    setMessage("");
    setPaymentId(null);
    setCredits(0);
    setWallet(null);
    setMsisdn(savedMsisdn ? formatGhanaMsisdn(savedMsisdn) : "");
    setFirstName(defaults.firstName);
    setLastName(defaults.lastName);
    setPhone(defaults.phone);
  }

  function close() {
    if (phase === "submitting") return;
    setOpenPlan(null);
    // A resumed payment or deep-linked plan is a one-shot link. Once the customer
    // closes the dialog the address should stop advertising it.
    if (resumePaymentId || initialPlanCode) {
      const params = new URLSearchParams(window.location.search);
      params.delete("resume");
      params.delete("plan");
      const query = params.toString();
      resumeHandled.current = null;
      router.replace(query ? `/credits?${query}` : "/credits", { scroll: false });
    }
  }

  const showPayment = useCallback(
    (payment: PaymentView) => {
      const plan =
        plans.find((entry) => entry.code === payment.plan_code) ?? {
          code: payment.plan_code,
          name: payment.plan_name,
          description: "Payment in progress",
          interval: "one_time" as const,
          priceLabel: formatGhs(payment.amount_pesewas),
          chargeLabel: formatGhs(payment.amount_pesewas),
          credits: payment.credits,
          features: [],
          highlighted: false,
        };
      setOpenPlan(plan);
      setTender(payment.tender ?? available[0]?.id ?? "mobile_money");
      setPaymentId(payment.id);
      setCredits(
        payment.status === "success" ? payment.credits_granted : payment.credits
      );
      setMessage(payment.message);
      setWallet(null);
      setError(null);
      setResumingId(null);
      setPhase(
        payment.status === "success"
          ? "success"
          : payment.status === "failed" || payment.status === "refunded"
            ? "failed"
            : "verifying"
      );
      if (payment.status === "success") router.refresh();
    },
    [available, plans, router]
  );

  const resumePayment = useCallback(
    async (id: string) => {
      setResumingId(id);
      setError(null);
      try {
        showPayment(await api<PaymentView>(`/credits/payments/${id}`));
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "We couldn't reopen this payment. Check your history.";
        setResumingId(null);
        if (resumeHandled.current) setBoardError(message);
        setError(message);
      }
    },
    [showPayment]
  );

  async function findPaymentToResume() {
    const history = await api<PaymentsPage>("/credits/payments?page=1&limit=10");
    return history.items.find((payment) => payment.status === "verifying") ?? null;
  }

  const network = detectMobileMoneyNetwork(msisdn);
  const normalized = normalizeGhanaMsisdn(msisdn);

  async function submit() {
    if (!openPlan || !tender) return;
    setError(null);

    if (tender === "mobile_money") {
      if (!normalized) {
        setError("Enter the number that will receive the prompt, e.g. 024 123 4567.");
        return;
      }
      if (!network) {
        setError("That number is not an MTN, Telecel or AT wallet.");
        return;
      }
    }

    setPhase("submitting");
    try {
      const result = await api<CheckoutResult>("/credits/checkout", {
        method: "POST",
        body: {
          plan_code: openPlan.code,
          tender,
          ...(tender === "mobile_money" ? { msisdn: normalized } : {}),
          ...(tender === "card"
            ? {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                phone: phone.trim(),
              }
            : {}),
        },
      });

      if (result.status === "checkout_ready" && result.checkout_url) {
        window.location.assign(result.checkout_url);
        return;
      }

      setMessage(result.message);
      setCredits(result.credits);
      setWallet(result.wallet ?? null);
      if (result.status === "success") {
        setPhase("success");
        router.refresh();
        return;
      }
      if (result.status === "failed") {
        setPhase("failed");
        return;
      }

      setPaymentId(result.payment_id);
      setPhase("verifying");
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.body as { code?: string } | null)?.code === "checkout_in_progress"
      ) {
        try {
          const existing = await findPaymentToResume();
          if (existing) {
            showPayment(existing);
            return;
          }
        } catch {
          // Fall back to the normal message below; the payment is still safe.
        }
        setPhase("form");
        setError(
          "A payment is already in progress. Open it from payment history before trying again."
        );
        return;
      }
      setError(err instanceof Error ? err.message : "We couldn't start checkout.");
      setPhase("form");
    }
  }

  useEffect(() => {
    if (!resumePaymentId || resumeHandled.current === resumePaymentId) return;
    resumeHandled.current = resumePaymentId;
    void resumePayment(resumePaymentId);
  }, [resumePaymentId, resumePayment]);

  useEffect(() => {
    if (!initialPlanCode || resumePaymentId || openPlan) return;
    const plan = plans.find((p) => p.code === initialPlanCode);
    if (plan) open(plan);
  }, [initialPlanCode, plans, resumePaymentId, openPlan]);

  // Poll while the customer is on the screen; pause in a background tab and
  // resume immediately when they come back.
  useEffect(() => {
    if (phase !== "verifying" || !paymentId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const tick = async () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        timer = setTimeout(tick, 2_000);
        return;
      }
      try {
        const view = await api<PaymentView>(`/credits/payments/${paymentId}`);
        if (cancelled) return;
        setMessage(view.message);
        setCredits(view.credits);
        if (view.status === "success") {
          setPhase("success");
          router.refresh();
          return;
        }
        if (view.status === "failed" || view.status === "refunded") {
          setPhase("failed");
          return;
        }
      } catch {
        // A transient error is not a failed payment; keep checking.
      }
      if (!cancelled) timer = setTimeout(tick, 5_000);
    };

    timer = setTimeout(tick, 4_000);
    const onVisible = () => {
      if (document.visibilityState !== "visible" || cancelled) return;
      if (timer) clearTimeout(timer);
      void tick();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [phase, paymentId, pollNonce, router]);

  return (
    <>
      {resumingId && !openPlan && (
        <div
          role="status"
          className="mb-4 flex items-center gap-2.5 rounded-2xl border border-amber-300/20 bg-amber-400/[0.06] p-4 text-sm text-amber-100"
        >
          <Loader2 className="h-4 w-4 animate-spin" />
          Reopening your payment…
        </div>
      )}

      {boardError && (
        <div
          role="alert"
          className="mb-4 flex flex-col gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex min-w-0 items-start gap-2.5">
            <ReceiptText className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-300" />
            <div>
              <p className="text-sm font-semibold text-rose-100">
                Payment could not be reopened
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-rose-100/65">
                {boardError} Your payment has not been lost — it remains in history.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            {resumePaymentId && (
              <button
                type="button"
                onClick={() => {
                  setBoardError(null);
                  resumeHandled.current = null;
                  void resumePayment(resumePaymentId);
                }}
                className="rounded-xl border border-rose-300/25 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:border-rose-300/50"
              >
                Try again
              </button>
            )}
            <button
              type="button"
              onClick={() => setBoardError(null)}
              className="rounded-xl px-3 py-2 text-xs font-semibold text-rose-100/50 transition hover:text-white"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((plan) => (
          <div
            key={plan.code}
            className={cn(
              "glass-card relative flex flex-col rounded-2xl p-5",
              plan.highlighted && "border-amber-500/30 ring-1 ring-amber-500/20"
            )}
            style={
              plan.highlighted
                ? {
                    boxShadow:
                      "0 0 50px rgba(251,191,36,0.15), 0 4px 24px rgba(0,0,0,0.4)",
                  }
                : undefined
            }
          >
            {plan.highlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-3 py-1 text-xs font-bold text-black shadow-lg">
                  <Zap className="h-3 w-3" />
                  Most popular
                </span>
              </div>
            )}
            <h3 className="mb-1 font-semibold text-white">{plan.name}</h3>
            <p className="mb-4 text-xs text-white/35">{plan.description}</p>
            <div className="flex items-end gap-1.5">
              <span className="font-display text-3xl font-bold text-white">
                {plan.priceLabel}
              </span>
              {plan.interval === "monthly" && (
                <span className="mb-0.5 text-sm text-white/40">/month</span>
              )}
            </div>
            <p className="mt-1.5 text-xs text-white/30">{plan.chargeLabel}</p>
            <p className="mb-5 mt-1.5 text-xs font-semibold text-amber-400">
              {plan.credits} credits
            </p>
            <ul className="mb-6 flex-1 space-y-2.5">
              {plan.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2 text-xs leading-snug text-white/55"
                >
                  <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-400" />
                  {feature}
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => open(plan)}
              disabled={available.length === 0}
              className={cn(
                "w-full rounded-xl py-2.5 text-sm font-semibold transition-all touch-target disabled:cursor-not-allowed disabled:opacity-40",
                plan.highlighted
                  ? "btn-primary"
                  : "glass border border-white/10 text-white/60 hover:border-white/20 hover:text-white"
              )}
            >
              {available.length === 0 ? "Checkout opening soon" : "Buy now"}
            </button>
          </div>
        ))}
      </div>

      {openPlan && (
        <Modal
          title={openPlan.name}
          subtitle={`${openPlan.credits} credits · ${openPlan.chargeLabel}`}
          onClose={close}
        >
          <div className="space-y-4 p-4">
            {options.sandbox && (
              <p className="rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 text-[11px] leading-relaxed text-amber-200/80">
                Test mode is on. No real money moves and no wallet is charged —
                payments settle automatically in a few seconds.
              </p>
            )}

            {(phase === "form" || phase === "submitting") && (
              <>
                <div>
                  <p className="mb-1.5 text-[10px] uppercase tracking-widest text-white/28">
                    How do you want to pay?
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {options.tenders.map((entry) => {
                      const Icon = entry.id === "mobile_money" ? Smartphone : CreditCard;
                      const selected = tender === entry.id;
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          disabled={!entry.available}
                          onClick={() => {
                            setTender(entry.id);
                            setError(null);
                          }}
                          className={cn(
                            "flex flex-col items-start gap-1.5 rounded-xl border px-3 py-2.5 text-left transition-colors",
                            selected
                              ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
                              : "border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20",
                            !entry.available && "cursor-not-allowed opacity-40"
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="text-xs font-semibold leading-tight">
                            {entry.label}
                          </span>
                          <span className="text-[10px] leading-tight text-white/35">
                            {entry.available ? entry.methods.join(" · ") : "Finishing setup"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {tender === "mobile_money" ? (
                  <div>
                    <label
                      htmlFor="momo-number"
                      className="mb-1 block text-[10px] uppercase tracking-widest text-white/28"
                    >
                      Mobile money number
                    </label>
                    <input
                      id="momo-number"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={msisdn}
                      onChange={(event) => {
                        setMsisdn(event.target.value);
                        setError(null);
                      }}
                      // Grouped once they stop typing — rewriting on every keystroke
                      // would fight the caret.
                      onBlur={() => {
                        if (normalized) setMsisdn(formatGhanaMsisdn(msisdn));
                      }}
                      placeholder="024 123 4567"
                      className={cn(
                        "min-h-[44px] w-full rounded-xl border bg-white/[0.03] px-3 py-2.5 text-sm tracking-wide text-white/85 outline-none placeholder:text-white/20",
                        network
                          ? "border-amber-400/30"
                          : "border-white/10 focus:border-amber-400/40"
                      )}
                    />
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {network ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
                          <Check className="h-3 w-3" />
                          {network.label}
                        </span>
                      ) : (
                        <span className="text-[11px] text-white/35">
                          MTN, Telecel and AT wallets
                        </span>
                      )}
                      {savedMsisdn && normalized !== savedMsisdn && (
                        <button
                          type="button"
                          onClick={() => {
                            setMsisdn(formatGhanaMsisdn(savedMsisdn));
                            setError(null);
                          }}
                          className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/50 transition-colors hover:border-amber-400/30 hover:text-amber-200 touch-target"
                        >
                          Use saved {formatGhanaMsisdn(savedMsisdn)}
                        </button>
                      )}
                      {savedMsisdn && normalized === savedMsisdn && (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
                          Number on your account
                        </span>
                      )}
                    </div>
                    {network && (
                      <p className="mt-1.5 text-[11px] text-white/35">
                        We confirm the wallet with the bank, then send the prompt to
                        your phone.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="mb-1 block text-[10px] uppercase tracking-widest text-white/28">
                          First name
                        </span>
                        <input
                          value={firstName}
                          onChange={(event) => setFirstName(event.target.value)}
                          autoComplete="given-name"
                          className="min-h-[44px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white/85 outline-none focus:border-amber-400/40"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[10px] uppercase tracking-widest text-white/28">
                          Last name
                        </span>
                        <input
                          value={lastName}
                          onChange={(event) => setLastName(event.target.value)}
                          autoComplete="family-name"
                          className="min-h-[44px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white/85 outline-none focus:border-amber-400/40"
                        />
                      </label>
                    </div>
                    <label className="block">
                      <span className="mb-1 block text-[10px] uppercase tracking-widest text-white/28">
                        Phone
                      </span>
                      <input
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        className="min-h-[44px] w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white/85 outline-none focus:border-amber-400/40"
                      />
                    </label>
                    <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-white/30">
                      <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-400/70" />
                      You finish on a secure hosted page. AdGenie never sees or stores
                      your card details.
                    </p>
                  </div>
                )}

                {error && (
                  <p className="rounded-lg border border-rose-400/20 bg-rose-400/[0.06] px-3 py-2 text-[11px] leading-relaxed text-rose-200">
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  onClick={submit}
                  disabled={phase === "submitting" || !tender}
                  className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-50 touch-target"
                >
                  {phase === "submitting" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Starting…
                    </>
                  ) : tender === "card" ? (
                    <>
                      Continue to secure checkout
                      <ArrowRight className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Send prompt
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
                <p className="text-center text-[10px] text-white/25">
                  You will be charged {openPlan.chargeLabel}. Nothing renews
                  automatically.
                </p>
              </>
            )}

            {phase === "verifying" && (
              <div className="py-4 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-amber-400/25 bg-amber-400/10">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-300" />
                </div>
                <h3 className="font-display text-lg font-semibold text-white">
                  {tender === "card" ? "Checking your payment" : "Check your phone"}
                </h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-white/50">
                  {message || IDLE_MESSAGE}
                </p>
                {tender === "mobile_money" &&
                  (() => {
                    const summary = walletSummary(wallet, network?.label);
                    if (!summary) return null;
                    return (
                      <p className="mx-auto mt-3 flex max-w-xs flex-wrap items-center justify-center gap-1.5 text-[11px] text-white/45">
                        <Smartphone className="h-3.5 w-3.5 flex-shrink-0 text-amber-300/70" />
                        <span>
                          Prompt sent to{" "}
                          <span className="font-semibold text-white/70">{summary}</span>
                        </span>
                      </p>
                    );
                  })()}
                <p className="mt-3 text-xs text-white/30">
                  Keep this window open. We update it automatically.
                </p>
                <div className="mt-5 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPollNonce((value) => value + 1)}
                    className="rounded-xl border border-white/10 px-3.5 py-2 text-xs font-semibold text-white/60 transition-colors hover:border-amber-400/30 hover:text-amber-300 touch-target"
                  >
                    Check now
                  </button>
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-xl px-3.5 py-2 text-xs font-semibold text-white/35 transition-colors hover:text-white/70 touch-target"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}

            {phase === "success" && (
              <div className="py-4 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-400/10">
                  <CheckCircle2 className="h-7 w-7 text-emerald-300" />
                </div>
                <h3 className="font-display text-lg font-semibold text-white">
                  Credits added
                </h3>
                <p className="mt-2 text-sm text-white/55">
                  +{credits || openPlan.credits} credits are in your balance.
                  {openPlan.interval === "monthly"
                    ? " Your plan is active for the next month."
                    : ""}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    router.refresh();
                    close();
                  }}
                  className="btn-primary mt-5 w-full rounded-xl py-2.5 text-sm font-semibold touch-target"
                >
                  Done
                </button>
              </div>
            )}

            {phase === "failed" && (
              <div className="py-4 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-rose-400/25 bg-rose-400/10">
                  <XCircle className="h-7 w-7 text-rose-300" />
                </div>
                <h3 className="font-display text-lg font-semibold text-white">
                  Payment not completed
                </h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-white/55">
                  {message || "Nothing was charged. You can try again with another number."}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setPhase("form");
                    setError(null);
                    setPaymentId(null);
                  }}
                  className="mt-5 w-full rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-white/70 transition-colors hover:border-amber-400/30 hover:text-amber-200 touch-target"
                >
                  Try again
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const panel = useDialogPanel<HTMLDivElement>(onClose);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-white/10 bg-[#0a0e1a] shadow-2xl outline-none sm:max-w-md sm:rounded-2xl"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-white/6 bg-[#0a0e1a]/95 px-4 py-3.5 backdrop-blur">
          <div className="min-w-0">
            <h2 className="font-display text-sm font-semibold text-white">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 truncate text-[11px] text-white/30">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/35 transition-colors hover:bg-white/5 hover:text-white touch-target"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
