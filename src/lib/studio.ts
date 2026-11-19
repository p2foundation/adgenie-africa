import {
  matchLook,
  type BrandFace,
  type BrandLayout,
  type BrandLook,
} from "@adgenie/core";
import type {
  BrandKit,
  CreativeEngine,
  MotionHook,
  MotionPace,
  ScheduleChannel,
  SpinAudience,
  SpinMode,
  SpinProduct,
} from "@/lib/api";

/**
 * One brand kit, three creative engines, and the look that ties them together.
 * The kit's palette resolves to a look from `src/core/brand-looks.ts`;
 * that look decides type, frame, pace and voice, so a kit with a different
 * palette renders differently rather than just recolouring the same layout.
 * Per-campaign overrides live in the campaign plan.
 */

export type StudioVertical = "seller" | "company" | "fashion" | "spot";

export interface EngineOption {
  value: CreativeEngine;
  label: string;
  kicker: string;
  promise: string;
  detail: string;
}

const PLAYBOOK: Record<StudioVertical, EngineOption[]> = {
  seller: [
    {
      value: "image",
      label: "Still",
      kicker: "Feed & poster",
      promise: "One frame that stops the thumb.",
      detail: "Square, portrait and story posts with code-drawn price and CTA.",
    },
    {
      value: "motion",
      label: "Motion",
      kicker: "UGC cut",
      promise: "A native cut, not a TV ad.",
      detail: "9:16 hook, captions and a WhatsApp hand-off in 15 seconds.",
    },
    {
      value: "spin",
      label: "Spin 360",
      kicker: "Boutique & dolls",
      promise: "Turn the product. Show the fit.",
      detail: "A rotating look for clothes, dolls and anything worth seeing all round.",
    },
  ],
  company: [
    {
      value: "image",
      label: "Brand poster",
      kicker: "Announcement & trust",
      promise: "A banner that looks designed, not generated.",
      detail: "Logo-led layouts for launches, services, hiring and proof.",
    },
    {
      value: "motion",
      label: "Brand film",
      kicker: "Corporate cut",
      promise: "Proof first, then the invitation.",
      detail: "A composed 9:16 film for launches, hiring and client proof.",
    },
    {
      value: "spin",
      label: "Showcase 360",
      kicker: "Product & packaging",
      promise: "Let them walk around what you sell.",
      detail: "A slow studio orbit for products, packaging and hero objects.",
    },
  ],
  fashion: [
    {
      value: "image",
      label: "Lookbook",
      kicker: "Feed & lookbook",
      promise: "One frame that sells the fit.",
      detail: "Editorial crops for drops, salons and studios.",
    },
    {
      value: "motion",
      label: "UGC cut",
      kicker: "Reel & TikTok",
      promise: "A native cut, not a TV ad.",
      detail: "9:16 hook, captions and a booking hand-off in 15 seconds.",
    },
    {
      value: "spin",
      label: "Outfit 360",
      kicker: "Boutique & dolls",
      promise: "Turn the look. Show the fit.",
      detail: "A rotating look for clothes, dolls and accessories.",
    },
  ],
  spot: [
    {
      value: "image",
      label: "Event flyer",
      kicker: "This weekend",
      promise: "The flyer people save.",
      detail: "Date, venue and price drawn with code from confirmed facts.",
    },
    {
      value: "motion",
      label: "Highlight reel",
      kicker: "Reels & status",
      promise: "A 15-second reason to show up.",
      detail: "Atmosphere, offer and a booking CTA in one vertical cut.",
    },
    {
      value: "spin",
      label: "Venue 360",
      kicker: "Spaces & plates",
      promise: "Show the room before they arrive.",
      detail: "A slow orbit for venues, tables and signature dishes.",
    },
  ],
};

export const PLAYBOOK_LABEL: Record<StudioVertical, string> = {
  seller: "Market playbook",
  company: "Corporate playbook",
  fashion: "Fashion playbook",
  spot: "Event playbook",
};

export function enginesFor(vertical: StudioVertical): EngineOption[] {
  return PLAYBOOK[vertical] ?? PLAYBOOK.seller;
}

