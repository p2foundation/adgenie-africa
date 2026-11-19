"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, BellRing, X } from "lucide-react";
import { api, type PushConfig } from "@/lib/api";
import { NOTIFICATIONS_CHANGED_EVENT } from "@/lib/notification-events";
import {
  PUSH_STATE_CHANGED_EVENT,
  listenForForegroundPush,
  pushEnabledLocally,
  refreshPushRegistration,
} from "@/lib/push";

interface Toast {
  id: number;
  title: string;
  body: string;
  href: string;
}

/**
 * Mounted once per signed-in shell. It repairs a rotated FCM token silently,
 * listens for messages that arrive while a tab is focused, and renders those
 * as an in-app toast. Background messages belong to the service worker.
 */
export function PushSync() {
  const router = useRouter();
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    let generation = 0;
    let unlisten: (() => void) | undefined;

    async function setup() {
      const run = ++generation;
      unlisten?.();
      unlisten = undefined;

      if (!pushEnabledLocally()) return;
      let config: PushConfig;
      try {
        config = await api<PushConfig>("/notifications/config");
      } catch {
        return;
      }
      if (cancelled || run !== generation || !config.enabled) return;

      await refreshPushRegistration(config);
      if (cancelled || run !== generation) return;

      const stop = await listenForForegroundPush((message) => {
        setToast({ ...message, id: Date.now() });
        window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
        if (pathRef.current?.startsWith("/notifications")) router.refresh();
      });
      if (cancelled || run !== generation) {
        stop();
        return;
      }
      unlisten = stop;
    }

    void setup();
    const onPushState = () => void setup();
    window.addEventListener(PUSH_STATE_CHANGED_EVENT, onPushState);

    return () => {
      cancelled = true;
      generation += 1;
      window.removeEventListener(PUSH_STATE_CHANGED_EVENT, onPushState);
      unlisten?.();
    };
  }, [router]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 9000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-4 z-[70] sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-[22rem]"
    >
      <div className="glass-card overflow-hidden rounded-2xl border-amber-400/25 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300">
            <BellRing className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300/70">
              Just in
            </p>
            <p className="mt-1 font-display text-sm font-semibold leading-snug text-white">
              {toast.title}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/50">{toast.body}</p>
            <Link
              href={toast.href}
              onClick={() => setToast(null)}
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 transition-colors hover:text-amber-200"
            >
              Open
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="-m-1 rounded-lg p-1 text-white/25 transition-colors hover:text-white/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
