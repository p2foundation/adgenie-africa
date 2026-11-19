"use client";

import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Wallet,
  XCircle,
} from "lucide-react";
import {
  ApiError,
  api,
  type PaymentReadiness,
  type PaymentReadinessCheck,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const TONE: Record<
  PaymentReadinessCheck["state"],
  { icon: typeof CheckCircle2; className: string }
> = {
  pass: { icon: CheckCircle2, className: "text-emerald-400/80" },
  warn: { icon: AlertTriangle, className: "text-amber-300/90" },
  fail: { icon: XCircle, className: "text-rose-400/80" },
};

function CheckLine({ check }: { check: PaymentReadinessCheck }) {
  const tone = TONE[check.state];
  const Icon = tone.icon;
  return (
    <li className="flex items-start gap-2">
      <Icon
        aria-hidden="true"
        className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", tone.className)}
      />
      <span className="text-[11px] leading-relaxed text-white/55">
        {check.message}
      </span>
    </li>
  );
}

/**
 * The difference between a test payment and a real one is one env flag, so the
 * mode is stated before any rail is. `Check provider` is a read-only catalogue
 * call; nothing here initiates a charge.
 */
export function PaymentRails({
  readiness,
}: {
  readiness: PaymentReadiness | null;
}) {
  const [data, setData] = useState(readiness);
  const [pending, setPending] = useState(false);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function check() {
    setPending(true);
    setError(null);
    try {
      setData(await api<PaymentReadiness>("/admin/payments/readiness?probe=1"));
      setChecked(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not check the provider right now."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      className="glass-card rounded-2xl p-5 md:p-6"
      aria-labelledby="rails-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="rails-title"
            className="flex items-center gap-2 font-display text-lg font-semibold text-white"
          >
            <Wallet className="h-4 w-4 text-amber-400/80" />
            Payment rails
          </h2>
          <p className="mt-0.5 text-xs text-white/35">
            What a live charge needs. This check never moves money.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {data && (
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                data.mode === "sandbox"
                  ? "border-amber-400/25 bg-amber-400/10 text-amber-200"
                  : "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
              )}
            >
              {data.mode}
            </span>
          )}
          <button
            type="button"
            onClick={() => void check()}
            disabled={pending}
            className="touch-target inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white/60 transition-colors hover:border-amber-400/30 hover:text-amber-200 disabled:opacity-50"
          >
            <RefreshCw
              aria-hidden="true"
              className={cn("h-3.5 w-3.5", pending && "animate-spin")}
            />
            Check provider
          </button>
        </div>
      </div>

      {!data ? (
        <p className="mt-4 rounded-xl border border-dashed border-white/8 px-3 py-4 text-[11px] leading-relaxed text-white/35">
          Could not read the payment configuration. Retry after the API is
          reachable.
        </p>
      ) : (
        <>
          <p
            className={cn(
              "mt-4 rounded-xl border px-3 py-2 text-[11px] font-medium",
              data.ready_for_live_test
                ? "border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-200"
                : "border-white/8 bg-white/[0.02] text-white/55"
            )}
          >
            {data.ready_for_live_test
              ? "Ready for a live charge. A real wallet will be debited."
              : "Not ready for a live charge yet — the first blocking item below says what to fix."}
          </p>

          <ul className="mt-2 space-y-1.5">
            {data.checks.map((entry) => (
              <CheckLine key={entry.id} check={entry} />
            ))}
          </ul>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {data.rails.map((rail) => (
              <div
                key={rail.tender}
                className="rounded-xl border border-white/6 bg-white/[0.015] p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-white/75">
                    {rail.label}
                  </p>
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                      rail.ready
                        ? "bg-emerald-400/10 text-emerald-300"
                        : "bg-white/[0.06] text-white/40"
                    )}
                  >
                    {rail.ready ? "Ready" : "Blocked"}
                  </span>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {rail.checks.map((entry) => (
                    <CheckLine key={`${rail.tender}-${entry.id}`} check={entry} />
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="mt-3 text-[10px] text-white/25" role="status">
            {error
              ? error
              : pending
                ? "Asking the provider for its catalogue…"
                : checked
                  ? "Provider checked just now."
                  : "Token checks are configuration-only until you run Check provider."}
          </p>
        </>
      )}
    </section>
  );
}