export function engineFor(
  vertical: StudioVertical,
  engine: CreativeEngine
): EngineOption {
  return enginesFor(vertical).find((item) => item.value === engine) ?? ENGINES[0]!;
}

export const ENGINES = PLAYBOOK.seller;

export const HOOKS: {
  value: MotionHook;
  label: string;
  line: string;
  tag: string;
}[] = [
  {
    value: "pov",
    label: "POV",
    line: "POV: you finally found the piece everyone keeps asking about.",
    tag: "Relatable",
  },
  {
    value: "three_reasons",
    label: "3 reasons",
    line: "Three reasons this belongs in your rotation this weekend.",
    tag: "Listicle",
  },
  {
    value: "before_after",
    label: "Before / after",
    line: "Before: the hanger. After: sold out twice.",
    tag: "Transformation",
  },
  {
    value: "testimonial",
    label: "Testimonial",
    line: "I wore it once and three people asked where I got it.",
    tag: "Social proof",
  },
];

const COMPANY_HOOKS: typeof HOOKS = [
  {
    value: "pov",
    label: "The announcement",
    line: "Introducing the work we have been building.",
    tag: "Launch",
  },
  {
    value: "three_reasons",
    label: "Three proof points",
    line: "Three reasons clients choose to work with us.",
    tag: "Credibility",
  },
  {
    value: "before_after",
    label: "Before / after",
    line: "Before: the old way. After: a better standard.",
    tag: "Transformation",
  },
  {
    value: "testimonial",
    label: "Client voice",
    line: "What clients say when the work lands.",
    tag: "Social proof",
  },
];

export function hooksFor(vertical: StudioVertical): typeof HOOKS {
  return vertical === "company" ? COMPANY_HOOKS : HOOKS;
}

export const PACES: { value: MotionPace; label: string }[] = [
  { value: "slow", label: "Slow burn" },
  { value: "medium", label: "Steady" },
  { value: "fast", label: "Fast cut" },
];

export const AUDIENCES: { value: SpinAudience; label: string }[] = [
  { value: "women", label: "Women" },
  { value: "men", label: "Men" },
  { value: "kids", label: "Kids" },
];

export const PRODUCTS: { value: SpinProduct; label: string; hint: string }[] = [
  { value: "outfit", label: "Boutique outfit", hint: "Mannequin walkaround" },
  { value: "doll", label: "Doll / collectible", hint: "Display pedestal" },
];

const COMPANY_PRODUCTS: typeof PRODUCTS = [
  { value: "product", label: "Product hero", hint: "Bottle or device" },
  { value: "packaging", label: "Packaging", hint: "Box, carton or gift set" },
];

export function productsFor(
  vertical: StudioVertical
): { value: SpinProduct; label: string; hint: string }[] {
  return vertical === "company" ? COMPANY_PRODUCTS : PRODUCTS;
}

export const PRODUCT_LABEL: Record<SpinProduct, string> = {
  outfit: "Boutique outfit",
  doll: "Doll / collectible",
  product: "Product hero",
  packaging: "Packaging",
};

export const SPIN_MODES: {
  value: SpinMode;
  label: string;
  hint: string;
}[] = [
  { value: "model", label: "Virtual model", hint: "Adult model wearing the piece" },
  { value: "mannequin", label: "Mannequin", hint: "Headless retail form" },
  { value: "kit", label: "Digital kit", hint: "Garment, cut and swatches" },
];

export const SPIN_MODE_LABEL: Record<SpinMode, string> = {
  model: "Virtual model",
  mannequin: "Mannequin",
  kit: "Digital kit",
};

/** A child is never modelled; kids' fashion falls back to the mannequin. */
export function spinModesFor(spinAudience: SpinAudience) {
  return SPIN_MODES.filter((mode) => spinAudience !== "kids" || mode.value !== "model");
}

export const CHANNELS: {
  value: ScheduleChannel;
  label: string;
  short: string;
}[] = [
  { value: "whatsapp", label: "WhatsApp Status", short: "Status" },
  { value: "instagram", label: "Instagram", short: "IG" },
  { value: "tiktok", label: "TikTok", short: "TikTok" },
  { value: "facebook", label: "Facebook", short: "FB" },
];

