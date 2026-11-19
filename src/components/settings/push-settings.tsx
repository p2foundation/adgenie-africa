"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BellRing,
  CheckCircle2,
  Info,
  Loader2,
  Send,
} from "lucide-react";
import {
  ApiError,
  api,
  type NotificationTestResult,
  type PushConfig,
} from "@/lib/api";
import {
  PUSH_STATE_CHANGED_EVENT,
  PushError,
  disablePush,
  enablePush,
  pushEnabledLocally,
  pushSupported,
} from "@/lib/push";
import { NOTIFICATIONS_CHANGED_EVENT } from "@/lib/notification-events";
import { cn } from "@/lib/utils";

type Message = { tone: "ok" | "error" | "info"; text: string };

const TONE_STYLES: Record<Message["tone"], string> = {
  ok: "border-teal-400/20 bg-teal-500/[0.07] text-teal-100/80",
  error: "border-rose-400/20 bg-rose-500/[0.07] text-rose-100/80",
  info: "border-white/10 bg-white/[0.03] text-white/55",
};

const TONE_ICONS = {
  ok: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

function explainPermission(permission: NotificationPermission | "unknown"): string {
  if (permission === "denied") {
    return "Notifications are blocked for this site. Allow them in your browser's site settings, then reload this page.";
  }
  if (permission === "granted" && !pushEnabledLocally()) {
    return "This browser can notify you. Turn push on to register it for your account.";
  }
  return "Off. Turn it on and this browser gets a ping when something needs you.";
}

export function PushSettings({ config }: { config: PushConfig }) {
  const [mounted, setMounted] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unknown">("unknown");
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<Message | null>(null);

  useEffect(() => {
    const refresh = () => {
      const state =
        typeof Notification === "undefined" ? "unknown" : Notification.permission;
      setPermission(state);
      setEnabled(pushEnabledLocally() && state === "granted");
    };

    // Read browser state after paint; doing it inline would cascade a render
    // during the effect and cannot be done on the server anyway.
    const frame = window.requestAnimationFrame(() => {
      setMounted(true);
      refresh();
    });
    void pushSupported().then(setSupported);

    const onPushState = () => refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener(PUSH_STATE_CHANGED_EVENT, onPushState);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener(PUSH_STATE_CHANGED_EVENT, onPushState);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  async function turnOn() {
    setBusy(true);
    setMessage(null);
    try {
      await enablePush(config);
      setEnabled(true);
      setPermission(Notification.permission);
      setMessage({
        tone: "ok",
        text: "This browser is registered. Send yourself a test, or keep the tab in the background to see the system banner.",
      });
    } catch (err) {
      if (err instanceof PushError) {
        if (err.code === "blocked") {
          setPermission("denied");
          setMessage({
            tone: "error",
            text: "Notifications are blocked for this site. Allow them in your browser's site settings, then reload this page.",
          });
        } else if (err.code === "dismissed") {
          setMessage({
            tone: "info",
            text: "No problem — nothing changed. Turn push on whenever you're ready.",
          });
        } else if (err.code === "unsupported") {
          setMessage({
            tone: "error",
            text: "This browser cannot receive web push. On iPhone or iPad, add AdGenie to your Home Screen first, then try again.",
          });
        } else if (err.code === "unavailable") {
          setMessage({
            tone: "error",
            text: "Push is not available on this deployment yet.",
          });
        } else {
          setMessage({
            tone: "error",
            text: "This browser could not be registered. Try again in a moment.",
          });
        }
      } else {
        setMessage({
          tone: "error",
          text: "This browser could not be registered. Try again in a moment.",
        });
      }
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    setMessage(null);
    try {
      await disablePush();
      setEnabled(false);
      setMessage({
        tone: "info",
        text: "Push is off for this browser. Your inbox keeps everything either way.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    setMessage(null);
    try {
      const result = await api<NotificationTestResult>("/notifications/test", {
        method: "POST",
      });
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));

      if (!result.push.configured) {
        setMessage({
          tone: "info",
          text: "Saved to your inbox. Push is not configured on this deployment, so no system notification was sent.",
        });
      } else if (result.push.devices === 0) {
        setMessage({
          tone: "info",
          text: "Saved to your inbox. No browser is registered for push yet — turn it on above first.",
        });
      } else if (result.push.sent > 0) {
        setMessage({
          tone: "ok",
          text: `Sent to ${result.push.sent} registered ${
            result.push.sent === 1 ? "browser" : "browsers"
          }. Keep this tab in the background to see the system banner.`,
        });
      } else if (result.push.failed > 0) {
        setMessage({
          tone: "error",
          text: "Saved to your inbox, but the push could not be delivered. Check this browser's notification settings and try again.",
        });
      } else {
        setMessage({ tone: "info", text: "Test notification saved to your inbox." });
      }
    } catch (err) {
      setMessage({
        tone: "error",
        text:
          err instanceof ApiError
            ? err.message
            : "Could not send the test. Try again in a moment.",
      });
    } finally {
      setTesting(false);
    }
  }

  const blocked = permission === "denied";
  const unavailable = !config.enabled;
  const unsupported = supported === false;
  const checking = !mounted || supported === null;
  const canToggle = config.enabled && mounted && supported === true && !blocked;
  const status = blocked
    ? "Blocked in this browser's notification settings."
    : unsupported
      ? "This browser cannot receive push."
      : unavailable
        ? "Push is not configured on this deployment yet."
        : explainPermission(permission);

  const MessageIcon = message ? TONE_ICONS[message.tone] : null;

  return (
    <section
      id="notifications"
      className="glass-card scroll-mt-[calc(208px_+_env(safe-area-inset-top))] overflow-hidden rounded-2xl lg:scroll-mt-24"
      aria-labelledby="notifications-title"
    >
      <div className="flex items-center gap-3 border-b border-white/6 px-5 py-4 md:px-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300">
          <BellRing className="h-4 w-4" />
        </span>
        <div>
          <h2 id="notifications-title" className="font-display text-sm font-semibold text-white">
            Notifications
          </h2>
          <p className="mt-0.5 text-[11px] text-white/50">
            How we reach you, and where it lands.
          </p>
        </div>
        <Link
          href="/notifications"
          className="touch-target ml-auto inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-white/10 px-3 text-[11px] font-medium text-amber-300/80 transition-colors hover:border-amber-400/30 hover:text-amber-200"
        >
          Open inbox
        </Link>
      </div>

      <div className="space-y-4 p-5 md:p-6">
        <div className="flex items-center gap-4 rounded-xl border border-white/8 bg-white/[0.02] p-4">
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
              enabled ? "bg-amber-500/15 text-amber-300" : "bg-white/[0.04] text-white/45"
            )}
          >
            <BellRing className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white/80">Push on this browser</p>
            <p className="mt-0.5 text-xs leading-relaxed text-white/50">
              {checking ? "Checking this browser…" : status}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-label="Push notifications on this browser"
            onClick={enabled ? turnOff : turnOn}
            disabled={busy || (!enabled && !canToggle)}
            className={cn(
              "relative h-7 w-12 shrink-0 rounded-full border transition-colors before:absolute before:-inset-y-2 before:-inset-x-1 before:content-[''] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060810]",
              enabled
                ? "border-amber-400/40 bg-gradient-to-r from-amber-400 to-orange-500"
                : "border-white/10 bg-white/[0.07]",
              (busy || (!enabled && !canToggle)) && "cursor-not-allowed opacity-45"
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-white shadow-sm transition-transform",
                enabled ? "translate-x-[22px]" : "translate-x-0.5"
              )}
            >
              {busy && <Loader2 className="h-3 w-3 animate-spin text-black/50" />}
            </span>
          </button>
        </div>

        {message && MessageIcon && (
          <p
            role="status"
            className={cn(
              "flex items-start gap-2 rounded-xl border px-4 py-3 text-xs leading-relaxed",
              TONE_STYLES[message.tone]
            )}
          >
            <MessageIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {message.text}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/6 pt-4">
          <p className="max-w-md text-xs leading-relaxed text-white/45">
            We only use push for account activity — verification, campaigns and
            credits. No marketing blasts. On iPhone and iPad, install AdGenie to
            your Home Screen first; Safari only allows web push for installed apps.
          </p>
          <button
            type="button"
            onClick={sendTest}
            disabled={testing || busy}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-xs font-semibold text-white/70 transition-colors hover:border-amber-400/30 hover:text-amber-100 disabled:cursor-not-allowed disabled:opacity-40 touch-target"
          >
            {testing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Send a test
          </button>
        </div>
      </div>
    </section>
  );
}
