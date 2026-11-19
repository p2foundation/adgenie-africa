"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { NOTIFICATIONS_CHANGED_EVENT } from "@/lib/notification-events";

export function MarkAllReadButton({ count }: { count: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (count === 0) return null;

  async function markAll() {
    setBusy(true);
    setError(null);
    try {
      await api("/notifications/read-all", { method: "POST" });
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
      router.refresh();
    } catch {
      setError("Could not mark everything read.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={markAll}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-[11px] font-semibold text-white/60 transition-colors hover:border-amber-400/30 hover:text-amber-200 disabled:cursor-not-allowed disabled:opacity-40 touch-target"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <CheckCheck className="h-3.5 w-3.5" />
        )}
        Mark all read
      </button>
      {error && <p className="text-[10px] text-rose-300/80">{error}</p>}
    </div>
  );
}
