"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, X } from "lucide-react";
import {
  ApiError,
  api,
  type AdminAssignablePlan,
  type AdminPlanAssignment,
} from "@/lib/api";
import { formatGhs } from "@/lib/format";

/**
 * A comped plan is a real subscription with real credits but no payment row, so
 * revenue stays truthful. The period lapses on its own unless another is
 * assigned — there is no automatic renewal (ADR-0008).
 */
export function AssignPlan({
  userId,
  activePlanCode,
}: {
  userId: string;
  activePlanCode: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [plans, setPlans] = useState<AdminAssignablePlan[] | null>(null);
  const [planCode, setPlanCode] = useState("");
  const [reason, setReason] = useState("");
  const [ref, setRef] = useState("");
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<AdminPlanAssignment | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending]);

  async function start() {
    setRef(crypto.randomUUID());
    setReason("");
    setError(null);
    setDone(null);
    setOpen(true);
    if (plans) {
      setPlanCode(activePlanCode ?? plans[0]?.code ?? "");
      return;
    }
    setLoading(true);
    try {
      const list = await api<AdminAssignablePlan[]>("/admin/plans");
      setPlans(list);
      setPlanCode(activePlanCode ?? list[0]?.code ?? "");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load plans");
    } finally {
      setLoading(false);
    }
  }

  const options = activePlanCode
    ? (plans ?? []).filter((plan) => plan.code === activePlanCode)
    : (plans ?? []);
  const selected = options.find((plan) => plan.code === planCode) ?? null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!planCode) {
      setError("Choose a plan");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await api<AdminPlanAssignment>(
        `/admin/users/${userId}/subscription`,
        {
          method: "POST",
          body: { planCode, reason: reason.trim(), ref },
        }
      );
      setDone(result);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Could not assign this plan"
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={start}
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-[11px] font-medium text-white/65 transition-colors hover:bg-white/[0.06] hover:text-white/85"
      >
        <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
        {activePlanCode ? "Extend plan" : "Assign plan"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#05070f]/75 p-4 backdrop-blur-sm sm:items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !pending) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="assign-plan-title"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0f1e] p-5 shadow-2xl shadow-black/50"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="assign-plan-title"
                  className="font-display text-base font-semibold text-white"
                >
                  {activePlanCode ? "Extend this plan" : "Assign a plan"}
                </h2>
                <p className="mt-1 text-[11px] leading-relaxed text-white/35">
                  Creates a real subscription and grants the plan&apos;s credits
                  without a payment. The Money page will not count it as revenue.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                aria-label="Close"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-white/35 transition-colors hover:text-white/70 disabled:opacity-40"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            {done ? (
              <div className="mt-5 space-y-4" aria-live="polite">
                <p className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-200">
                  {done.subscription?.planName ?? "Plan"} assigned ·{" "}
                  {done.granted.toLocaleString("en-GH")} credits · balance{" "}
                  {done.balance.toLocaleString("en-GH")}
                  {done.subscription
                    ? ` · runs until ${new Date(
                        done.subscription.currentPeriodEnd
                      ).toLocaleDateString("en-GH", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}`
                    : ""}
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="min-h-[44px] w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-xs font-medium text-white/70 transition-colors hover:bg-white/[0.06]"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-5 space-y-4">
                {loading ? (
                  <p className="text-xs text-white/35">Loading plans…</p>
                ) : (
                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
                      Plan
                    </span>
                    <select
                      value={planCode}
                      onChange={(event) => setPlanCode(event.target.value)}
                      disabled={Boolean(activePlanCode)}
                      className="min-h-[44px] w-full rounded-lg border border-white/10 bg-[#070b16] px-3 text-sm text-white outline-none transition-colors focus:border-amber-400/50 disabled:opacity-60"
                    >
                      {options.map((plan) => (
                        <option key={plan.code} value={plan.code}>
                          {plan.name} · {plan.credits.toLocaleString("en-GH")} credits
                        </option>
                      ))}
                    </select>
                    {selected && (
                      <span className="block text-[10px] text-white/30">
                        Shelf price {formatGhs(selected.pricePesewas)} · one month ·
                        not charged
                      </span>
                    )}
                  </label>
                )}

                <label className="block space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
                    Reason
                  </span>
                  <textarea
                    required
                    minLength={5}
                    maxLength={200}
                    rows={3}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Why this plan is being comped or extended"
                    className="min-h-[44px] w-full resize-none rounded-lg border border-white/10 bg-[#070b16] px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-white/20 focus:border-amber-400/50"
                  />
                  <span className="block text-right text-[10px] tabular-nums text-white/20">
                    {reason.length}/200
                  </span>
                </label>

                {error && (
                  <p className="text-[11px] leading-snug text-rose-300" role="alert">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={pending || loading || !planCode}
                  className="min-h-[44px] w-full rounded-lg border border-amber-400/30 bg-amber-400/15 px-3 text-xs font-semibold text-amber-100 transition-colors hover:bg-amber-400/20 disabled:opacity-50"
                >
                  {pending
                    ? "Assigning…"
                    : activePlanCode
                      ? "Extend one month"
                      : "Assign plan"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