export const CHANNEL_LABEL: Record<ScheduleChannel, string> = {
  whatsapp: "WhatsApp Status",
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
};

export type StudioTone =
  | "casual"
  | "professional"
  | "playful"
  | "luxury"
  | "corporate";

export function toneOf(kit: BrandKit | null): StudioTone {
  const tone = kit?.tone;
  return tone === "professional" ||
    tone === "playful" ||
    tone === "luxury" ||
    tone === "corporate"
    ? tone
    : "casual";
}

/**
 * A kit with no schema column for style is recognised from its palette — the
 * catalogue's palettes are unique, so the lookup is exact. A kit that matches
 * nothing gets a house treatment derived from its voice, never the old default.
 */
type ToneLook = Omit<
  StudioLook,
  "look" | "name" | "family" | "hook" | "promise" | "voice" | "watchOut"
>;

const TONE_LOOKS: Record<StudioTone, ToneLook> = {
  casual: {
    layout: "poster",
    face: "grotesk",
    casing: "title",
    tracking: 0,
    headlineWeight: 700,
    spinSpeed: 0.52,
    pace: "medium",
  },
  professional: {
    layout: "corporate",
    face: "grotesk",
    casing: "title",
    tracking: 0,
    headlineWeight: 600,
    spinSpeed: 0.38,
    pace: "slow",
  },
  playful: {
    layout: "street",
    face: "poster",
    casing: "upper",
    tracking: 0.02,
    headlineWeight: 400,
    spinSpeed: 0.72,
    pace: "fast",
  },
  luxury: {
    layout: "editorial",
    face: "serif",
    casing: "title",
    tracking: 0,
    headlineWeight: 700,
    spinSpeed: 0.3,
    pace: "slow",
  },
  corporate: {
    layout: "corporate",
    face: "grotesk",
    casing: "title",
    tracking: 0,
    headlineWeight: 600,
    spinSpeed: 0.34,
    pace: "slow",
  },
};

export interface StudioLook {
  /** Null when the palette belongs to no catalogue look. */
  look: BrandLook | null;
  name: string;
  family: string;
  face: BrandFace;
  layout: BrandLayout;
  casing: "upper" | "title";
  tracking: number;
  headlineWeight: number;
  spinSpeed: number;
  pace: MotionPace;
  hook: MotionHook;
  promise: string;
  voice: string;
  watchOut: string | null;
}

export function lookOf(kit: BrandKit | null): StudioLook {
  const tone = toneOf(kit);
  const fallback = TONE_LOOKS[tone];
  const look = matchLook(kit?.primaryColor ?? null, kit?.secondaryColor ?? null);
  if (!look) {
    return {
      look: null,
      name: "House treatment",
      family: "Made from your colours",
      ...fallback,
      hook: "pov",
      promise: "Your palette and your voice, in a frame that fits them.",
      voice: TONE_COPY[tone].still,
      watchOut: null,
    };
  }
  return {
    look,
    name: look.name,
    family: look.family,
    face: look.face,
    layout: look.layout,
    casing: look.casing,
    tracking: look.tracking,
    headlineWeight: look.headlineWeight,
    spinSpeed: look.spinSpeed,
    pace: look.motionPace,
    hook: look.motionHook,
    promise: look.promise,
    voice: look.voice,
    watchOut: look.watchOut,
  };
}

/** CSS class carrying each display face. The gallery and cards share it. */
export const FACE_CLASS: Record<BrandFace, string> = {
  poster: "face-poster",
  serif: "face-serif",
  grotesk: "face-grotesk",
  humanist: "face-humanist",
};

const FACE_VARIABLE: Record<BrandFace, string> = {
  poster: "--font-poster",
  serif: "--font-serif",
  grotesk: "--font-grotesk",
  humanist: "--font-noto",
};

const FACE_FAMILY: Record<BrandFace, string> = {
  poster: '"Bebas Neue"',
  serif: '"Playfair Display"',
  grotesk: '"Space Grotesk"',
  humanist: '"Noto Sans"',
};

const FACE_GENERIC: Record<BrandFace, string> = {
  poster: "sans-serif",
  serif: "serif",
  grotesk: "sans-serif",
  humanist: "sans-serif",
};

const faceCache = new Map<BrandFace, string>();

