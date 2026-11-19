"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { ApiError, api, type AdminCreditGrant } from "@/lib/api";

const AMOUNT_DEFAULT = "50";

/**
 * Credits are money. The ref is generated once per confirmed action and reused
 * on retry, so a timeout followed by a second click credits at most once.
 */
export function GrantCredits({
  userId,
  balance,
}: {
  userId: string;
  balance: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(AMOUNT_DEFAULT);
  const [reason, setReason] = useState("");
  const [ref, setRef] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<AdminCreditGrant | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending]);

  function start() {
    setRef(crypto.randomUUID());
    setAmount(AMOUNT_DEFAULT);
    setReason("");
    setError(null);
    setDone(null);
    setOpen(true);
  }

  const credits = Number.parseInt(amount, 10);
  const preview =
    Number.isFinite(credits) && credits > 0 ? balance + credits : null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!Number.isInteger(credits) || credits < 1) {
      setError("Enter a whole number of credits");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await api<AdminCreditGrant>(
        `/admin/users/${userId}/credits`,
        {
          method: "POST",
          body: { amount: credits, reason: reason.trim(), ref },
        }
      );
      setDone(result);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add credits");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={start}
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 text-[11px] font-semibold text-amber-200 transition-colors hover:bg-amber-400/15"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden />
        Add credits
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
            aria-labelledby="grant-credits-title"
            className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0b0f1e] p-5 shadow-2xl shadow-black/50"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="grant-credits-title"
                  className="font-display text-base font-semibold text-white"
                >
                  Add credits
                </h2>
                <p className="mt-1 text-[11px] leading-relaxed text-white/35">
                  Append-only paid credits. Recorded in the audit log with your
                  reason; nothing is charged to the client.
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
                  Added {done.granted.toLocaleString("en-GH")} credits. New
                  balance: {done.balance.toLocaleString("en-GH")}.
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
                <label className="block space-y-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
                    Credits
                  </span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={10000}
                    step={1}
                    required
                    autoFocus
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="min-h-[44px] w-full rounded-lg border border-white/10 bg-[#070b16] px-3 text-sm text-white outline-none transition-colors focus:border-amber-400/50"
                  />
                  <span className="block text-[10px] text-white/30">
                    {preview === null
                      ? `Current balance ${balance.toLocaleString("en-GH")}`
                      : `Balance ${balance.toLocaleString("en-GH")} → ${preview.toLocaleString("en-GH")}`}
                  </span>
                </label>

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
                    placeholder="Why these credits are being added"
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
                  disabled={pending}
                  className="min-h-[44px] w-full rounded-lg border border-amber-400/30 bg-amber-400/15 px-3 text-xs font-semibold text-amber-100 transition-colors hover:bg-amber-400/20 disabled:opacity-50"
                >
                  {pending ? "Adding…" : "Add credits"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
