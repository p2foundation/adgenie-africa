"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CreditCard, LogOut, Settings, ShieldCheck } from "lucide-react";
import { isStaffRole, type AppRole } from "@adgenie/core";
import { signOutAndReset } from "@/lib/sign-out";
import { cn } from "@/lib/utils";

export function AccountMenu({
  displayName,
  email,
  appRole,
}: {
  displayName: string | null;
  email: string | null;
  appRole: AppRole;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const initial = (displayName?.trim() || email || "A").charAt(0).toUpperCase();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
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

  const itemClass =
    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white touch-target";

  async function signOut() {
    setBusy(true);
    await signOutAndReset();
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className={cn(
          "flex items-center gap-1.5 rounded-full p-0.5 pr-1.5 transition-shadow touch-target",
          open && "ring-2 ring-amber-400/50"
        )}
      >
        <span className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-black font-bold text-sm shadow-lg shadow-amber-500/20 ring-2 ring-white/10">
          {initial}
        </span>
        <span
          className={cn(
            "text-[10px] text-white/40 transition-transform",
            open && "rotate-180 text-amber-300"
          )}
          aria-hidden="true"
        >
          ▼
        </span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-[calc(100%+10px)] z-50 w-64 rounded-2xl border border-white/10 bg-[#0a0f1e]/95 p-1.5 shadow-2xl backdrop-blur-2xl"
        >
          <div className="border-b border-white/8 px-3 pb-2.5 pt-2 mb-1.5">
            <p className="truncate text-sm font-semibold text-white">
              {displayName ?? "Your account"}
            </p>
            <p className="truncate text-xs text-white/40">{email ?? "—"}</p>
          </div>

          <Link href="/settings" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
            <Settings className="w-4 h-4 text-white/40" />
            Account &amp; settings
          </Link>
          <Link href="/credits" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
            <CreditCard className="w-4 h-4 text-white/40" />
            Credits &amp; top up
          </Link>
          {isStaffRole(appRole) && (
            <Link href="/admin" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              Control room
            </Link>
          )}

          <div className="my-1.5 h-px bg-white/8" />
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            disabled={busy}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200 touch-target disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            {busy ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