/**
 * next/font hashes the family name, and canvas `ctx.font` cannot read a CSS
 * variable, so the hashed name is resolved off the body once and cached.
 */
export function canvasFontFor(face: BrandFace): string {
  const cached = faceCache.get(face);
  if (cached) return cached;
  let family = FACE_FAMILY[face];
  if (typeof window !== "undefined") {
    const raw = getComputedStyle(document.body)
      .getPropertyValue(FACE_VARIABLE[face])
      .trim();
    if (raw) family = raw.split(",")[0]!.trim();
  }
  const stack = `${family}, ${FACE_GENERIC[face]}`;
  faceCache.set(face, stack);
  return stack;
}

/** Ask the browser to fetch a face before the canvas draws with it. */
export function primeFace(face: BrandFace, weight: number): Promise<void> {
  if (typeof document === "undefined" || !("fonts" in document)) return Promise.resolve();
  const family = canvasFontFor(face).split(",")[0]!;
  return document.fonts
    .load(`${weight} 64px ${family}`, "ABC")
    .then(() => undefined)
    .catch(() => undefined);
}

/** Casing the look asks for, applied to caller-supplied copy. */
export function caseFor(value: string, casing: "upper" | "title"): string {
  return casing === "upper" ? value.toUpperCase() : value;
}

const FALLBACK_PRIMARY = "#FBBF24";
const FALLBACK_SECONDARY = "#7C3AED";

export function primaryOf(kit: BrandKit | null) {
  return /^#[0-9A-Fa-f]{6}$/.test(kit?.primaryColor ?? "")
    ? (kit?.primaryColor as string).toUpperCase()
    : FALLBACK_PRIMARY;
}

export function secondaryOf(kit: BrandKit | null) {
  return /^#[0-9A-Fa-f]{6}$/.test(kit?.secondaryColor ?? "")
    ? (kit?.secondaryColor as string).toUpperCase()
    : FALLBACK_SECONDARY;
}

function channel(hex: string, index: number): number {
  return Number.parseInt(hex.slice(index, index + 2), 16);
}

