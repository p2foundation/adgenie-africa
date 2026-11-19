"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  BellOff,
} from "lucide-react";
import {
  ApiError,
  api,
  type NotificationItem,
  type NotificationsPage,
  type NotificationsSummary,
} from "@/lib/api";
import { formatRelative } from "@/lib/format";
import { NOTIFICATIONS_CHANGED_EVENT } from "@/lib/notification-events";
import { notificationTone } from "@/components/notifications/notification-tone";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setPortalReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  /**
   * The header uses backdrop-filter, which makes it a containing block for
   * fixed children. The panel therefore lives in a body portal with viewport
   * coordinates, clamped to the screen on small devices.
   */
  const placePanel = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const viewport = window.innerWidth;

    if (viewport < 640) {
      setPanelStyle({
        position: "fixed",
        top: Math.round(rect.bottom + 10),
        left: 16,
        right: 16,
      });
      return;
    }

    const width = Math.min(368, viewport - 32);
    const right = Math.max(
      16,
      Math.min(viewport - rect.right, viewport - width - 16)
    );
    setPanelStyle({
      position: "fixed",
      top: Math.round(rect.bottom + 10),
      width,
      right,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onResize = () => placePanel();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open, placePanel]);

  const refreshSummary = useCallback(async () => {
    try {
      const summary = await api<NotificationsSummary>("/notifications/summary");
      setUnread(summary.unread);
    } catch {
      // The bell is an ornament when the inbox is unreachable; never let it
      // take a page down or nag on every navigation.
    }
  }, []);

  const loadLatest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await api<NotificationsPage>("/notifications?filter=all&limit=6");
      setItems(page.items);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Notifications could not be loaded right now."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Deferred one tick: the first paint should not cascade a state update
    // from inside the effect body, and a missing inbox must stay non-fatal.
    const first = window.setTimeout(() => void refreshSummary(), 0);

    const onChange = () => {
      void refreshSummary();
      if (openRef.current) void loadLatest();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") onChange();
    };

    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onChange);
    window.addEventListener("focus", onChange);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(first);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onChange);
      window.removeEventListener("focus", onChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadLatest, refreshSummary]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        !wrapRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function toggle() {
    if (!open) {
      placePanel();
      void loadLatest();
    }
    setOpen((value) => !value);
  }

  function markLocalRead(id: string) {
    setItems((current) =>
      current
        ? current.map((item) =>
            item.id === id && !item.readAt
              ? { ...item, readAt: new Date().toISOString() }
              : item
          )
        : current
    );
    setUnread((count) => Math.max(0, count - 1));
  }

  async function markOne(item: NotificationItem) {
    if (item.readAt) return;
    markLocalRead(item.id);
    try {
      await api(`/notifications/${item.id}/read`, { method: "POST" });
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
    } catch {
      void refreshSummary();
    }
  }

  async function markAll() {
    setMarking(true);
    try {
      await api("/notifications/read-all", { method: "POST" });
      setUnread(0);
      setItems((current) =>
        current
          ? current.map((item) =>
              item.readAt ? item : { ...item, readAt: new Date().toISOString() }
            )
          : current
      );
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
    } catch {
      setError("Could not mark everything read. Try again.");
    } finally {
      setMarking(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className={cn(
          "relative glass p-2.5 rounded-xl border border-white/8 text-white/40 hover:text-white/70 transition-colors touch-target flex items-center justify-center",
          open && "border-amber-400/30 text-amber-200"
        )}
      >
        <Bell className="w-4 h-4" />
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold tabular-nums text-black ring-2 ring-[#060810]">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {portalReady && open && panelStyle
        ? createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-label="Notifications"
              style={panelStyle}
              className="z-50 overflow-hidden rounded-2xl border border-white/10 bg-[#0a0f1e]/[0.98] shadow-2xl backdrop-blur-2xl"
            >
          <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
            <div>
              <p className="font-display text-sm font-semibold text-white">Notifications</p>
              <p className="mt-0.5 text-[10px] text-white/30">
                {unread > 0 ? `${unread} unread` : "You're all caught up"}
              </p>
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                disabled={marking}
                className="touch-target inline-flex items-center justify-center rounded-lg border border-white/8 px-2.5 py-1.5 text-[10px] font-medium text-amber-300/80 transition-colors hover:border-amber-400/30 hover:text-amber-200 disabled:opacity-40"
              >
                {marking ? "Marking…" : "Mark all read"}
              </button>
            )}
          </div>

          <div className="max-h-[min(70vh,25rem)] overflow-y-auto">
            {loading && items === null ? (
              <div className="space-y-3 px-4 py-5">
                {[0, 1, 2].map((row) => (
                  <div key={row} className="flex gap-3">
                    <span className="h-8 w-8 shrink-0 animate-pulse rounded-xl bg-white/5" />
                    <span className="flex-1 space-y-2">
                      <span className="block h-3 w-2/3 animate-pulse rounded bg-white/5" />
                      <span className="block h-2.5 w-full animate-pulse rounded bg-white/[0.03]" />
                    </span>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="px-5 py-9 text-center">
                <BellOff className="mx-auto h-6 w-6 text-white/20" />
                <p className="mt-3 text-xs leading-relaxed text-white/40">{error}</p>
                <button
                  type="button"
                  onClick={() => void loadLatest()}
                  className="touch-target mt-1 inline-flex items-center justify-center px-3 text-[11px] font-semibold text-amber-300 hover:text-amber-200"
                >
                  Try again
                </button>
              </div>
            ) : items && items.length > 0 ? (
              <ul className="divide-y divide-white/5">
                {items.map((item) => {
                  const tone = notificationTone(item.kind);
                  return (
                    <li key={item.id}>
                      <Link
                        href={item.href ?? "/notifications"}
                        onClick={() => {
                          void markOne(item);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex gap-3 px-4 py-3.5 transition-colors hover:bg-white/[0.035]",
                          !item.readAt && "bg-amber-400/[0.035]"
                        )}
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                            tone.className
                          )}
                        >
                          <tone.icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-start gap-2">
                            <span
                              className={cn(
                                "min-w-0 flex-1 text-xs leading-snug",
                                item.readAt ? "text-white/60" : "font-semibold text-white"
                              )}
                            >
                              {item.title}
                            </span>
                            {!item.readAt && (
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                            )}
                          </span>
                          <span className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/35">
                            {item.body}
                          </span>
                          <span className="mt-1.5 block text-[10px] tabular-nums text-white/20">
                            {formatRelative(item.createdAt)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="px-5 py-9 text-center">
                <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.03] text-white/20">
                  <Bell className="h-4 w-4" />
                </span>
                <p className="mt-3 text-xs font-medium text-white/50">Nothing new yet.</p>
                <p className="mt-1 text-[11px] leading-relaxed text-white/25">
                  Verification decisions and campaign updates will land here.
                </p>
              </div>
            )}
          </div>

          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between border-t border-white/8 px-4 py-3 text-[11px] font-semibold text-white/50 transition-colors hover:bg-white/[0.03] hover:text-amber-200"
          >
            Open the inbox
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
