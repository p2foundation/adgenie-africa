"use client";

import { useEffect, useState } from "react";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "framer-motion";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Captions,
  Clapperboard,
  Clock3,
  Image,
  Languages,
  MessageCircle,
  MousePointerClick,
  Palette,
  Pause,
  Play,
  Smartphone,
  Sparkles,
  Utensils,
} from "lucide-react";
import { HeroShader } from "./hero-shader";
import { BeforeAfter, type AdFormat } from "./before-after";
import { FormatDeck } from "./format-deck";

const trustChips = [
  "Mobile money",
  "No card needed",
  "Priced before you pay",
  "Made in Accra",
];

const marqueeItems = [
  { label: "Product ads", icon: Image },
  { label: "Event flyers", icon: CalendarDays },
  { label: "9:16 video", icon: Clapperboard },
  { label: "Twi & Ga copy", icon: Languages },
  { label: "WhatsApp CTAs", icon: MessageCircle },
  { label: "Brand kits", icon: Palette },
  { label: "Lookbooks", icon: BookOpen },
  { label: "Menu highlights", icon: Utensils },
  { label: "Posting calendar", icon: CalendarDays },
  { label: "Captions + hashtags", icon: Captions },
  { label: "1:1 · 4:5 · 9:16", icon: Smartphone },
  { label: "Ready in minutes", icon: Clock3 },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] } },
};

const TOUR_ORDER: AdFormat[] = ["4:5", "1:1", "9:16"];
const TOUR_MS = 5200;

