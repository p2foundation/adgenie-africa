"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronsLeftRight, Sparkles, Heart, MessageCircle, Send } from "lucide-react";

/**
 * Draggable before/after comparison: the plain product photo (left) versus the
 * finished AdGenie creative (right). Pure DOM/CSS — no images to download.
 * Auto-breathes until the first interaction; keyboard accessible as a slider.
 * The card re-flows into the chosen ad format — the drag logic only ever works
 * in percentages, so every aspect ratio behaves identically.
 */
export type AdFormat = "4:5" | "1:1" | "9:16";

const ASPECT: Record<AdFormat, string> = {
  "4:5": "aspect-[4/5] min-h-[380px] sm:min-h-[420px]",
  "1:1": "aspect-square",
  "9:16": "aspect-[9/16]",
};

const FORMAT_TAG: Record<AdFormat, string> = {
  "4:5": "SPONSORED",
  "1:1": "CATALOGUE",
  "9:16": "REEL",
};

export function BeforeAfter({
  format = "4:5",
  onInteract,
}: {
  format?: AdFormat;
  onInteract?: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const afterRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(40);
  const interactedRef = useRef(false);
  const rafRef = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [interacted, setInteracted] = useState(false);

  const takeOver = () => {
    interactedRef.current = true;
    setInteracted(true);
    onInteract?.();
  };

  const setPos = (p: number) => {
    const clamped = Math.min(96, Math.max(4, p));
    posRef.current = clamped;
    wrapRef.current?.style.setProperty("--pos", `${clamped}%`);
    if (afterRef.current) {
      const clip = `inset(0 ${100 - clamped}% 0 0)`;
      afterRef.current.style.clipPath = clip;
      afterRef.current.style.setProperty("-webkit-clip-path", clip);
    }
    handleRef.current?.setAttribute("aria-valuenow", String(Math.round(clamped)));
  };

  useEffect(() => {
    // Gentle breathing sweep until the user takes over.
    const loop = (now: number) => {
      if (!interactedRef.current) {
        const t = now / 1000;
        setPos(49 + Math.sin(t * 0.7) * 9);
        rafRef.current = requestAnimationFrame(loop);
      }
    };
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!reduceMotion) rafRef.current = requestAnimationFrame(loop);
    else setPos(50);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    takeOver();
    setDragging(true);
    cancelAnimationFrame(rafRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setPos(((e.clientX - rect.left) / rect.width) * 100);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setPos(((e.clientX - rect.left) / rect.width) * 100);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    takeOver();
    cancelAnimationFrame(rafRef.current);
    const STEPS: Record<string, number> = {
      ArrowLeft: -4,
      ArrowRight: 4,
      Home: -100,
      End: 100,
    };
    const step = STEPS[e.key];
    if (step === undefined) return;
    e.preventDefault();
    if (step === -100) setPos(4);
    else if (step === 100) setPos(96);
    else setPos(posRef.current + step);
  };

  return (
    <div
      ref={wrapRef}
      className={`relative ${ASPECT[format]} w-full select-none overflow-hidden rounded-3xl border border-white/10 bg-[#101018] shadow-[0_30px_80px_rgba(0,0,0,0.55)] cursor-ew-resize touch-pan-y transition-[aspect-ratio,min-height] duration-500 ease-out`}
      style={{ "--pos": "40%" } as React.CSSProperties}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* BEFORE — the plain photo */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#35353c_0%,#1f1f24_55%,#101013_100%)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.10),transparent_55%)]" />
        {/* table line — reads as an amateur product shot */}
        <div className="absolute inset-x-0 bottom-[16%] h-px bg-white/10" />
        <div className="absolute inset-x-0 top-[40%] bottom-[16%] flex items-end justify-center">
          <BottleSvg dull />
        </div>
        <div className="absolute left-4 top-4 rounded-lg bg-black/50 px-2.5 py-1 text-[10px] font-medium text-white/50 backdrop-blur-sm">
          IMG_2041.jpg · 2.4 MB
        </div>
        <div className="absolute bottom-4 left-4 text-[11px] font-medium tracking-wide text-white/35">
          Your product photo
        </div>
      </div>

      {/* AFTER — the finished ad (clipped by --pos) */}
      <div
        ref={afterRef}
        className="absolute inset-0 bg-[linear-gradient(160deg,#7c3aed_0%,#4c1d95_45%,#170f2e_100%)]"
        style={{
          clipPath: "inset(0 60% 0 0)",
          WebkitClipPath: "inset(0 60% 0 0)",
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_18%,rgba(255,255,255,0.18),transparent_55%)]" />
        <div className="absolute left-5 right-5 top-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="text-[11px] font-semibold tracking-[0.18em] text-white/85">
              KIRA FASHION
            </span>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={format}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.18 }}
              className="text-[10px] font-semibold tracking-wider text-amber-200/80"
            >
              {FORMAT_TAG[format]}
            </motion.span>
          </AnimatePresence>
        </div>

        <div className="absolute left-5 right-5 top-16">
          <p className="font-display text-4xl font-bold leading-[0.95] text-white drop-shadow-lg sm:text-5xl">
            NEW
            <br />
            DROP
          </p>
          <div className="mt-3">
            <span className="inline-flex rotate-2 items-center rounded-full bg-amber-400 px-3.5 py-1.5 text-xs font-bold text-black shadow-lg">
              NEW
            </span>
          </div>
          <div className="mt-3">
            <span className="inline-flex rounded-full border border-white/30 bg-white/10 px-3.5 py-1.5 text-sm font-bold text-white backdrop-blur-sm">
              from GH¢ 180
            </span>
          </div>
        </div>

        <div className="absolute inset-x-0 top-[40%] bottom-[16%] flex items-end justify-center [filter:drop-shadow(0_20px_30px_rgba(0,0,0,0.45))]">
          <BottleSvg />
        </div>

        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#25d366] px-4 py-2 text-xs font-bold text-[#06130b] shadow-[0_8px_24px_rgba(37,211,102,0.35)]">
            Shop on WhatsApp
          </span>
        </div>
        <div className="absolute bottom-4 right-4 text-[10px] font-medium text-white/45">
          {format} · text by code
        </div>
      </div>

      {/* Divider + handle */}
      <div
        className="absolute inset-y-0 z-10 w-0.5 bg-gradient-to-b from-white/95 via-amber-200 to-white/95 shadow-[0_0_22px_rgba(251,191,36,0.55)]"
        style={{ left: "var(--pos)" }}
      />
      <div
        ref={handleRef}
        role="slider"
        tabIndex={0}
        aria-label="Compare your photo with the finished ad"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={40}
        onKeyDown={onKeyDown}
        className="absolute top-1/2 z-20 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        style={{ left: "var(--pos)" }}
      >
        {!interacted && (
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-1.5 animate-ping rounded-full border border-amber-300/70"
          />
        )}
        <motion.div
          animate={{ scale: dragging ? 1.18 : 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 22 }}
          className={`flex h-11 w-11 items-center justify-center rounded-full border text-white backdrop-blur-md transition-colors ${
            dragging
              ? "border-amber-300/80 bg-black/70 shadow-[0_0_32px_rgba(251,191,36,0.5)]"
              : "border-white/40 bg-black/60 shadow-xl"
          }`}
        >
          <ChevronsLeftRight className="h-5 w-5" />
        </motion.div>
      </div>

      {/* Labels */}
      <div className="absolute right-3 top-3 z-10 rounded-full bg-black/55 px-3 py-1 text-[10px] font-semibold tracking-wide text-amber-300 backdrop-blur-sm">
        <Sparkles className="mr-1 inline h-3 w-3" />
        AdGenie ad
      </div>

      {/* Player chrome belongs to the frame, not to the creative, so it sits
          above the clip and never moves with the comparison */}
      <AnimatePresence initial={false}>
        {format === "9:16" && (
          <motion.div
            key="story-chrome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="pointer-events-none absolute inset-0 z-30"
            aria-hidden
          >
            <div className="absolute inset-x-4 top-2.5 flex gap-1.5">
              <span className="h-1 flex-1 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
              <span className="h-1 flex-1 rounded-full bg-white/30" />
              <span className="h-1 flex-1 rounded-full bg-white/30" />
            </div>
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15, duration: 0.35 }}
              className="absolute bottom-24 right-3 flex flex-col items-center gap-4 text-white/75"
            >
              <Heart className="h-5 w-5 drop-shadow-lg" />
              <MessageCircle className="h-5 w-5 drop-shadow-lg" />
              <Send className="h-5 w-5 drop-shadow-lg" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BottleSvg({ dull = false }: { dull?: boolean }) {
  return (
    <svg
      viewBox="0 0 120 260"
      width="120"
      height="260"
      className="h-full max-h-full w-auto"
      aria-hidden="true"
    >
      {dull ? (
        <g>
          <defs>
            <linearGradient id="ba-dull" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#b8b2a9" />
              <stop offset="0.55" stopColor="#8d867c" />
              <stop offset="1" stopColor="#5f5a52" />
            </linearGradient>
          </defs>
          {/* contact shadow on the table */}
          <ellipse cx="60" cy="244" rx="46" ry="9" fill="rgba(0,0,0,0.45)" />
          <g fill="url(#ba-dull)">
            <rect x="44" y="28" width="32" height="24" rx="6" />
            <rect x="48" y="52" width="24" height="45" />
            <rect x="30" y="90" width="60" height="150" rx="14" />
          </g>
          {/* flat, unflattering highlight of an overhead bulb */}
          <rect x="38" y="100" width="10" height="128" rx="5" fill="rgba(255,255,255,0.12)" />
        </g>
      ) : (
        <g>
          <defs>
            <linearGradient id="ba-gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fde68a" />
              <stop offset="0.5" stopColor="#fbbf24" />
              <stop offset="1" stopColor="#d97706" />
            </linearGradient>
          </defs>
          <ellipse cx="60" cy="244" rx="46" ry="9" fill="rgba(0,0,0,0.35)" />
          <rect x="44" y="28" width="32" height="24" rx="6" fill="url(#ba-gold)" />
          <rect x="48" y="52" width="24" height="45" fill="#fbbf24" />
          <rect x="30" y="90" width="60" height="150" rx="14" fill="url(#ba-gold)" />
          <rect x="30" y="140" width="60" height="62" rx="8" fill="rgba(0,0,0,0.35)" />
          <text
            x="60"
            y="176"
            textAnchor="middle"
            fill="#fff"
            fontSize="30"
            fontWeight="700"
            fontFamily="var(--font-grotesk), sans-serif"
          >
            K
          </text>
          <rect x="38" y="100" width="8" height="128" rx="4" fill="rgba(255,255,255,0.45)" />
        </g>
      )}
    </svg>
  );
}
