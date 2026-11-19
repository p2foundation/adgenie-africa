"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, Trash2 } from "lucide-react";
import { api, type NotificationItem } from "@/lib/api";
import { formatDate, formatDateTime, formatRelative } from "@/lib/format";
import { NOTIFICATIONS_CHANGED_EVENT } from "@/lib/notification-events";
import { notificationTone } from "@/components/notifications/notification-tone";
import { cn } from "@/lib/utils";

export function InboxItem({ item }: { item: NotificationItem }) {
  const router = useRouter();
  const [readAt, setReadAt] = useState(item.readAt);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [armed, setArmed] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const disarmTimer = useRef<number | null>(null);
  const tone = notificationTone(item.kind);
  const unread = !readAt;

  useEffect(() => {
    return () => {
      if (disarmTimer.current) window.clearTimeout(disarmTimer.current);
    };
  }, []);

  async function markRead() {
    if (!unread || busy) return;
    setBusy(true);
    setReadAt(new Date().toISOString());
    try {
      await api(`/notifications/${item.id}/read`, { method: "POST" });
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
      router.refresh();
    } catch {
      // Put the unread marker back; the click can be retried.
      setReadAt(null);
    } finally {
      setBusy(false);
    }
  }

  /** First click arms, second click removes — no modal for a one-line action. */
  async function dismiss() {
    if (deleting) return;
    if (!armed) {
      setArmed(true);
      setDeleteError(null);
      disarmTimer.current = window.setTimeout(() => setArmed(false), 5000);
      return;
    }
    if (disarmTimer.current) window.clearTimeout(disarmTimer.current);
    setDeleting(true);
    setDeleteError(null);
    try {
      await api(`/notifications/${item.id}`, { method: "DELETE" });
      setDeleted(true);
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
      router.refresh();
    } catch {
      setDeleteError("Could not remove it. Try again.");
      setArmed(false);
      setDeleting(false);
    }
  }

  if (deleted) return null;

  return (
    <article
      className={cn(
        "relative flex gap-4 px-5 py-5 transition-colors md:px-6",
        unread ? "bg-amber-400/[0.03]" : "hover:bg-white/[0.015]"
      )}
    >
      {unread && (
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-[2px] bg-gradient-to-b from-amber-400 via-amber-500 to-orange-500"
        />
      )}

      <span
        className={cn(
          "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          tone.className
        )}
      >
        <tone.icon className="h-[18px] w-[18px]" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/30">
            {tone.label}
          </span>
          <span className="h-0.5 w-0.5 rounded-full bg-white/20" aria-hidden="true" />
          <time
            dateTime={item.createdAt}
            title={formatDateTime(item.createdAt)}
            className="text-[10px] tabular-nums text-white/25"
          >
            {formatRelative(item.createdAt)}
          </time>
          {unread && (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-300">
              New
            </span>
          )}
        </div>

        <h2
          className={cn(
            "mt-2 font-display text-base leading-snug",
            unread ? "font-semibold text-white" : "font-medium text-white/65"
          )}
        >
          {item.title}
        </h2>
        <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-white/40 md:text-[13px]">
          {item.body}
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-1">
          {item.href && (
            <Link
              href={item.href}
              onClick={() => void markRead()}
              className="touch-target inline-flex items-center justify-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-amber-300/85 transition-colors hover:text-amber-200"
            >
              Open
              <ArrowRight className="h-3 w-3" />
            </Link>
          )}
          {unread ? (
            <button
              type="button"
              onClick={markRead}
              disabled={busy}
              className="touch-target inline-flex items-center justify-center gap-1 rounded-lg px-2 text-[11px] text-white/30 transition-colors hover:text-white/60 disabled:opacity-40"
            >
              {busy ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Mark read
            </button>
          ) : (
            <span className="text-[10px] uppercase tracking-wider text-white/15">Read</span>
          )}

          <div className="ml-auto flex items-center gap-3">
            <span
              className="text-[10px] tabular-nums text-white/20"
              title="The inbox clears this notification by itself"
            >
              Clears {formatDate(item.expiresAt)}
            </span>
            <button
              type="button"
              onClick={dismiss}
              disabled={deleting}
              aria-label={armed ? "Confirm delete" : "Dismiss notification"}
              className={cn(
                "touch-target inline-flex items-center justify-center gap-1 rounded-lg px-3 py-1 text-[11px] transition-colors disabled:opacity-40",
                armed
                  ? "border border-rose-400/30 bg-rose-500/10 font-semibold text-rose-300 hover:text-rose-200"
                  : "text-white/25 hover:bg-white/[0.04] hover:text-rose-300"
              )}
            >
              {deleting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
              {deleting ? "Removing…" : armed ? "Delete?" : "Dismiss"}
            </button>
          </div>
        </div>
        {deleteError && (
          <p className="mt-2 text-[10px] text-rose-300/80">{deleteError}</p>
        )}
      </div>
    </article>
  );
}
