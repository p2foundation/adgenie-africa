"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function ConnectionNotice() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-[calc(1rem_+_env(safe-area-inset-bottom))] left-1/2 z-[80] flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl border border-amber-300/25 bg-[#17130d]/95 px-4 py-3 text-sm text-amber-50 shadow-2xl backdrop-blur-xl sm:w-auto"
    >
      <WifiOff className="size-5 shrink-0 text-amber-300" aria-hidden="true" />
      <span>
        You&apos;re offline. Reconnect to continue — anything you&apos;ve typed
        stays here.
      </span>
    </div>
  );
}
