"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type TocItem = { id: string; title: string };

/**
 * Sticky section index for the policy pages. Marks the last heading that has
 * crossed the reading line in the upper third of the viewport. Position-based
 * rather than an IntersectionObserver: the sections are tall, so several are
 * always in any observer band at once and the "topmost" one is the oldest, not
 * the one being read.
 */
export function LegalToc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const elements = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);
    if (elements.length === 0) return;

    // Measures inline rather than behind requestAnimationFrame: a backgrounded
    // tab stops painting frames, and the rail would freeze on the first section.
    const measure = () => {
      const doc = document.documentElement;
      if (window.innerHeight + window.scrollY >= doc.scrollHeight - 4) {
        setActive(elements[elements.length - 1]!.id);
        return;
      }
      const line = window.innerHeight * 0.32;
      let current = elements[0]!;
      for (const el of elements) {
        if (el.getBoundingClientRect().top > line) break;
        current = el;
      }
      setActive(current.id);
    };

    measure();
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);

    return () => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
    };
  }, [items]);

  return (
    <nav aria-label="On this page">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/30">
        On this page
      </p>
      <ol className="border-l border-white/10">
        {items.map((item, index) => {
          const isActive = item.id === active;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={isActive ? "location" : undefined}
                className={cn(
                  "-ml-px flex min-h-[44px] items-center gap-3 border-l py-1.5 pl-4 text-[13px] leading-snug transition-colors",
                  isActive
                    ? "border-amber-400 text-amber-200"
                    : "border-transparent text-white/40 hover:text-white/75"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 text-[10px] tabular-nums",
                    isActive ? "text-amber-400/70" : "text-white/20"
                  )}
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                {item.title}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
