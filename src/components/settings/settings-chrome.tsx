"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  BellRing,
  CircleUserRound,
  Palette,
  ReceiptText,
  ShieldCheck,
  UserRound,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SECTIONS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: "account", label: "Account", icon: CircleUserRound },
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "brand", label: "Brand kit", icon: Palette },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "notifications", label: "Notifications", icon: BellRing },
  { id: "billing", label: "Billing", icon: ReceiptText },
];

function scrollOffset(element: HTMLElement) {
  return Number.parseFloat(getComputedStyle(element).scrollMarginTop);
}

export function SettingsChrome({
  email,
  displayName,
  roleLabel,
  credits,
  planLabel,
  memberSince,
  children,
}: {
  email: string | null;
  displayName: string | null;
  roleLabel: string;
  credits: number | null;
  planLabel: string;
  memberSince: string;
  children: ReactNode;
}) {
  const [active, setActive] = useState("account");
  const [progress, setProgress] = useState(0);
  const ticking = useRef(false);

  useEffect(() => {
    const elements = SECTIONS.flatMap(({ id }) => {
      const element = document.getElementById(id);
      return element ? [{ id, element }] : [];
    });
    if (elements.length === 0) return;

    const update = () => {
      ticking.current = false;
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      const y = window.scrollY;
      setProgress(scrollable > 0 ? Math.min(1, Math.max(0, y / scrollable)) : 0);

      const threshold = scrollOffset(elements[0]!.element) + 24;
      let current = elements[0]!.id;
      for (const { id, element } of elements) {
        if (element.getBoundingClientRect().top <= threshold) current = id;
      }
      if (scrollable - y < 32) current = elements[elements.length - 1]!.id;
      setActive(current);
    };

    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!SECTIONS.some((section) => section.id === hash)) return;

    const frame = requestAnimationFrame(() => {
      const element = document.getElementById(hash);
      if (!element) return;
      window.scrollTo({
        top: Math.max(
          0,
          element.getBoundingClientRect().top + window.scrollY - scrollOffset(element)
        ),
        behavior: "auto",
      });
      setActive(hash);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  function go(event: React.MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault();
    const element = document.getElementById(id);
    if (!element) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    window.scrollTo({
      top: Math.max(
        0,
        element.getBoundingClientRect().top + window.scrollY - scrollOffset(element)
      ),
      behavior: reduced ? "auto" : "smooth",
    });
    window.history.replaceState(null, "", `#${id}`);
    setActive(id);
  }

  const initial = (displayName?.trim() || email || "A")
    .charAt(0)
    .toUpperCase();
  const percentage = Math.round(progress * 100);

  return (
    <>
      {/* Mobile: sticky section rail under the app header */}
      <div className="sticky top-[calc(69px_+_env(safe-area-inset-top))] z-20 lg:hidden" aria-label="Account sections">
        <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#080b16] shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
          <div className="flex items-center justify-between gap-3 px-3.5 pb-1.5 pt-2.5">
            <p className="flex min-w-0 items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-white/50">
              <span className="truncate">Account</span>
              <span className="h-1 w-1 shrink-0 rounded-full bg-amber-400/60" />
              <span className="truncate text-amber-300/70">{planLabel}</span>
            </p>
            <Link
              href="/credits"
              className="touch-target inline-flex shrink-0 items-center justify-center rounded-lg border border-white/10 px-2.5 tabular-nums text-[11px] text-white/40 transition-colors hover:border-amber-400/30 hover:text-amber-200"
            >
              {credits ?? "—"} credits
            </Link>
          </div>
          <nav className="no-scrollbar flex gap-1.5 overflow-x-auto px-2 pb-2">
            {SECTIONS.map((section) => {
              const current = active === section.id;
              return (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  onClick={(event) => go(event, section.id)}
                  aria-current={current ? "true" : undefined}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] font-medium transition-colors touch-target",
                    current
                      ? "border-amber-400/20 bg-amber-500/10 text-amber-200"
                      : "border-transparent text-white/40 hover:text-white/70"
                  )}
                >
                  <section.icon className="h-3.5 w-3.5" />
                  {section.label}
                </a>
              );
            })}
          </nav>
          <div className="h-0.5 bg-white/5">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-[width] duration-150"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[232px_minmax(0,1fr)] 2xl:grid-cols-[264px_minmax(0,1fr)]">
        {/* Desktop: sticky account rail */}
        <aside className="hidden lg:block" aria-label="Account sections">
          <div className="sticky top-24 overflow-hidden rounded-2xl border border-white/8 bg-[#080b16]">
            <div className="p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 font-display text-sm font-bold text-black shadow-lg shadow-amber-500/20 ring-2 ring-white/10">
                  {initial}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-sm font-semibold text-white/90">
                    {displayName || "Your studio"}
                  </p>
                  <p className="truncate text-[11px] text-white/50">{email}</p>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-white/50">
                    <Zap className="h-3 w-3 text-amber-400/70" />
                    Credits
                  </span>
                  <span className="font-display text-sm font-bold tabular-nums text-amber-200">
                    {credits ?? "—"}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-white/45">
                  <span>{roleLabel}</span>
                  <Link
                    href="/credits"
                    className="touch-target inline-flex items-center justify-center rounded-lg px-2 text-amber-300/85 transition-colors hover:text-amber-200"
                  >
                    Top up →
                  </Link>
                </div>
              </div>
            </div>

            <nav className="space-y-0.5 border-t border-white/6 p-2">
              {SECTIONS.map((section) => {
                const current = active === section.id;
                return (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    onClick={(event) => go(event, section.id)}
                    aria-current={current ? "true" : undefined}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors touch-target",
                      current
                        ? "bg-amber-500/10 text-amber-200"
                        : "text-white/45 hover:bg-white/[0.04] hover:text-white/85"
                    )}
                  >
                    <span
                      className={cn(
                        "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-amber-400 to-orange-500 transition-opacity",
                        current ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <section.icon
                      className={cn(
                        "h-4 w-4",
                        current
                          ? "text-amber-300"
                          : "text-white/45 transition-colors group-hover:text-white/50"
                      )}
                    />
                    {section.label}
                    {current && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-400/70" />
                    )}
                  </a>
                );
              })}
            </nav>

            <div className="border-t border-white/6 px-4 py-3">
              <div className="flex items-center justify-between text-[11px] text-white/45">
                <span className="truncate">Member since</span>
                <span className="shrink-0 text-white/40">{memberSince}</span>
              </div>
              <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-[width] duration-150"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-5">{children}</div>
      </div>
    </>
  );
}