function clamp(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function mixHex(a: string, b: string, amount = 0.5): string {
  const safeA = /^#[0-9A-Fa-f]{6}$/.test(a) ? a : FALLBACK_PRIMARY;
  const safeB = /^#[0-9A-Fa-f]{6}$/.test(b) ? b : FALLBACK_SECONDARY;
  const t = Math.max(0, Math.min(1, amount));
  const parts = [1, 3, 5].map((index) =>
    clamp(channel(safeA, index) * (1 - t) + channel(safeB, index) * t)
      .toString(16)
      .padStart(2, "0")
  );
  return `#${parts.join("")}`.toUpperCase();
}

export function shadeHex(hex: string, amount: number): string {
  return amount < 0
    ? mixHex(hex, "#05060C", Math.abs(amount))
    : mixHex(hex, "#FFFFFF", amount);
}

export function rgba(hex: string, alpha: number): string {
  const safe = /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : FALLBACK_PRIMARY;
  return `rgba(${channel(safe, 1)}, ${channel(safe, 3)}, ${channel(safe, 5)}, ${alpha})`;
}

/** Readable ink for a coloured surface. */
export function inkFor(hex: string): string {
  const safe = /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : FALLBACK_PRIMARY;
  const [r, g, b] = [1, 3, 5].map((index) => channel(safe, index) / 255);
  const luminance = 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  return luminance > 0.6 ? "#0A0A0F" : "#FFFFFF";
}

export interface StudioTreatment {
  engine: CreativeEngine;
  tone: StudioTone;
  look: StudioLook;
  primary: string;
  secondary: string;
  accent: string;
  ink: string;
  background: [string, string];
  pace: MotionPace;
  spinSpeed: number;
  hook: MotionHook;
  headline: string;
  support: string;
  cta: string;
}

const TONE_COPY: Record<
  StudioTone,
  {
    still: string;
    motion: string;
    spin: string;
    cta: string;
  }
> = {
  casual: {
    still: "Friendly, direct, priced without games.",
    motion: "Talk like a friend showing you the find.",
    spin: "Turn it once. Let the fit speak.",
    cta: "Order on WhatsApp",
  },
  professional: {
    still: "Clean hierarchy, one offer, no clutter.",
    motion: "Lead with the proof, then the offer.",
    spin: "A measured walkaround for a considered buy.",
    cta: "Talk to our team",
  },
  playful: {
    still: "Bright stickers, big type, instant read.",
    motion: "Stop the scroll in the first second.",
    spin: "Snap it round. Show every side.",
    cta: "Shop the drop",
  },
  luxury: {
    still: "Space, restraint, and one beautiful detail.",
    motion: "Let the fabric move before the words do.",
    spin: "A slow orbit under studio light.",
    cta: "Discover the piece",
  },
  corporate: {
    still: "Logo-led, measured, one clear promise.",
    motion: "Proof first, then the invitation.",
    spin: "A slow studio orbit — no theatrics.",
    cta: "Talk to our team",
  },
};

const VERTICAL_CTA: Record<StudioVertical, string> = {
  seller: "Order on WhatsApp",
  company: "Talk to our team",
  fashion: "Book on WhatsApp",
  spot: "Reserve on WhatsApp",
};

/** The hand-off a cut ends on. Corporate leads with a conversation, not a cart. */
export function ctaFor(vertical: StudioVertical, tone?: StudioTone): string {
  if (vertical === "company" || tone === "corporate") return VERTICAL_CTA.company;
  return VERTICAL_CTA[vertical];
}

export function treatmentFor(
  kit: BrandKit | null,
  engine: CreativeEngine,
  vertical: StudioVertical = "seller"
): StudioTreatment {
  const tone = toneOf(kit);
  const look = lookOf(kit);
  const copy = TONE_COPY[tone];
  const primary = primaryOf(kit);
  const secondary = secondaryOf(kit);
  const accent = (look.look?.accent ?? shadeHex(primary, 0.45)).toUpperCase();
  const corporate = vertical === "company" || tone === "corporate";

  // The frame the look chose changes how the scene is lit, not just its font.
  const background: [string, string] =
    look.layout === "corporate"
      ? [mixHex(secondary, "#0B1220", 0.42), mixHex(secondary, "#05060C", 0.8)]
      : look.layout === "editorial"
        ? [mixHex(secondary, "#0A0710", 0.24), mixHex(secondary, "#04030A", 0.62)]
        : look.layout === "street"
          ? [mixHex(secondary, "#070811", 0.1), mixHex(secondary, "#05060C", 0.55)]
          : corporate
            ? [mixHex(secondary, "#0B1220", 0.42), mixHex(secondary, "#05060C", 0.8)]
            : [
                mixHex(secondary, "#070811", tone === "playful" ? 0.2 : 0.35),
                mixHex(secondary, "#05060C", 0.72),
              ];

  const name = kit?.name;
  const headline =
    vertical === "company"
      ? engine === "image"
        ? name
          ? `${name}, built to be trusted.`
          : "The work, stated plainly."
        : engine === "motion"
          ? name
            ? `A considered film for ${name}.`
            : "A corporate cut, not a commercial."
          : name
            ? `Walk around what ${name} makes.`
            : "A studio orbit for the product."
      : engine === "image"
        ? name
          ? look.look
            ? `${name}, in ${look.name}.`
            : `${name}, in one frame.`
          : "One frame. One offer. One thumb-stop."
        : engine === "motion"
          ? name
            ? `A 15-second cut for ${name}.`
            : "A native cut, not a commercial."
          : name
            ? `Walk around ${name}.`
            : "Let them see it from every side.";

  const support = look.look
    ? engine === "image"
      ? look.look.why
      : engine === "motion"
        ? look.voice
        : `Turns at ${look.spinSpeed.toFixed(2)}× — the pace ${look.name} is cut for.`
    : engine === "image"
      ? copy.still
      : engine === "motion"
        ? copy.motion
        : copy.spin;

  return {
    engine,
    tone,
    look,
    primary,
    secondary,
    accent,
    ink: inkFor(background[1]),
    background,
    pace: look.pace,
    spinSpeed: look.spinSpeed,
    hook: look.hook,
    headline,
    support,
    cta: ctaFor(vertical, tone),
  };
}
