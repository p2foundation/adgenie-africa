"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion, type PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import type { AdFormat } from "./before-after";

/**
 * The hero card's format switcher: a draggable strip of the three ad shapes.
 * Sliding it snaps to the nearest format and the demo card re-flows into that
 * aspect ratio. Frames are plain DOM — no images, so the deck costs nothing to
 * download.
 */
const FRAMES: { id: AdFormat; label: string; note: string; shape: string }[] = [
  { id: "4:5", label: "Feed post", note: "Instagram feed", shape: "aspect-[4/5] w-12" },
  { id: "1:1", label: "Square", note: "Catalogue", shape: "aspect-square w-[52px]" },
  { id: "9:16", label: "Story", note: "Reels & status", shape: "aspect-[9/16] w-7" },
];

const PITCH = 104;
const FRAME_W = 92;

export function FormatDeck({
  value,
  onChange,
}: {
  value: AdFormat;
  onChange: (format: AdFormat) => void;
}) {
  const [index, setIndex] = useState(() =>
    Math.max(0, FRAMES.findIndex((frame) => frame.id === value))
  );
  const wrapRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const reduced = useReducedMotion();

  const centerFor = (i: number) => {
    const width = wrapRef.current?.clientWidth ?? 320;
    return Math.round(width / 2 - i * PITCH - FRAME_W / 2);
  };

  useEffect(() => {
    const target = centerFor(index);
    if (reduced) x.set(target);
    else animate(x, target, { type: "spring", stiffness: 320, damping: 32 });
  }, [index, reduced, x]);

  useEffect(() => {
    const recentre = () => x.set(centerFor(index));
    window.addEventListener("resize", recentre);
    return () => window.removeEventListener("resize", recentre);
  }, [index, x]);

  function select(i: number) {
    setIndex(i);
    onChange(FRAMES[i].id);
  }

  function onDragEnd(_event: unknown, info: PanInfo) {
    const width = wrapRef.current?.clientWidth ?? 320;
    const flick = info.velocity.x < -260 ? 1 : info.velocity.x > 260 ? -1 : 0;
    const i = Math.min(
      FRAMES.length - 1,
      Math.max(0, Math.round((width / 2 - FRAME_W / 2 - x.get()) / PITCH) + flick)
    );
    select(i);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const next = Math.min(
      FRAMES.length - 1,
      Math.max(0, index + (e.key === "ArrowRight" ? 1 : -1))
    );
    select(next);
    wrapRef.current?.querySelectorAll("button")[next]?.focus();
  }

  return (
    <div
      ref={wrapRef}
      role="group"
      aria-label="Ad format"
      onKeyDown={onKeyDown}
      className="relative w-full overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#060810] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#060810] to-transparent" />
      <motion.div
        drag="x"
        dragElastic={0.18}
        dragMomentum={false}
        onDragEnd={onDragEnd}
        style={{ x }}
        className="flex w-max cursor-grab touch-pan-y items-center gap-3 py-1 active:cursor-grabbing"
      >
        {FRAMES.map((frame, i) => (
          <motion.button
            key={frame.id}
            type="button"
            onClick={() => select(i)}
            aria-pressed={i === index}
            whileHover={reduced ? undefined : { y: -3 }}
            whileTap={{ scale: 0.96 }}
            className="relative flex h-[104px] w-[92px] shrink-0 touch-target items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] transition-colors hover:border-white/25"
          >
            {i === index && (
              <motion.span
                layoutId="format-active"
                aria-hidden
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="absolute inset-0 rounded-2xl border border-amber-400/60 bg-amber-400/[0.08] shadow-[0_0_26px_rgba(251,191,36,0.2)]"
              />
            )}
            <span className="relative z-10 flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "relative overflow-hidden rounded-md border border-white/20 bg-gradient-to-br from-violet-500/80 to-purple-950",
                  frame.shape
                )}
              >
                <span className="absolute left-1 top-1 h-1 w-3 rounded-full bg-amber-400/80" />
                <span className="absolute inset-x-1 bottom-1 h-0.5 rounded-full bg-white/40" />
              </span>
              <span
                className={cn(
                  "text-[10px] font-semibold",
                  i === index ? "text-amber-200" : "text-white/45"
                )}
              >
                {frame.label}
              </span>
              <span className="text-[9px] text-white/30">{frame.note}</span>
            </span>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}