/** Cursor magnet for the primary action: a few pixels of pull, spring back. */
function Magnetic({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18 });
  const sy = useSpring(y, { stiffness: 260, damping: 18 });

  return (
    <motion.div
      className="w-full sm:w-auto"
      style={{ x: sx, y: sy }}
      onPointerMove={(e) => {
        if (reduced || e.pointerType !== "mouse") return;
        const rect = e.currentTarget.getBoundingClientRect();
        x.set(((e.clientX - rect.left) / rect.width - 0.5) * 14);
        y.set(((e.clientY - rect.top) / rect.height - 0.5) * 10);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

export function HeroSection() {
  const [format, setFormat] = useState<AdFormat>("4:5");
  const [touring, setTouring] = useState(true);
  const reduced = useReducedMotion();
  const playing = touring && !reduced;

  const flip = useAnimationControls();
  const tiltX = useMotionValue(0);
  const tiltY = useMotionValue(0);
  const rotateX = useSpring(tiltX, { stiffness: 140, damping: 18 });
  const rotateY = useSpring(tiltY, { stiffness: 140, damping: 18 });
  const sheenX = useMotionValue(50);
  const sheenY = useMotionValue(35);
  const sheen = useMotionTemplate`radial-gradient(340px circle at ${sheenX}% ${sheenY}%, rgba(255,228,175,0.18), transparent 62%)`;

  // Auto-preview the three ad formats until the visitor takes over. Paused in
  // hidden tabs, off entirely for reduced motion, and always pausable.
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setFormat((current) => TOUR_ORDER[(TOUR_ORDER.indexOf(current) + 1) % TOUR_ORDER.length]);
    }, TOUR_MS);
    return () => window.clearInterval(id);
  }, [playing]);

  // The format change reads as a scene cut, not a resize: a small flip plus a
  // light sweep. No remount, so the drag state and the aspect morph survive.
  useEffect(() => {
    if (reduced) return;
    void flip.start({
      scale: [1, 0.96, 1],
      rotateY: [0, -8, 0],
      transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
    });
  }, [format, flip, reduced]);

  const chooseFormat = (next: AdFormat) => {
    setTouring(false);
    setFormat(next);
  };
  const stopTour = () => setTouring(false);

  function onStageMove(e: React.PointerEvent<HTMLDivElement>) {
    if (reduced || e.pointerType !== "mouse") return;
    // While a drag is in flight the card flattens, so the comparison's
    // percentage math always measures an unrotated rectangle.
    if (e.buttons !== 0) {
      tiltX.set(0);
      tiltY.set(0);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    tiltY.set(nx * 12);
    tiltX.set(-ny * 9);
    sheenX.set((nx + 0.5) * 100);
    sheenY.set((ny + 0.5) * 100);
  }

  function onStageLeave() {
    tiltX.set(0);
    tiltY.set(0);
  }

  return (
    <section className="relative overflow-hidden">
      {/* Shader background over a CSS gradient that doubles as its fallback */}
      <div className="shader-fallback absolute inset-0">
        <HeroShader className="absolute inset-0 h-full w-full" />
        {/* Readability scrim */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#06051a]/40 via-transparent to-[#060810]" />
      </div>

      <div className="relative z-10 mx-auto grid max-w-6xl gap-12 px-4 pb-14 pt-24 sm:pt-28 lg:grid-cols-[minmax(0,1.15fr)_minmax(400px,0.95fr)] lg:items-center lg:gap-6 lg:pb-20 lg:pt-32">
        {/* Copy column */}
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="mb-6 inline-flex">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-black/30 px-4 py-2 text-sm font-medium text-amber-300 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              The agentic ad studio for Ghana
            </span>
          </motion.div>

          <motion.h1
            variants={item}
            className="text-4xl font-bold leading-[1.06] tracking-tight text-white sm:text-5xl lg:text-[3.05rem] xl:text-[3.5rem]"
          >
            One photo in.
            <br />
            <span className="gradient-text-hero glow-text-gold">A whole campaign out.</span>
          </motion.h1>

          <motion.p
            variants={item}
            className="mt-6 max-w-xl text-base leading-relaxed text-white/65 sm:text-lg"
          >
            AdGenie reads your product, writes the copy in English, French, Twi or
            Ga, designs the ads, cuts the vertical video and hands you ready-to-post
            files with your WhatsApp button. You approve the price before
            anything is generated.
          </motion.p>

          <motion.div
            variants={item}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <Magnetic>
              <Link
                href="/sign-up"
                className="btn-primary group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl px-7 py-4 text-sm font-semibold touch-target"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 group-hover:translate-x-[300%]"
                />
                <span className="relative z-10">Create your first ad</span>
                <ArrowRight className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Magnetic>
            <Link
              href="#showcase"
              className="glass inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-7 py-4 text-sm font-medium text-white/75 transition-all hover:border-white/30 hover:text-white touch-target"
            >
              <Play className="h-4 w-4 text-amber-400" />
              Watch a campaign get made
            </Link>
          </motion.div>

          <motion.p
            variants={item}
            className="mt-3 text-xs font-medium text-amber-400/90"
          >
            10 free credits when you verify your email or phone
          </motion.p>

          <motion.div variants={item} className="mt-8 flex flex-wrap gap-2">
            {trustChips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 backdrop-blur-sm"
              >
                {chip}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* Demo column */}
        <motion.div
          initial={{ opacity: 0, y: 40, rotate: 2 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          transition={{ delay: 0.35, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto w-full max-w-[320px] sm:max-w-[340px] lg:mx-0 lg:max-w-[440px]"
          style={{ perspective: 1200 }}
        >
          <motion.div
            className={`group/stage relative mx-auto w-full transition-[max-width] duration-500 ease-out motion-reduce:transition-none ${
              format === "9:16" ? "lg:max-w-[360px]" : ""
            }`}
            onPointerMove={onStageMove}
            onPointerLeave={onStageLeave}
            style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          >
            <div className="float-y relative [transform-style:preserve-3d]">
              <motion.div
                animate={flip}
                style={{ transformPerspective: 900 }}
                className="relative"
              >
                <BeforeAfter format={format} onInteract={stopTour} />

                <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden rounded-3xl">
                  <motion.div
                    className="absolute inset-0 opacity-0 mix-blend-screen transition-opacity duration-300 group-hover/stage:opacity-100"
                    style={{ background: sheen }}
                  />
                  <AnimatePresence initial={false}>
                    {!reduced && (
                      <motion.div
                        key={format}
                        initial={{ x: "-130%", opacity: 0 }}
                        animate={{ x: "130%", opacity: [0, 0.85, 0] }}
                        transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
                        className="absolute inset-y-0 w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-amber-100/25 to-transparent"
                      />
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={reduced ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1, y: [0, -7, 0] }}
                transition={{
                  opacity: { delay: 1.1, duration: 0.5 },
                  scale: { delay: 1.1, duration: 0.5 },
                  y: { delay: 1.6, duration: 4.8, repeat: Infinity, ease: "easeInOut" },
                }}
                style={{ z: 44 }}
                className="glass absolute -left-4 xl:-left-6 top-[64%] z-20 hidden items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-white/80 lg:flex"
              >
                <Languages className="h-3.5 w-3.5 text-amber-400" />
                Copy in 4 languages
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={reduced ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1, y: [0, -6, 0] }}
                transition={{
                  opacity: { delay: 1.3, duration: 0.5 },
                  scale: { delay: 1.3, duration: 0.5 },
                  y: { delay: 1.8, duration: 5.4, repeat: Infinity, ease: "easeInOut" },
                }}
                style={{ z: 56 }}
                className="glass absolute -right-4 xl:-right-8 top-[36%] z-20 hidden items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium text-white/80 lg:flex"
              >
                <MousePointerClick className="h-3.5 w-3.5 text-amber-400" />
                Drag the slider
              </motion.div>

              <div className="absolute -bottom-6 left-1/2 h-16 w-2/3 -translate-x-1/2 rounded-full bg-amber-500/20 blur-3xl" />
            </div>
          </motion.div>

          <div className="mt-5">
            <FormatDeck value={format} onChange={chooseFormat} />
            <p className="mt-2 text-center text-[11px] font-medium text-white/40">
              Slide to switch format · drag the card to compare
            </p>
            {!reduced && (
              <div className="mt-1 flex min-h-11 items-center justify-center gap-3">
                <div
                  aria-hidden
                  className="h-0.5 w-16 overflow-hidden rounded-full bg-white/10"
                >
                  {playing && (
                    <motion.div
                      key={format}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: TOUR_MS / 1000, ease: "linear" }}
                      className="h-full w-full origin-left rounded-full bg-gradient-to-r from-amber-400 to-violet-400"
                    />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setTouring((current) => !current)}
                  aria-pressed={playing}
                  aria-label={playing ? "Pause automatic format preview" : "Start automatic format preview"}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-[11px] font-medium text-white/45 transition-colors hover:bg-white/5 hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 touch-target"
                >
                  {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {playing ? "Pause preview" : "Auto-preview"}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <motion.section
        aria-labelledby="campaign-capabilities-title"
        className="relative z-10 isolate overflow-hidden border-y border-white/[0.08] bg-[#080914]/80 py-10 backdrop-blur-xl sm:py-14"
        initial={
          reduced
            ? false
            : { opacity: 0, y: 64, scale: 0.985, filter: "blur(10px)" }
        }
        whileInView={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 1.15, ease: [0.16, 1, 0.3, 1] }}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(139,92,246,0.12),transparent_65%)]" />
          <div className="absolute -left-24 top-4 h-48 w-48 rounded-full bg-amber-400/[0.08] blur-3xl" />
          <div className="absolute -right-20 bottom-0 h-56 w-56 rounded-full bg-violet-500/[0.09] blur-3xl" />
          <CalendarDays className="absolute right-[12%] top-5 h-16 w-16 rotate-12 text-white/[0.025]" />
          <Languages className="absolute bottom-4 left-[9%] h-14 w-14 -rotate-12 text-amber-200/[0.035]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-7 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-amber-200/75">
                <span className="h-px w-6 bg-amber-300/70" />
                One brief. Every touchpoint.
              </p>
              <h2
                id="campaign-capabilities-title"
                className="font-display text-xl font-semibold tracking-tight text-white sm:text-2xl"
              >
                Your whole campaign, in motion.
              </h2>
            </div>
            <p className="max-w-md text-sm leading-relaxed text-white/45 sm:text-right">
              From the first product frame to the post-ready caption, made for
              the way you do business.
            </p>
          </div>

          <div
            className="marquee-mask overflow-hidden"
            role="region"
            aria-label="AdGenie campaign capabilities"
          >
            <div className="marquee-track flex">
              {[0, 1].map((loop) => (
                <div
                  key={loop}
                  aria-hidden={loop === 1}
                  className="marquee-sequence flex shrink-0 items-center gap-3 pr-3"
                >
                  {marqueeItems.map(({ label, icon: Icon }, index) => (
                    <span
                      key={label}
                      className="marquee-card group relative flex min-h-[76px] shrink-0 items-center gap-3 overflow-hidden rounded-2xl border border-white/[0.09] bg-white/[0.035] px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.18)] transition-colors duration-300 hover:border-amber-200/25 hover:bg-white/[0.06] sm:min-h-[84px] sm:px-5"
                    >
                      <span className="pointer-events-none absolute -right-5 -top-6 h-16 w-16 rounded-full bg-amber-300/[0.08] blur-2xl transition-colors group-hover:bg-amber-300/[0.16]" />
                      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200/[0.12] bg-amber-200/[0.06] text-amber-100/80 transition-colors group-hover:border-amber-200/25 group-hover:text-amber-100">
                        <Icon aria-hidden className="h-[18px] w-[18px]" strokeWidth={1.6} />
                      </span>
                      <span className="relative flex flex-col gap-1">
                        <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-white/30">
                          {String(index + 1).padStart(2, "0")} / AdGenie
                        </span>
                        <span className="marquee-label whitespace-nowrap text-sm font-medium text-white/80">
                          {label}
                        </span>
                      </span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>
    </section>
  );
}
