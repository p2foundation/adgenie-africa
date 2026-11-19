"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Cpu,
  FileText,
  Flag,
  History,
  IdCard,
  Layers,
  Megaphone,
  Receipt,
  Repeat,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Icon keys, not components: this prop crosses the server→client boundary. */
export type DetailIcon =
  | "identity"
  | "wallet"
  | "subscription"
  | "campaigns"
  | "payments"
  | "history"
  | "brief"
  | "outputs"
  | "runs"
  | "flags";

const ICONS: Record<DetailIcon, LucideIcon> = {
  identity: IdCard,
  wallet: Wallet,
  subscription: Repeat,
  campaigns: Megaphone,
  payments: Receipt,
  history: History,
  brief: FileText,
  outputs: Layers,
  runs: Cpu,
  flags: Flag,
};

export interface DetailSection {
  id: string;
  label: string;
  icon: DetailIcon;
}

function scrollOffset() {
  return window.matchMedia("(min-width: 1024px)").matches ? 96 : 168;
}

/**
 * Sticky, scroll-spied section rail for a record page. Long staff pages are
 * read top-down and then revisited by section, so the rail carries the map.
 */
export function DetailChrome({
  sections,
  meta,
  children,
}: {
  sections: DetailSection[];
  /** Short facts shown above the rail links (balance, status, owner). */
  meta: ReactNode;
  children: ReactNode;
}) {
  const [active, setActive] = useState(sections[0]?.id ?? "");
  const ticking = useRef(false);

  useEffect(() => {
    const elements = sections.flatMap(({ id }) => {
      const element = document.getElementById(id);
      return element ? [{ id, element }] : [];
    });
    if (elements.length === 0) return;

    const update = () => {
      ticking.current = false;
      const threshold = window.innerWidth >= 1024 ? 128 : 208;
      let current = elements[0]!.id;
      for (const { id, element } of elements) {
        if (element.getBoundingClientRect().top <= threshold) current = id;
      }
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable - window.scrollY < 32) current = elements[elements.length - 1]!.id;
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
  }, [sections]);

  function go(event: React.MouseEvent<HTMLAnchorElement>, id: string) {
    event.preventDefault();
    const element = document.getElementById(id);
    if (!element) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: Math.max(0, element.getBoundingClientRect().top + window.scrollY - scrollOffset()),
      behavior: reduced ? "auto" : "smooth",
    });
    window.history.replaceState(null, "", `#${id}`);
    setActive(id);
  }

  return (
    <>
      {/* Mobile: horizontal chips under the header */}
      <div className="sticky top-[calc(69px_+_env(safe-area-inset-top))] z-20 lg:hidden" aria-label="Sections">
        <div className="overflow-hidden rounded-2xl border border-white/8 bg-[#080b16] shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
          <nav className="no-scrollbar flex gap-1.5 overflow-x-auto px-2 py-2">
            {sections.map((section) => {
              const current = active === section.id;
              const Icon = ICONS[section.icon];
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
                  <Icon className="h-3.5 w-3.5" />
                  {section.label}
                </a>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_260px] 2xl:grid-cols-[minmax(0,1fr)_288px]">
        <div className="min-w-0 space-y-5">{children}</div>

        <aside className="hidden lg:block" aria-label="Sections">
          <div className="sticky top-24 overflow-hidden rounded-2xl border border-white/8 bg-[#080b16]">
            <div className="px-4 py-4">{meta}</div>
            <nav className="space-y-0.5 border-t border-white/6 p-2">
              {sections.map((section) => {
                const current = active === section.id;
                const Icon = ICONS[section.icon];
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
                    <Icon
                      className={cn(
                        "h-4 w-4",
                        current
                          ? "text-amber-300"
                          : "text-white/25 transition-colors group-hover:text-white/50"
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
          </div>
        </aside>
      </div>
    </>
  );
}
