"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type RefObject } from "react";
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import {
  ArrowRight,
  Check,
  Facebook,
  Instagram,
  MessageCircle,
  Music2,
  Send,
  Sparkles,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ACTS = [
  {
    id: "brief",
    label: "The brief",
    title: "One sentence is enough.",
    body: "No design skills, no blank canvas. Say what you sell, the price and how customers reach you.",
  },
  {
    id: "look",
    label: "Your look",
    title: "It wears your brand, not ours.",
    body: "Your colours, your typeface, your tone. Every campaign comes out recognisably yours.",
  },
  {
    id: "plates",
    label: "The campaign",
    title: "Every size your feed asks for.",
    body: "Feed, story and catalogue plates with real product photography. Prices and phone numbers are drawn by code — never invented by a model.",
  },
  {
    id: "posted",
    label: "Posted",
    title: "One tap to your handle.",
    body: "The post kit opens your phone's share sheet with the files attached and the caption copied. Instagram, WhatsApp Status, TikTok — no business account, no password.",
  },
] as const;

/**
 * The film is designed on a fixed 720x560 canvas and scaled to fit, so a short
 * laptop window and a tall phone both get the whole scene instead of a clipped
 * one. The caption gets its own reserved band when stacked and its own column
 * from lg, so the two never bid against each other for the same pixels.
 *
 * 720 rather than 660 because the plates act fans a 250px plate out to each
 * side of the centre plate, and a plate rotated 10° needs ~156px of half-width.
 * Narrower than that and the held frame is shaved by the stage's overflow clip.
 */
const CANVAS_W = 720;
const CANVAS_H = 560;

function useFitScale(slot: RefObject<HTMLDivElement | null>) {
  const [fit, setFit] = useState({ scale: 1, compact: false });

  useEffect(() => {
    const measure = () => {
      const slotEl = slot.current;
      if (!slotEl) return;
      const compact = window.innerHeight < 600;
      const scale = Math.max(
        0.3,
        Math.min(1.42, slotEl.clientWidth / CANVAS_W, slotEl.clientHeight / CANVAS_H)
      );
      setFit((current) =>
        current.scale === scale && current.compact === compact ? current : { scale, compact }
      );
    };
    measure();
    // The stage is whatever the header and lower third leave, and that box
    // settles after the fonts and plates load — so track the box, not just resize.
    const watcher = new ResizeObserver(measure);
    if (slot.current) watcher.observe(slot.current);
    window.addEventListener("resize", measure);
    return () => {
      watcher.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [slot]);

  return fit;
}

type PlateSpec = {
  src: string;
  alt: string;
  brand: string;
  headline: string;
  price: string;
  cta: string;
  size: string;
};

const FASHION: PlateSpec = {
  src: "/showcase/fashion.webp",
  alt: "Kente two-piece suit campaign photograph",
  brand: "KIRA FASHION",
  headline: "NEW\nDROP",
  price: "GH₵ 450",
  cta: "WhatsApp to order",
  size: "4:5",
};

const FOOD: PlateSpec = {
  src: "/showcase/food.webp",
  alt: "Jollof rice and grilled chicken campaign photograph",
  brand: "MAMA'S JOLLOF",
  headline: "JOLLOF\nNIGHT",
  price: "GH₵ 45 a plate",
  cta: "Book a table",
  size: "9:16",
};

const BEAUTY: PlateSpec = {
  src: "/showcase/beauty.webp",
  alt: "Shea butter jar campaign photograph",
  brand: "SHEA & CO",
  headline: "GLOW\nDAILY",
  price: "GH₵ 120",
  cta: "Shop on WhatsApp",
  size: "1:1",
};

function Plate({ spec, className = "" }: { spec: PlateSpec; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/15 bg-[#0b0d16] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] ${className}`}
    >
      <Image
        src={spec.src}
        alt={spec.alt}
        fill
        sizes="(max-width: 1024px) 40vw, 280px"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/80" />
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
        <span className="rounded-full bg-black/45 px-2 py-1 text-[8px] font-bold tracking-[0.18em] text-white backdrop-blur-sm">
          {spec.brand}
        </span>
        <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[8px] font-semibold text-white/80 backdrop-blur-sm">
          {spec.size}
        </span>
      </div>
      <div className="absolute inset-x-0 bottom-0 p-3">
        <p className="whitespace-pre-line font-display text-[26px] font-black leading-[0.95] tracking-tight text-white drop-shadow-lg">
          {spec.headline}
        </p>
        <span className="mt-2 inline-block rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-bold text-black">
          {spec.price}
        </span>
        <div className="mt-2 flex items-center justify-center gap-1.5 rounded-full bg-emerald-400 py-1.5 text-[10px] font-bold text-emerald-950">
          <MessageCircle className="h-3 w-3" />
          {spec.cta}
        </div>
      </div>
    </div>
  );
}

function BriefVisual() {
  return (
    <div className="glass-card w-[330px] rounded-3xl p-6">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">
        <Sparkles className="h-3.5 w-3.5" />
        New campaign
      </div>
      <p className="mt-5 font-display text-2xl font-semibold leading-snug text-white">
        New drop. Kente two-piece,{" "}
        <span className="text-amber-300">GH₵ 450.</span>
      </p>
      <p className="mt-3 text-sm leading-relaxed text-white/55">
        Boutique in Osu. WhatsApp to order, delivery across Accra.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        {["Fashion", "English", "4:5 + 9:16"].map((chip) => (
          <span
            key={chip}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/70"
          >
            {chip}
          </span>
        ))}
      </div>
      <div className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 py-3 text-sm font-bold text-black">
        <Wand2 className="h-4 w-4" />
        Generate campaign
      </div>
      <p className="mt-3 text-center text-[11px] text-white/40">Quote shown before a credit moves</p>
    </div>
  );
}

function LookVisual() {
  return (
    <div className="glass-card w-[330px] rounded-3xl p-6">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">
        Brand kit · Kente Gold
      </div>
      <div className="mt-5 flex gap-3">
        {["#F5A524", "#0F3D3E", "#7C2D12", "#F8F4EC"].map((hex) => (
          <div key={hex} className="flex-1">
            <div
              className="h-14 rounded-xl border border-white/15"
              style={{ backgroundColor: hex }}
            />
            <p className="mt-1.5 text-center text-[9px] font-medium text-white/45">{hex}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
        <p className="font-display text-4xl font-black tracking-tight text-white">Aa</p>
        <p className="mt-1 text-[11px] text-white/45">Display face · headlines that shout</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {["Bold", "Warm", "Premium", "Proudly Ghanaian"].map((tone) => (
          <span
            key={tone}
            className="rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-[11px] text-amber-100"
          >
            {tone}
          </span>
        ))}
      </div>
    </div>
  );
}

function PlatesVisual({ fan }: { fan: MotionValue<number> }) {
  const leftX = useTransform(fan, [0, 1], [150, -200]);
  const leftRotate = useTransform(fan, [0, 1], [0, -10]);
  const rightX = useTransform(fan, [0, 1], [-150, 200]);
  const rightRotate = useTransform(fan, [0, 1], [0, 10]);
  const centerY = useTransform(fan, [0, 1], [30, -14]);

  return (
    <div className="relative h-[560px] w-[720px]">
      <motion.div
        style={{ x: leftX, rotate: leftRotate }}
        className="absolute left-1/2 top-1/2 -ml-[125px] -mt-[190px] w-[250px]"
      >
        <Plate spec={FOOD} className="h-[380px]" />
      </motion.div>
      <motion.div
        style={{ x: rightX, rotate: rightRotate }}
        className="absolute left-1/2 top-1/2 -ml-[125px] -mt-[150px] w-[250px]"
      >
        <Plate spec={BEAUTY} className="h-[300px]" />
      </motion.div>
      <motion.div
        style={{ y: centerY }}
        className="absolute left-1/2 top-1/2 -ml-[145px] -mt-[220px] w-[290px]"
      >
        <Plate spec={FASHION} className="h-[440px]" />
      </motion.div>
    </div>
  );
}

function PhoneVisual() {
  return (
    <div className="relative flex w-[330px] flex-col items-center">
      <div className="relative w-[290px] rounded-[2.2rem] border border-white/20 bg-[#05060c] p-2.5 shadow-[0_40px_90px_-25px_rgba(0,0,0,0.95)]">
        <div className="mx-auto mb-2 h-1.5 w-16 rounded-full bg-white/20" />
        <Plate spec={FASHION} className="h-[400px] rounded-[1.6rem]" />
        <div className="flex items-center justify-between px-2 py-2.5 text-[10px] text-white/60">
          <span className="flex items-center gap-1.5">
            <Send className="h-3 w-3 text-emerald-300" />
            Share to my apps
          </span>
          <span>Caption copied</span>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2.5">
        {[Instagram, MessageCircle, Music2, Facebook].map((Icon, i) => (
          <span
            key={i}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.07] text-white/85 backdrop-blur"
          >
            <Icon className="h-4 w-4" />
          </span>
        ))}
        <span className="ml-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-300">
          <Check className="h-3.5 w-3.5" />
          Posted
        </span>
      </div>
    </div>
  );
}

/**
 * Four chapter nodes on one line — the old pills wrapped on the narrow right
 * column, which read as a layout mistake. The rail never wraps, and the amber
 * line shows how far through the film you are.
 */
function ChapterRail({
  act,
  onSelect,
}: {
  act: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="relative">
      <div aria-hidden className="absolute left-[12.5%] right-[12.5%] top-[13px] h-px bg-white/10" />
      <div
        aria-hidden
        className="absolute left-[12.5%] top-[13px] h-px bg-gradient-to-r from-amber-400 to-orange-400 transition-[width] duration-500"
        style={{ width: `${(act / (ACTS.length - 1)) * 75}%` }}
      />
      <ol className="relative grid grid-cols-4">
        {ACTS.map((item, index) => (
          <li key={item.id} className="flex justify-center">
            <button
              type="button"
              onClick={() => onSelect(index)}
              aria-label={`Go to ${item.label}`}
              aria-current={index === act ? "step" : undefined}
              className="group flex touch-target flex-col items-center gap-1.5"
            >
              <span
                className={cn(
                  "flex h-[26px] w-[26px] items-center justify-center rounded-full border text-[10px] font-bold transition-colors",
                  index === act &&
                    "border-amber-400/70 bg-amber-400/15 text-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.35)]",
                  index < act && "border-amber-400/40 bg-amber-400/10 text-amber-200/80",
                  index > act && "border-white/15 bg-black/40 text-white/40 group-hover:text-white/70"
                )}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span
                className={cn(
                  "whitespace-nowrap text-[10px] font-medium transition-colors",
                  index === act
                    ? "text-amber-200"
                    : "text-white/35 group-hover:text-white/60"
                )}
              >
                {item.label}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Header({ compact = false }: { compact?: boolean }) {
  // Below lg this collapses to a screen-reader label on short windows; from lg it
  // takes the same centred max-w-6xl grid as every other landing section. The
  // visibility wrapper is separate because not-sr-only resets margin to 0 and
  // would cancel the mx-auto centring of the block inside it.
  return (
    <div className={compact ? "sr-only lg:not-sr-only" : ""}>
      <div className="mx-auto mb-6 max-w-3xl text-center">
        <span className="mb-4 block text-xs font-semibold uppercase tracking-widest text-amber-400">
          The showcase
        </span>
        <h2
          className={`mb-4 font-bold text-white ${
            compact ? "text-2xl" : "text-3xl sm:text-4xl md:text-5xl"
          }`}
        >
          Watch a brief become <span className="gradient-text-hero">a campaign.</span>
        </h2>
        <p className={`mx-auto max-w-xl text-lg text-white/50 ${compact ? "hidden" : "hidden sm:block"}`}>
          Scroll. Four moments, one product story — from your sentence to your
          customer&apos;s feed.
        </p>
      </div>
    </div>
  );
}

export function ShowcaseSection() {
  const target = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [act, setAct] = useState(0);
  const fanStatic = useMotionValue(1);
  const slotRef = useRef<HTMLDivElement>(null);
  const { scale, compact } = useFitScale(slotRef);

  const { scrollYProgress } = useScroll({
    target,
    offset: ["start start", "end end"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 30,
    mass: 0.4,
  });

  useMotionValueEvent(progress, "change", (v) => {
    const next = Math.min(ACTS.length - 1, Math.max(0, Math.floor(v * ACTS.length)));
    setAct((current) => (current === next ? current : next));
  });

  const briefOpacity = useTransform(progress, [0, 0.16, 0.22], [1, 1, 0]);
  const briefY = useTransform(progress, [0, 0.22], [0, -50]);
  const lookOpacity = useTransform(progress, [0.2, 0.27, 0.41, 0.47], [0, 1, 1, 0]);
  const lookY = useTransform(progress, [0.2, 0.27, 0.47], [50, 0, -50]);
  const platesOpacity = useTransform(progress, [0.45, 0.52, 0.73, 0.8], [0, 1, 1, 0]);
  const platesScale = useTransform(progress, [0.45, 0.6], [0.85, 1]);
  const phoneOpacity = useTransform(progress, [0.77, 0.85], [0, 1]);
  const phoneY = useTransform(progress, [0.77, 0.85], [60, 0]);
  const fan = useTransform(progress, [0.46, 0.68], [0, 1]);

  function goTo(index: number) {
    const el = target.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const travel = el.offsetHeight - window.innerHeight;
    const at = top + travel * ((index + 0.45) / ACTS.length);
    window.scrollTo({ top: at, behavior: "smooth" });
  }

  if (reduced) {
    return (
      <section id="showcase" className="relative px-4 py-24">
        <Header />
        <div className="mx-auto mt-12 grid max-w-6xl gap-8 md:grid-cols-2">
          {ACTS.map((item) => (
            <div key={item.id} className="glass-card rounded-3xl p-6">
              <h3 className="font-display text-xl font-semibold text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">{item.body}</p>
              <div className="mt-6 flex justify-center overflow-hidden">
                {item.id === "brief" && <BriefVisual />}
                {item.id === "look" && <LookVisual />}
                {item.id === "plates" && (
                  <div className="scale-[0.55]">
                    <PlatesVisual fan={fanStatic} />
                  </div>
                )}
                {item.id === "posted" && <PhoneVisual />}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section id="showcase" ref={target} className="relative h-[380vh]">
      {/*
        pt-16 clears the fixed nav (56px scrolled, 72px at rest) — a stage pinned
        at top-0 puts its first line of content behind it.
      */}
      <div className="sticky top-0 flex h-[100svh] flex-col overflow-hidden px-4 pb-6 pt-16 sm:pb-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_42%,rgba(251,191,36,0.07),transparent_70%)]" />
        <motion.div
          style={{ scaleX: progress }}
          className="absolute inset-x-0 top-0 h-px origin-left bg-gradient-to-r from-amber-400 via-orange-400 to-teal-300"
        />

        {/* Same 6xl centred heading grid as the sections above and below. */}
        <div className="relative mx-auto w-full max-w-6xl">
          <Header compact={compact} />
        </div>

        {/*
          The copy sits below the film while the stage is tall enough for both,
          and beside it on a wide screen — where the caption would otherwise eat
          a third of the stage and squeeze the film to a thumbnail.
          Below 2xl the row must stay on the same 6xl grid as every other
          section: at 1366–1536 a 1400px row goes full-bleed and the copy rail
          lands on the screen edge, visibly off the centred grid.
        */}
        <div className="relative mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-5 lg:flex-row lg:gap-12 2xl:max-w-[1400px]">
          <div className="flex min-h-0 flex-1 flex-col">
            <div ref={slotRef} className="relative min-h-0 flex-1">
              <div
                className="absolute left-1/2 top-1/2"
                style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
              >
                <div className="relative h-[560px] w-[720px]">
                  <motion.div
                    data-layer="brief"
                    style={{ opacity: briefOpacity, y: briefY }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    {/* The 330px cards would sit small in a 720px stage; each act
                        gets its own presence multiplier so it owns the frame. */}
                    <div className="scale-[1.22]">
                      <BriefVisual />
                    </div>
                  </motion.div>
                  <motion.div
                    data-layer="look"
                    style={{ opacity: lookOpacity, y: lookY }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="scale-[1.22]">
                      <LookVisual />
                    </div>
                  </motion.div>
                  <motion.div
                    data-layer="plates"
                    style={{ opacity: platesOpacity, scale: platesScale }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <PlatesVisual fan={fan} />
                  </motion.div>
                  <motion.div
                    data-layer="phone"
                    style={{ opacity: phoneOpacity, y: phoneY }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="scale-[1.1]">
                      <PhoneVisual />
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-10 flex w-full shrink-0 flex-col justify-center lg:w-[340px] xl:w-[380px]">
            {/*
              All four captions stay mounted and share one grid cell, so the copy
              block is always as tall as the longest one. If only the active caption
              were in the flow it would resize on every act, the stage would resize
              with it, and the film would visibly re-zoom as you scrolled.
            */}
            <div className="grid text-center lg:text-left">
              {ACTS.map((item, index) => (
                <motion.div
                  key={item.id}
                  aria-hidden={index !== act}
                  initial={false}
                  animate={{ opacity: index === act ? 1 : 0, y: index === act ? 0 : 14 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="col-start-1 row-start-1"
                >
                  <span className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-300/80">
                    {String(index + 1).padStart(2, "0")} · {item.label}
                  </span>
                  <h3 className="mt-2 font-display text-2xl font-bold leading-tight text-white sm:text-3xl xl:text-4xl">
                    {item.title}
                  </h3>
                  <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-white/55 sm:text-base lg:mx-0">
                    {item.body}
                  </p>
                </motion.div>
              ))}
            </div>

            <div className={compact ? "mt-3" : "mt-5 lg:mt-7"}>
              <ChapterRail act={act} onSelect={goTo} />

              <Link
                href="/create"
                className="group mt-4 inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-3 text-sm font-bold text-black shadow-[0_10px_40px_-10px_rgba(251,191,36,0.6)] transition-transform hover:scale-[1.02] lg:mt-6"
              >
                Start with your product
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
