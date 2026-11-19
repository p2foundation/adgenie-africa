"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Pause, Play } from "lucide-react";
import {
  drawCreative,
  type ProductShape,
} from "@/components/landing/creative-canvas";
import type { MotionHook, MotionPace } from "@/lib/api";
import {
  FACE_CLASS,
  canvasFontFor,
  caseFor,
  ctaFor,
  hooksFor,
  mixHex,
  primeFace,
  type StudioLook,
  type StudioVertical,
} from "@/lib/studio";
import { cn } from "@/lib/utils";

type Vertical = StudioVertical;

const LOOKS: Record<
  Vertical,
  { product: ProductShape; bg: [string, string]; accent: string }
> = {
  seller: { product: "bag", bg: ["#3730a3", "#17133f"], accent: "#a5b4fc" },
  company: { product: "phone", bg: ["#0f766e", "#042f2e"], accent: "#5eead4" },
  fashion: { product: "dress", bg: ["#4c1d95", "#170f2e"], accent: "#fbbf24" },
  spot: { product: "speaker", bg: ["#b45309", "#451a03"], accent: "#fde68a" },
};

const LANGUAGE_TAG: Record<string, string> = {
  en: "EN",
  fr: "FR",
  tw: "TWI · BETA",
  gaa: "GA · BETA",
};

const CAPTIONS: Record<MotionHook, [string, string, string, string]> = {
  pov: [
    "wait till you see this one",
    "the piece everyone keeps asking about",
    "in stock this week only",
    "message us before it goes",
  ],
  three_reasons: [
    "three reasons it's worth it",
    "the fit. the fabric. the price.",
    "made for real life, not the runway",
    "order on WhatsApp in one tap",
  ],
  before_after: [
    "before…",
    "after the drop",
    "same price, entirely new energy",
    "grab yours before the week ends",
  ],
  testimonial: [
    "I wore it once…",
    "three people asked where I got it",
    "so I'm sharing the plug",
    "send a message to order",
  ],
};

const CORPORATE_CAPTIONS: Record<MotionHook, [string, string, string, string]> = {
  pov: [
    "here is what we have been building",
    "a team, a process and a standard",
    "the work speaks before we do",
    "let's talk about your next project",
  ],
  three_reasons: [
    "three reasons clients stay",
    "the brief. the craft. the follow-through.",
    "measured work, delivered on time",
    "book an introduction with our team",
  ],
  before_after: [
    "before the overhaul",
    "after a better standard",
    "same team, sharper systems",
    "see the case study, then talk",
  ],
  testimonial: [
    "what a client told us last week",
    "they trusted us with the rollout",
    "we delivered ahead of schedule",
    "speak to the team behind it",
  ],
};

const EVENT_CAPTIONS: Record<MotionHook, [string, string, string, string]> = {
  pov: [
    "your weekend just found a plan",
    "doors open at six",
    "food, sound and the right crowd",
    "reserve a table before it fills",
  ],
  three_reasons: [
    "three reasons to come early",
    "the plates. the playlist. the terrace.",
    "walk-in or book ahead",
    "save your table on WhatsApp",
  ],
  before_after: [
    "before the lights go down",
    "after the room fills up",
    "this is the atmosphere",
    "book for this weekend",
  ],
  testimonial: [
    "the regulars keep coming back",
    "same corner table every Friday",
    "the kitchen remembers your order",
    "message us for a reservation",
  ],
};

function captionsFor(vertical: Vertical) {
  if (vertical === "company") return CORPORATE_CAPTIONS;
  if (vertical === "spot") return EVENT_CAPTIONS;
  return CAPTIONS;
}

const DURATIONS: Record<MotionPace, number> = {
  slow: 14,
  medium: 11,
  fast: 8.5,
};

const BEAT_WEIGHTS = [0.18, 0.36, 0.24, 0.22];

function headlineLines(headline: string, casing: "upper" | "title"): string[] {
  const words = headline.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [caseFor("Your ad", casing)];
  if (words.length === 1) return [caseFor(words[0]!, casing)];
  const half = Math.ceil(words.length / 2);
  return [
    caseFor(words.slice(0, half).join(" "), casing),
    caseFor(words.slice(half).join(" "), casing),
  ];
}

/**
 * A 9:16 UGC treatment preview. The product plate is code-drawn, the cut is
 * choreographed by beat — hook, product, proof, CTA — and paced by the brand
 * tone. No video is generated in the browser; this is the direction the render
 * follows.
 */
