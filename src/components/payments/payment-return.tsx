"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  ReceiptText,
  RotateCw,
  ShieldQuestion,
  XCircle,
} from "lucide-react";
import { api, type PaymentView } from "@/lib/api";
import { formatGhs } from "@adgenie/core";

const POLL_MS = 4_000;
const GIVE_UP_MS = 3 * 60 * 1_000;

/**
 * The return page never trusts redirect parameters. It asks our API, which in
 * turn only trusts the provider's verified webhook or query result.
 */
export function PaymentReturn({ paymentId }: { paymentId: string }) {
  const [view, setView] = useState<PaymentView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checks, setChecks] = useState(0);
  const [manualNonce, setManualNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();

    const tick = async () => {
      if (cancelled) return;
      try {
        const result = await api<PaymentView>(`/credits/payments/${paymentId}`);
        if (cancelled) return;
        setView(result);
        setError(null);
        setChecks((value) => value + 1);
        if (result.status === "success" || result.status === "failed" || result.status === "refunded") {
          return;
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "We couldn't check this payment.");
      }

      if (Date.now() - startedAt > GIVE_UP_MS) return;
      timer = setTimeout(tick, POLL_MS);
    };

    void tick();
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
  }, [paymentId, manualNonce]);

  const status = view?.status ?? "verifying";
  const settled = status === "success" || status === "failed" || status === "refunded";
  const stalled = !settled && checks > 20;

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="glass-card overflow-hidden rounded-2xl">
        <div className="border-b border-white/6 px-5 py-4">
          <p className="text-[10px] uppercase tracking-widest text-white/30">
            Payment status
          </p>
          <h1 className="mt-1 font-display text-xl font-semibold text-white">
            {status === "success"
              ? "Payment confirmed"
              : status === "failed"
                ? "Payment not completed"
                : status === "refunded"
                  ? "Payment reversed"
                  : "Checking your payment"}
          </h1>
        </div>

        <div className="px-5 py-8 text-center">
          <div
            className={
              status === "success"
                ? "mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-400/10"
                : status === "failed" || status === "refunded"
                  ? "mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-rose-400/25 bg-rose-400/10"
                  : "mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-amber-400/25 bg-amber-400/10"
            }
          >
            {status === "success" ? (
              <CheckCircle2 className="h-8 w-8 text-emerald-300" />
            ) : status === "failed" || status === "refunded" ? (
              <XCircle className="h-8 w-8 text-rose-300" />
            ) : (
              <Loader2 className="h-8 w-8 animate-spin text-amber-300" />
            )}
          </div>

          <p className="mx-auto max-w-sm text-sm leading-relaxed text-white/55">
            {view?.message ??
              "We are asking the payment provider for the final result. This usually takes a few seconds."}
          </p>

          {view && (
            <dl className="mx-auto mt-6 max-w-xs space-y-2.5 text-left">
              <div className="flex items-center justify-between gap-3 text-xs">
                <dt className="text-white/35">Plan</dt>
                <dd className="font-medium text-white/80">{view.plan_name}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs">
                <dt className="text-white/35">Amount</dt>
                <dd className="font-medium tabular-nums text-white/80">
                  {formatGhs(view.amount_pesewas)}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs">
                <dt className="text-white/35">Credits</dt>
                <dd className="font-medium text-white/80">
                  +{view.status === "success" ? view.credits_granted : view.credits}
                </dd>
              </div>
              {view.reference && (
                <div className="flex items-center justify-between gap-3 text-xs">
                  <dt className="text-white/35">Reference</dt>
                  <dd className="max-w-[60%] truncate font-mono text-[10px] text-white/50">
                    {view.reference}
                  </dd>
                </div>
              )}
              {view.test && (
                <div className="flex items-center justify-between gap-3 text-xs">
                  <dt className="text-white/35">Mode</dt>
                  <dd className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-medium text-amber-200">
                    Test
                  </dd>
                </div>
              )}
            </dl>
          )}

          {error && (
            <p className="mx-auto mt-4 max-w-sm rounded-lg border border-rose-400/20 bg-rose-400/[0.06] px-3 py-2 text-[11px] leading-relaxed text-rose-200">
              {error}
            </p>
          )}

          {stalled && (
            <p className="mx-auto mt-5 flex max-w-sm items-start gap-2 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5 text-left text-[11px] leading-relaxed text-white/45">
              <ShieldQuestion className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-300/80" />
              This is taking longer than usual. Nothing is lost — your payment stays
              visible in history and settles as soon as the provider confirms it.
            </p>
          )}

          <div className="mt-6 flex flex-col gap-2">
            {!settled && (
              <button
                type="button"
                onClick={() => setManualNonce((value) => value + 1)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-xs font-semibold text-white/60 transition-colors hover:border-amber-400/30 hover:text-amber-200 touch-target"
              >
                <RotateCw className="h-3.5 w-3.5" />
                Check again
              </button>
            )}
            <Link
              href="/credits"
              className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold touch-target"
            >
              {status === "success" ? "Back to credits" : "View credits and history"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 border-t border-white/6 px-5 py-3 text-[10px] text-white/25">
          <ReceiptText className="h-3 w-3" />
          This page reads our records, never the values in the link.
        </div>
      </div>
    </div>
  );
}