export function MotionPreview({
  vertical,
  businessName,
  headline,
  priceLabel,
  offerLabel,
  language,
  hook,
  pace,
  primary,
  look = null,
  className,
}: {
  vertical: Vertical;
  businessName: string;
  headline: string;
  priceLabel: string;
  offerLabel: string;
  language: string;
  hook: MotionHook;
  pace: MotionPace;
  primary: string;
  look?: StudioLook | null;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const segmentRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const [beat, setBeat] = useState(0);
  const [playing, setPlaying] = useState(true);
  const playingRef = useRef(true);
  const beatRef = useRef(0);

  const total = DURATIONS[pace];
  const hooks = hooksFor(vertical);
  const hookCopy = hooks.find((item) => item.value === hook) ?? hooks[0]!;
  const caption = captionsFor(vertical)[hook];
  const cta = ctaFor(vertical);
  const descriptor =
    vertical === "company"
      ? "Sponsored · Corporate film"
      : vertical === "spot"
        ? "Sponsored · Event cut"
        : "Sponsored · UGC cut";
  const casing = look?.casing ?? "upper";
  const face = look?.face ?? "grotesk";
  const weight = look?.headlineWeight ?? 700;
  const layout = look?.layout ?? "poster";
  const tracking = look?.tracking ?? 0;
  const brandSecondary = look?.look?.secondary ?? null;
  const brand = caseFor(businessName.trim() || "Your business", casing);
  const initial = brand.charAt(0);

  const [readyFace, setReadyFace] = useState<string | null>(null);
  const fontReady = readyFace === `${face}:${weight}`;

  useEffect(() => {
    let alive = true;
    void primeFace(face, weight).then(() => {
      if (alive) setReadyFace(`${face}:${weight}`);
    });
    return () => {
      alive = false;
    };
  }, [face, weight]);

  useEffect(() => {
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = requestAnimationFrame(() => {
      setPlaying(false);
      playingRef.current = false;
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  // Draw the product plate once inputs settle; a keystroke shouldn't re-render
  // a 512×910 canvas on every character.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const timer = window.setTimeout(() => {
      const scene = LOOKS[vertical];
      const canvas = drawCreative(
        {
          brand,
          headline: headlineLines(headline, casing),
          product: scene.product,
          bg: brandSecondary
            ? [
                mixHex(scene.bg[0], brandSecondary, 0.5),
                mixHex(scene.bg[1], brandSecondary, 0.22),
              ]
            : scene.bg,
          accent: primary ? mixHex(scene.accent, primary, 0.68) : scene.accent,
          offer: caseFor(offerLabel.trim().slice(0, 12), casing) || undefined,
          price:
            priceLabel.trim() ||
            (vertical === "company" ? "Request a quote" : "Ask on WhatsApp"),
          cta,
          tag: LANGUAGE_TAG[language] ?? "EN",
          style: {
            layout,
            display: canvasFontFor(face),
            body: canvasFontFor("humanist"),
            tracking,
            weight,
          },
        },
        512,
        910
      );
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.objectFit = "cover";
      canvas.style.display = "block";
      host.replaceChildren(canvas);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [
    vertical,
    brand,
    headline,
    priceLabel,
    offerLabel,
    language,
    cta,
    casing,
    layout,
    face,
    weight,
    tracking,
    fontReady,
    primary,
    brandSecondary,
  ]);

  // Beat clock. React re-renders only when the beat changes; the progress bar
  // and slow push-in are written straight to the DOM each frame.
  useEffect(() => {
    let raf = 0;
    let start = performance.now();
    let elapsed = 0;
    let cancelled = false;

    const tick = (now: number) => {
      if (cancelled) return;
      if (playingRef.current) {
        elapsed = (now - start) / 1000;
      } else {
        start = now - elapsed * 1000;
      }

      const progress = Math.min(1, elapsed / total);
      if (hostRef.current) {
        hostRef.current.style.transform = `scale(${1.02 + progress * 0.05})`;
      }
      let cursor = 0;
      for (let i = 0; i < BEAT_WEIGHTS.length; i++) {
        const weight = BEAT_WEIGHTS[i]!;
        const end = cursor + weight;
        const fill =
          progress >= end ? 1 : progress <= cursor ? 0 : (progress - cursor) / weight;
        const node = segmentRefs.current[i];
        if (node) node.style.transform = `scaleX(${fill})`;
        cursor = end;
      }

      let next = 0;
      let acc = 0;
      for (let i = 0; i < BEAT_WEIGHTS.length; i++) {
        acc += BEAT_WEIGHTS[i]!;
        if (progress < acc) {
          next = i;
          break;
        }
        next = BEAT_WEIGHTS.length - 1;
      }
      if (next !== beatRef.current) {
        beatRef.current = next;
        setBeat(next);
      }

      if (progress >= 1) {
        start = now;
        elapsed = 0;
        beatRef.current = 0;
        setBeat(0);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [total]);

  return (
    <div
      className={cn(
        "relative mx-auto aspect-[9/16] w-full overflow-hidden rounded-[26px] border border-white/12 bg-black shadow-[0_24px_70px_rgba(0,0,0,0.55)] [container-type:inline-size]",
        className
      )}
    >
      <div
        ref={hostRef}
        className="absolute inset-0 origin-center will-change-transform [&>canvas]:h-full [&>canvas]:w-full"
      />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.55), transparent 28%, transparent 55%, rgba(0,0,0,0.8))" }}
        aria-hidden="true"
      />

      {/* Progress segments */}
      <div className="absolute inset-x-3 top-2.5 flex gap-1" aria-hidden="true">
        {BEAT_WEIGHTS.map((_, index) => (
          <span
            key={index}
            className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-white/25"
          >
            <span
              ref={(node) => {
                segmentRefs.current[index] = node;
              }}
              className="absolute inset-0 origin-left rounded-full bg-white"
              style={{ transform: "scaleX(0)" }}
            />
          </span>
        ))}
      </div>

      {/* Account row */}
      <div className="absolute inset-x-3 top-6 flex items-center gap-2 text-white">
        <span
          className="flex h-[7cqw] w-[7cqw] items-center justify-center rounded-full text-[3.2cqw] font-bold text-black"
          style={{ background: primary }}
        >
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[3.2cqw] font-semibold leading-tight">
            {businessName.trim() || "Your business"}
          </span>
          <span className="block text-[2.5cqw] text-white/60">{descriptor}</span>
        </span>
        <span className="rounded-full border border-white/25 bg-white/10 px-2 py-[2px] text-[2.3cqw] font-semibold uppercase tracking-wider backdrop-blur">
          {language.toUpperCase()}
        </span>
      </div>

      {/* Hook + lower third */}
      <div className="absolute inset-x-4 bottom-[16%] flex flex-col items-start gap-[2.5cqw]">
        {beat === 0 && (
          <p
            key={`hook-${hook}`}
            className="max-w-[92%] rounded-[2.5cqw] bg-black/55 px-[3cqw] py-[2cqw] text-[5.4cqw] font-bold leading-[1.12] text-white backdrop-blur-sm"
            style={{ animation: "ugc-pop 500ms cubic-bezier(.2,.9,.3,1.15) both" }}
          >
            {hookCopy.line}
          </p>
        )}

        {beat >= 1 && beat < 3 && (
          <div className="w-full space-y-[2cqw]">
            <p className={`text-[6.4cqw] font-black leading-[0.95] tracking-tight text-white [text-shadow:0_2px_18px_rgba(0,0,0,0.45)] ${look ? FACE_CLASS[look.face] : "uppercase"}`}>
              {caseFor(headline.trim() || "Your headline", look?.casing ?? "upper")}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              {priceLabel.trim() && (
                <span className="rounded-full bg-white px-2.5 py-1 text-[3.1cqw] font-bold text-black">
                  {priceLabel.trim()}
                </span>
              )}
              {offerLabel.trim() && (
                <span
                  className="rounded-full px-2.5 py-1 text-[3.1cqw] font-bold text-black"
                  style={{ background: primary }}
                >
                  {offerLabel.trim().toUpperCase()}
                </span>
              )}
            </div>
          </div>
        )}

        {beat >= 1 && (
          <p
            key={`caption-${beat}`}
            className="max-w-[94%] rounded-[2cqw] bg-black/55 px-[2.4cqw] py-[1.6cqw] text-[3.4cqw] leading-snug text-white/90 backdrop-blur-sm"
            style={{ animation: "ugc-rise 400ms ease-out both" }}
          >
            {caption[beat]}
          </p>
        )}

        {beat === 3 && (
          <div
            className="mt-[1cqw] flex w-full items-center justify-between gap-2 rounded-full bg-[#25D366] px-[3.4cqw] py-[2.4cqw] text-black shadow-lg shadow-black/30"
            style={{ animation: "ugc-rise 420ms ease-out both" }}
          >
            <span className="flex items-center gap-1.5 text-[3.5cqw] font-bold">
              <MessageCircle className="h-[4.2cqw] w-[4.2cqw]" strokeWidth={2.4} />
              {cta}
            </span>
            <span className="text-[2.6cqw] font-semibold text-black/60">
              {Math.round(total)}s
            </span>
          </div>
        )}
      </div>

      {/* Sound ticker + transport */}
      <div className="absolute inset-x-3 bottom-3 flex items-center justify-between gap-2 text-white/50">
        <span className="truncate text-[2.4cqw]">original sound · {brand.toLowerCase()}</span>
        <span className="flex shrink-0 items-center gap-1.5">
          <span className="rounded border border-white/15 px-1.5 py-0.5 text-[2.2cqw] uppercase tracking-widest">
            {pace === "fast" ? "fast" : pace === "slow" ? "slow" : "steady"}
          </span>
          <button
            type="button"
            onClick={() => setPlaying((value) => !value)}
            aria-label={playing ? "Pause UGC preview" : "Play UGC preview"}
            className="flex h-[6cqw] w-[6cqw] items-center justify-center rounded-full border border-white/20 bg-black/40 text-white/80 backdrop-blur-md transition-colors hover:text-white"
          >
            {playing ? (
              <Pause className="h-[3cqw] w-[3cqw]" />
            ) : (
              <Play className="ml-[0.4cqw] h-[3cqw] w-[3cqw]" />
            )}
          </button>
        </span>
      </div>

      {!playing && (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label="Play UGC preview"
          className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/50 text-white backdrop-blur-md transition-transform hover:scale-105"
        >
          <Play className="ml-1 h-6 w-6" />
        </button>
      )}

      <style>{`
        @keyframes ugc-pop {
          from { opacity: 0; transform: translateY(10px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes ugc-rise {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <span className="sr-only">
        UGC direction preview for {businessName || "your business"}. Hook:{" "}
        {hookCopy.label}. Pace: {pace}.
      </span>
    </div>
  );
}
