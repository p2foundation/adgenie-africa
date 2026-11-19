/**
 * Brand looks — the style catalogue behind the brand kit.
 *
 * A look is creative direction, not a colour swatch: palette, display face,
 * casing, canvas layout, motion pace and caption voice travel together, so
 * choosing a look changes how the still, the cut and the spin actually
 * render. Everything here is data plus deterministic scoring — no vendor call,
 * no schema change. A look is recognised again from a saved kit by its exact
 * palette, which is why the palettes below are unique.
 *
 * Benchmarks: Canva Brand Kit (per-brand colours + fonts, manual), Looka
 * (style quiz → kits), Brandfetch (extract, don't choose) and Frontify
 * (tokens + usage rules). What none of them do for a Ghanaian seller: pick the
 * style from the job and the platform, say why in plain words, and guarantee
 * the result still reads as a 320 px WhatsApp status thumbnail.
 */

export type BrandLookId =
  | "market-shout"
  | "night-voltage"
  | "lagos-voltage"
  | "gold-room"
  | "sand-serif"
  | "wine-pearl"
  | "trust-cobalt"
  | "ledger-green"
  | "harbour-slate"
  | "shea-cream"
  | "rose-glow"
  | "mint-market"
  | "gig-plug"
  | "emerald-street";

export type BrandLookFamily =
  | "Bold poster"
  | "Editorial luxe"
  | "Clean corporate"
  | "Soft warm"
  | "Street tech";

/** Rendered by `drawCreative` — one branch each, genuinely different frames. */
export type BrandLayout = "street" | "editorial" | "corporate" | "poster";

/** Display face key; the web app maps it to a self-hosted font stack. */
export type BrandFace = "poster" | "serif" | "grotesk" | "humanist";

export type BrandTone = "casual" | "professional" | "playful" | "luxury" | "corporate";

export type BrandVertical = "seller" | "company" | "fashion" | "spot";

/** The job the campaign is hired to do. */
export type BrandGoal = "sales" | "launch" | "event" | "trust" | "booking";

/** Where the creative is going. Matches the studio's schedule channels. */
export type BrandChannel = "whatsapp" | "instagram" | "tiktok" | "facebook";

export type BrandMarket =
  | "ghana"
  | "nigeria"
  | "francophone"
  | "east-africa"
  | "southern-africa"
  | "pan-africa";

export interface BrandLook {
  id: BrandLookId;
  name: string;
  family: BrandLookFamily;
  /** One line, the way the user would describe the result to a friend. */
  promise: string;
  primary: string;
  secondary: string;
  /** Tertiary highlight used for stickers, rules and accent type. */
  accent: string;
  tone: BrandTone;
  face: BrandFace;
  layout: BrandLayout;
  casing: "upper" | "title";
  /** Headline letter-spacing in em — small on the poster faces, wide on caps. */
  tracking: number;
  headlineWeight: number;
  motionPace: "slow" | "medium" | "fast";
  motionHook: "pov" | "three_reasons" | "before_after" | "testimonial";
  spinSpeed: number;
  /** How the caption sounds. Feeds the copy prompt, not the pixels. */
  voice: string;
  bestFor: {
    verticals: BrandVertical[];
    goals: BrandGoal[];
    channels: BrandChannel[];
    markets: BrandMarket[];
  };
  why: string;
  watchOut: string;
  /** Keywords that let a free-text brief pull a look forward. */
  cues: string[];
}

export const BRAND_GOALS: { value: BrandGoal; label: string; hint: string }[] = [
  { value: "sales", label: "Move stock", hint: "Price-led, tonight" },
  { value: "launch", label: "Show something new", hint: "A drop or an opening" },
  { value: "event", label: "Fill an event", hint: "Date, venue, door price" },
  { value: "trust", label: "Look established", hint: "Credibility, hiring, proof" },
  { value: "booking", label: "Take bookings", hint: "Services, tables, calls" },
];

export const BRAND_CHANNELS: { value: BrandChannel; label: string; hint: string }[] = [
  { value: "whatsapp", label: "WhatsApp status", hint: "Small, dim, forwarded" },
  { value: "instagram", label: "Instagram", hint: "Feed and reels" },
  { value: "tiktok", label: "TikTok", hint: "Sound on, fast scroll" },
  { value: "facebook", label: "Facebook", hint: "Older, wider, shareable" },
];

export const BRAND_FAMILIES: { value: BrandLookFamily; label: string; hint: string }[] = [
  { value: "Bold poster", label: "Bold poster", hint: "Shouts the offer" },
  { value: "Editorial luxe", label: "Editorial luxe", hint: "Quiet, expensive" },
  { value: "Clean corporate", label: "Clean corporate", hint: "Proof, no noise" },
  { value: "Soft warm", label: "Soft warm", hint: "Friendly, human" },
  { value: "Street tech", label: "Street tech", hint: "Sharp, current" },
];

/** ISO country codes we hold KYC data for, folded into a taste region. */
const MARKET_CODES: Record<Exclude<BrandMarket, "pan-africa">, string[]> = {
  ghana: ["GH"],
  nigeria: ["NG"],
  francophone: ["SN", "CI", "BF", "ML", "BJ", "TG", "NE", "GA", "CM", "CD", "RW"],
  "east-africa": ["KE", "TZ", "UG"],
  "southern-africa": ["ZA", "ZM", "ZW", "MW", "NA", "BW"],
};

export const MARKET_LABEL: Record<BrandMarket, string> = {
  ghana: "Ghana",
  nigeria: "Nigeria",
  francophone: "Francophone West Africa",
  "east-africa": "East Africa",
  "southern-africa": "Southern Africa",
  "pan-africa": "Across Africa",
};

export const GOAL_LABEL: Record<BrandGoal, string> = {
  sales: "move stock",
  launch: "a launch",
  event: "an event",
  trust: "credibility",
  booking: "bookings",
};

export const CHANNEL_LABEL: Record<BrandChannel, string> = {
  whatsapp: "WhatsApp status",
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
};

export const BRAND_LOOKS: BrandLook[] = [
  // ── Bold poster ────────────────────────────────────────────────────────────
  {
    id: "market-shout",
    name: "Market Shout",
    family: "Bold poster",
    promise: "The offer lands before the thumb moves on.",
    primary: "#FBBF24",
    secondary: "#7C2D12",
    accent: "#FDE68A",
    tone: "casual",
    face: "poster",
    layout: "street",
    casing: "upper",
    tracking: 0.02,
    headlineWeight: 400,
    motionPace: "fast",
    motionHook: "three_reasons",
    spinSpeed: 0.7,
    voice: "Direct and priced, like a shopkeeper who knows the stock is good.",
    bestFor: {
      verticals: ["seller", "spot"],
      goals: ["sales", "event"],
      channels: ["whatsapp", "facebook", "instagram"],
      markets: ["ghana", "nigeria", "pan-africa"],
    },
    why: "Gold caps on rust survive a WhatsApp status thumbnail and a dim phone screen.",
    watchOut: "One offer per post. Two shouts on one frame fight and both lose.",
    cues: ["sale", "discount", "price", "clearance", "cheap", "offer", "promo", "wholesale"],
  },
  {
    id: "night-voltage",
    name: "Night Voltage",
    family: "Bold poster",
    promise: "It looks like the night is already happening.",
    primary: "#FACC15",
    secondary: "#4C1D95",
    accent: "#C4B5FD",
    tone: "playful",
    face: "poster",
    layout: "street",
    casing: "upper",
    tracking: 0.03,
    headlineWeight: 400,
    motionPace: "fast",
    motionHook: "pov",
    spinSpeed: 0.75,
    voice: "Loud, short, second-person. Dates and doors, no adjectives.",
    bestFor: {
      verticals: ["spot", "seller"],
      goals: ["event", "launch"],
      channels: ["tiktok", "instagram", "whatsapp"],
      markets: ["ghana", "nigeria", "east-africa", "pan-africa"],
    },
    why: "Acid yellow against plum is the nightlife pairing Accra and Lagos already read as 'event'.",
    watchOut: "Keep the venue and door time legible; the type is doing the shouting, not the layout.",
    cues: ["party", "night", "live", "concert", "dj", "weekend", "club", "show", "performance"],
  },
  {
    id: "lagos-voltage",
    name: "Lagos Voltage",
    family: "Bold poster",
    promise: "New, fast, and obviously not the last one.",
    primary: "#A3E635",
    secondary: "#0F172A",
    accent: "#FEF08A",
    tone: "playful",
    face: "poster",
    layout: "poster",
    casing: "upper",
    tracking: 0.01,
    headlineWeight: 400,
    motionPace: "fast",
    motionHook: "before_after",
    spinSpeed: 0.68,
    voice: "Hype with receipts. Short claims, numbers, no filler.",
    bestFor: {
      verticals: ["seller", "fashion"],
      goals: ["launch", "sales"],
      channels: ["tiktok", "instagram"],
      markets: ["nigeria", "ghana", "east-africa"],
    },
    why: "Lime on ink is a scroll-stopper on a sound-off feed, and it photographs well on product.",
    watchOut: "One acid colour only. Add a second bright and the frame turns to noise.",
    cues: ["drop", "new", "arrived", "restock", "limited", "fast", "trend", "hot"],
  },

  // ── Editorial luxe ─────────────────────────────────────────────────────────
  {
    id: "gold-room",
    name: "Gold Room",
    family: "Editorial luxe",
    promise: "Champagne type on espresso. It reads expensive.",
    primary: "#E3B341",
    secondary: "#2A1E12",
    accent: "#F5E7C5",
    tone: "luxury",
    face: "serif",
    layout: "editorial",
    casing: "title",
    tracking: 0.0,
    headlineWeight: 700,
    motionPace: "slow",
    motionHook: "testimonial",
    spinSpeed: 0.3,
    voice: "Fewer words, longer vowels. Material, cut, and where it is going.",
    bestFor: {
      verticals: ["fashion", "company"],
      goals: ["booking", "trust", "launch"],
      channels: ["instagram", "facebook"],
      markets: ["ghana", "nigeria", "east-africa", "southern-africa", "pan-africa"],
    },
    why: "Serif caps with wide space is the fastest way to signal price without writing a price.",
    watchOut: "Needs room. Three lines of headline and this look stops working.",
    cues: ["premium", "bespoke", "tailored", "luxury", "gold", "bridal", "collector", "limited"],
  },
  {
    id: "sand-serif",
    name: "Sand & Umber",
    family: "Editorial luxe",
    promise: "Warm neutrals, editorial crop, nothing shouting.",
    primary: "#FDE68A",
    secondary: "#78350F",
    accent: "#FFFBEB",
    tone: "luxury",
    face: "serif",
    layout: "editorial",
    casing: "title",
    tracking: 0.0,
    headlineWeight: 600,
    motionPace: "slow",
    motionHook: "pov",
    spinSpeed: 0.32,
    voice: "Calm and specific: the fabric, the fit, the season.",
    bestFor: {
      verticals: ["fashion", "seller"],
      goals: ["launch", "booking"],
      channels: ["instagram", "tiktok"],
      markets: ["ghana", "francophone", "southern-africa", "pan-africa"],
    },
    why: "Sand on umber flatters skin tones and khaki, so the product photo never fights the frame.",
    watchOut: "Low contrast by design — keep the price in the solid bar, not the type.",
    cues: ["kaftan", "linen", "natural", "organic", "handmade", "craft", "editorial", "lookbook"],
  },
  {
    id: "wine-pearl",
    name: "Wine & Pearl",
    family: "Editorial luxe",
    promise: "Bridal, beauty, and evening — soft but grown-up.",
    primary: "#E8B4BC",
    secondary: "#4A0E2E",
    accent: "#FDF2F8",
    tone: "luxury",
    face: "serif",
    layout: "editorial",
    casing: "title",
    tracking: 0.01,
    headlineWeight: 600,
    motionPace: "slow",
    motionHook: "testimonial",
    spinSpeed: 0.28,
    voice: "Invitation, not advertisement. Dates, names, and a place to book.",
    bestFor: {
      verticals: ["fashion", "spot"],
      goals: ["booking", "event", "trust"],
      channels: ["instagram", "whatsapp", "facebook"],
      markets: ["ghana", "nigeria", "francophone", "pan-africa"],
    },
    why: "Pearl on wine carries weddings and launch parties without looking like a sale.",
    watchOut: "Never put a discount sticker on this one; it reads cheap instantly.",
    cues: ["wedding", "bridal", "beauty", "glow", "evening", "gala", "party", "invite"],
  },

  // ── Clean corporate ────────────────────────────────────────────────────────
  {
    id: "trust-cobalt",
    name: "Trust Cobalt",
    family: "Clean corporate",
    promise: "A company that has been delivering since before you noticed.",
    primary: "#60A5FA",
    secondary: "#0F172A",
    accent: "#BFDBFE",
    tone: "corporate",
    face: "grotesk",
    layout: "corporate",
    casing: "title",
    tracking: 0.0,
    headlineWeight: 600,
    motionPace: "slow",
    motionHook: "testimonial",
    spinSpeed: 0.34,
    voice: "Plain sentences, one promise, proof before the invitation.",
    bestFor: {
      verticals: ["company", "seller"],
      goals: ["trust", "booking"],
      channels: ["facebook", "whatsapp"],
      markets: ["ghana", "nigeria", "francophone", "east-africa", "southern-africa", "pan-africa"],
    },
    why: "Cool blue on navy is the default language of credibility, and it stays sharp on a projector.",
    watchOut: "No hype stickers here. Add a discount badge and the trust goes with it.",
    cues: ["services", "company", "team", "years", "certified", "corporate", "partners", "hiring"],
  },
  {
    id: "ledger-green",
    name: "Ledger Green",
    family: "Clean corporate",
    promise: "Growth, harvest, and money that is accounted for.",
    primary: "#86EFAC",
    secondary: "#14532D",
    accent: "#DCFCE7",
    tone: "professional",
    face: "grotesk",
    layout: "corporate",
    casing: "title",
    tracking: 0.0,
    headlineWeight: 600,
    motionPace: "medium",
    motionHook: "three_reasons",
    spinSpeed: 0.38,
    voice: "Numbers first. Yield, coverage, turnaround — then the ask.",
    bestFor: {
      verticals: ["company", "seller"],
      goals: ["trust", "sales", "booking"],
      channels: ["facebook", "whatsapp"],
      markets: ["ghana", "nigeria", "east-africa", "southern-africa"],
    },
    why: "Green reads agriculture, savings and health at once — the three biggest trust asks locally.",
    watchOut: "Mint type on deep green must stay big; small captions go dark, not light.",
    cues: ["farm", "harvest", "finance", "savings", "health", "clinic", "school", "energy", "water"],
  },
  {
    id: "harbour-slate",
    name: "Harbour Slate",
    family: "Clean corporate",
    promise: "Cool, considered, and readable in French at a glance.",
    primary: "#38BDF8",
    secondary: "#0C4A6E",
    accent: "#E0F2FE",
    tone: "professional",
    face: "grotesk",
    layout: "corporate",
    casing: "title",
    tracking: 0.0,
    headlineWeight: 600,
    motionPace: "medium",
    motionHook: "three_reasons",
    spinSpeed: 0.36,
    voice: "Short declaratives. Accented characters stay clean at every size.",
    bestFor: {
      verticals: ["company", "seller"],
      goals: ["trust", "launch", "booking"],
      channels: ["facebook", "whatsapp", "instagram"],
      markets: ["francophone", "pan-africa"],
    },
    why: "Built for French headlines — no letter gets clipped, and accents keep their height.",
    watchOut: "Keep accent marks out of the caps; it breaks the grid the look depends on.",
    cues: ["service", "professionnel", "entreprise", "formation", "siège", "nouveau"],
  },

  // ── Soft warm ──────────────────────────────────────────────────────────────
  {
    id: "shea-cream",
    name: "Shea & Cocoa",
    family: "Soft warm",
    promise: "Warm like the shop, not warm like a stock photo.",
    primary: "#F5B777",
    secondary: "#43291A",
    accent: "#FFE8CC",
    tone: "casual",
    face: "humanist",
    layout: "poster",
    casing: "title",
    tracking: -0.01,
    headlineWeight: 700,
    motionPace: "medium",
    motionHook: "pov",
    spinSpeed: 0.5,
    voice: "First person, friendly, a little funny. Prices stated plainly.",
    bestFor: {
      verticals: ["seller", "spot"],
      goals: ["sales", "booking", "launch"],
      channels: ["whatsapp", "instagram", "facebook"],
      markets: ["ghana", "nigeria", "francophone", "east-africa", "pan-africa"],
    },
    why: "Cocoa and shea flatter every skin tone and food photo, so the picture never looks filtered.",
    watchOut: "Soft palette, so keep the CTA in the solid pill with dark ink.",
    cues: ["food", "kitchen", "snack", "beauty", "skincare", "salon", "home", "family", "mama"],
  },
  {
    id: "rose-glow",
    name: "Rose Glow",
    family: "Soft warm",
    promise: "Bright, youthful, and made for a repost.",
    primary: "#FDA4AF",
    secondary: "#881337",
    accent: "#FFE4E6",
    tone: "playful",
    face: "humanist",
    layout: "street",
    casing: "title",
    tracking: -0.01,
    headlineWeight: 700,
    motionPace: "fast",
    motionHook: "pov",
    spinSpeed: 0.62,
    voice: "Talk like a friend showing you the find. Two lines, then the link.",
    bestFor: {
      verticals: ["fashion", "seller", "spot"],
      goals: ["launch", "sales", "event"],
      channels: ["tiktok", "instagram", "whatsapp"],
      markets: ["ghana", "nigeria", "francophone", "east-africa", "southern-africa"],
    },
    why: "Coral on wine is the beauty-and-apparel pairing that already wins on TikTok.",
    watchOut: "Curved pills everywhere; a sharp rectangle breaks the mood instantly.",
    cues: ["glow", "skincare", "makeup", "outfit", "fitting", "girls", "viral", "trend"],
  },
  {
    id: "mint-market",
    name: "Mint Market",
    family: "Soft warm",
    promise: "Fresh stock, clear price, zero fuss.",
    primary: "#5EEAD4",
    secondary: "#064E3B",
    accent: "#ECFDF5",
    tone: "casual",
    face: "humanist",
    layout: "poster",
    casing: "title",
    tracking: -0.01,
    headlineWeight: 700,
    motionPace: "medium",
    motionHook: "three_reasons",
    spinSpeed: 0.52,
    voice: "Matter of fact. What it is, what it costs, when it is gone.",
    bestFor: {
      verticals: ["seller", "spot"],
      goals: ["sales", "booking"],
      channels: ["whatsapp", "facebook"],
      markets: ["ghana", "nigeria", "east-africa", "southern-africa", "pan-africa"],
    },
    why: "Mint on pine reads fresh for groceries, pharmacy and drinks without looking medical.",
    watchOut: "Best on price-led posts; on luxury goods it turns into a chemist.",
    cues: ["fresh", "grocery", "pharmacy", "drink", "juice", "water", "daily", "stock", "market"],
  },

  // ── Street tech ────────────────────────────────────────────────────────────
  {
    id: "gig-plug",
    name: "Gig Plug",
    family: "Street tech",
    promise: "Gadget-posted, spec-first, priced in the bar.",
    primary: "#2DD4BF",
    secondary: "#0F172A",
    accent: "#99F6E4",
    tone: "professional",
    face: "grotesk",
    layout: "corporate",
    casing: "upper",
    tracking: 0.06,
    headlineWeight: 700,
    motionPace: "medium",
    motionHook: "three_reasons",
    spinSpeed: 0.42,
    voice: "Specs, warranty, price. Short lines, no adjectives.",
    bestFor: {
      verticals: ["seller", "company"],
      goals: ["sales", "launch", "booking"],
      channels: ["whatsapp", "instagram", "tiktok"],
      markets: ["ghana", "nigeria", "east-africa", "pan-africa"],
    },
    why: "Teal on ink with wide-tracked caps is the electronics-plug language buyers trust on WhatsApp.",
    watchOut: "Wide caps eat space; keep the headline to four words.",
    cues: ["phone", "laptop", "charger", "gadget", "screen", "data", "router", "solar", "inverter"],
  },
  {
    id: "emerald-street",
    name: "Emerald Street",
    family: "Street tech",
    promise: "A corner-shop price with a big-brand frame.",
    primary: "#34D399",
    secondary: "#052E16",
    accent: "#D1FAE5",
    tone: "casual",
    face: "grotesk",
    layout: "poster",
    casing: "upper",
    tracking: 0.04,
    headlineWeight: 700,
    motionPace: "medium",
    motionHook: "before_after",
    spinSpeed: 0.55,
    voice: "Everyday talk, one clear reason to buy today.",
    bestFor: {
      verticals: ["seller", "spot"],
      goals: ["sales", "trust", "event"],
      channels: ["whatsapp", "facebook", "instagram"],
      markets: ["nigeria", "ghana", "east-africa", "southern-africa"],
    },
    why: "Emerald on near-black holds contrast through WhatsApp's compression, which kills most gradients.",
    watchOut: "Deep background only; put it on white and the emerald turns muddy.",
    cues: ["deal", "combo", "bundle", "today", "open", "shop", "delivery", "cash"],
  },
];

export const BRAND_LOOK_FAMILIES: BrandLookFamily[] = [
  "Bold poster",
  "Editorial luxe",
  "Clean corporate",
  "Soft warm",
  "Street tech",
];

const LOOK_BY_ID = new Map<string, BrandLook>(
  BRAND_LOOKS.map((look) => [look.id as string, look])
);

export function brandLookById(id: string | null | undefined): BrandLook | null {
  if (!id) return null;
  return LOOK_BY_ID.get(id) ?? null;
}

const HEX = /^#[0-9A-Fa-f]{6}$/;

export function isHex(value: string | null | undefined): value is string {
  return typeof value === "string" && HEX.test(value);
}

function normalize(hex: string): string {
  return hex.toUpperCase();
}

/**
 * A saved kit carries no style column, so the look is recognised from its
 * palette. Palettes in this file are unique, which makes the lookup exact.
 */
export function matchLook(
  primary: string | null | undefined,
  secondary: string | null | undefined
): BrandLook | null {
  if (!isHex(primary) || !isHex(secondary)) return null;
  const p = normalize(primary);
  const s = normalize(secondary);
  return (
    BRAND_LOOKS.find(
      (look) => normalize(look.primary) === p && normalize(look.secondary) === s
    ) ?? null
  );
}

/** Readable ink for a coloured surface, so every look can be checked, not hoped for. */
export function inkOn(hex: string): "#0A0A0F" | "#FFFFFF" {
  if (!isHex(hex)) return "#0A0A0F";
  const [r, g, b] = [1, 3, 5].map((index) =>
    Number.parseInt(hex.slice(index, index + 2), 16) / 255
  );
  const luminance = 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  return luminance > 0.6 ? "#0A0A0F" : "#FFFFFF";
}

function channelLum(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((index) => {
    const v = Number.parseInt(hex.slice(index, index + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/** WCAG contrast between the two brand colours. 4.5 is comfortable caption text. */
export function paletteContrast(primary: string, secondary: string): number {
  if (!isHex(primary) || !isHex(secondary)) return 0;
  const a = channelLum(normalize(primary));
  const b = channelLum(normalize(secondary));
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return Number(((hi + 0.05) / (lo + 0.05)).toFixed(2));
}

/**
 * Thumbnail legibility, our own rule rather than a borrowed one: the price and
 * CTA are the two things a buyer must read at WhatsApp-status size.
 */
export function readabilityScore(look: BrandLook): number {
  const priceContrast = Math.min(
    paletteContrast(look.primary, look.secondary),
    paletteContrast(look.accent, look.secondary)
  );
  const ratio = Math.max(0, Math.min(1, priceContrast / 7));
  const weight = look.headlineWeight >= 600 ? 0.18 : 0.08;
  return Number((ratio * 0.8 + weight).toFixed(2));
}

export function marketForCountry(code: string | null | undefined): BrandMarket | null {
  if (!code) return null;
  const iso = code.toUpperCase();
  for (const [market, codes] of Object.entries(MARKET_CODES)) {
    if (codes.includes(iso)) return market as BrandMarket;
  }
  return null;
}

const GOAL_CUES: { goal: BrandGoal; words: string[] }[] = [
  {
    goal: "sales",
    words: ["sale", "discount", "price", "cheap", "clear", "offer", "promo", "deal", "restock"],
  },
  { goal: "launch", words: ["launch", "new", "drop", "opening", "unveil", "first", "introducing"] },
  {
    goal: "event",
    words: ["event", "party", "concert", "weekend", "night", "show", "celebration", "gala", "live"],
  },
  {
    goal: "trust",
    words: ["trust", "company", "corporate", "years", "certified", "professional", "partner", "hire", "team"],
  },
  {
    goal: "booking",
    words: ["book", "booking", "reserve", "appointment", "table", "call", "order now", "slot", "service"],
  },
];

const CHANNEL_CUES: { channel: BrandChannel; words: string[] }[] = [
  { channel: "whatsapp", words: ["whatsapp", "status", "broadcast", "chat", "direct message"] },
  { channel: "instagram", words: ["instagram", "insta", "feed", "reel", "story", "bio"] },
  { channel: "tiktok", words: ["tiktok", "tik tok", "short video", "trend"] },
  { channel: "facebook", words: ["facebook", "fb", "page", "group", "marketplace"] },
];

/** Cheap text reading so a free-text brief can drive the advisor. */
export function detectGoals(text: string | null | undefined): BrandGoal[] {
  if (!text) return [];
  const hay = text.toLowerCase();
  return GOAL_CUES.filter((entry) => entry.words.some((word) => hay.includes(word))).map(
    (entry) => entry.goal
  );
}

export function detectChannels(text: string | null | undefined): BrandChannel[] {
  if (!text) return [];
  const hay = text.toLowerCase();
  return CHANNEL_CUES.filter((entry) =>
    entry.words.some((word) => hay.includes(word))
  ).map((entry) => entry.channel);
}

export interface LookProfile {
  vertical?: string | null;
  /** ISO 3166-1 alpha-2 from KYC or the billing country. */
  country?: string | null;
  language?: string | null;
  goal?: string | null;
  channels?: string[] | null;
  /** Free text — the campaign brief or the shop description. */
  brief?: string | null;
}

export interface RankedLook {
  look: BrandLook;
  score: number;
  reasons: string[];
}

const VERTICAL_LABEL: Record<BrandVertical, string> = {
  seller: "selling",
  company: "a company",
  fashion: "fashion",
  spot: "an event or venue",
};

function overlap<T>(a: readonly T[], b: readonly T[]): T[] {
  return a.filter((value) => b.includes(value));
}

/**
 * Deterministic, explainable, instant: scores every look against the seller's
 * profile and brief and returns reasons in plain words. No vendor call — the
 * advisor has to answer while the page is still loading on 3G.
 */
export function recommendLooks(profile: LookProfile, limit = BRAND_LOOKS.length): RankedLook[] {
  const vertical = (["seller", "company", "fashion", "spot"] as const).includes(
    profile.vertical as BrandVertical
  )
    ? (profile.vertical as BrandVertical)
    : null;
  const market = marketForCountry(profile.country);
  const isFrench = profile.language === "fr";
  const goals = new Set<BrandGoal>();
  if ((BRAND_GOALS as { value: BrandGoal }[]).some((g) => g.value === profile.goal)) {
    goals.add(profile.goal as BrandGoal);
  }
  detectGoals(profile.brief).forEach((goal) => goals.add(goal));

  const channels = new Set<BrandChannel>();
  (profile.channels ?? []).forEach((channel) => {
    if ((BRAND_CHANNELS as { value: BrandChannel }[]).some((c) => c.value === channel)) {
      channels.add(channel as BrandChannel);
    }
  });
  detectChannels(profile.brief).forEach((channel) => channels.add(channel));

  const brief = (profile.brief ?? "").toLowerCase();

  const ranked = BRAND_LOOKS.map<RankedLook>((look) => {
    const reasons: string[] = [];
    let score = 0;

    if (vertical && look.bestFor.verticals.includes(vertical)) {
      score += 22;
      reasons.push(`Built for ${VERTICAL_LABEL[vertical]}`);
    }

    const goalHits = overlap(look.bestFor.goals, [...goals]);
    if (goalHits.length > 0) {
      score += 30 + (goalHits.length > 1 ? 6 : 0);
      reasons.push(`Suits ${GOAL_LABEL[goalHits[0]!]}`);
    }

    if (channels.size > 0) {
      const hits = overlap(look.bestFor.channels, [...channels]);
      if (hits.length > 0) {
        score += Math.round((hits.length / channels.size) * 18);
        reasons.push(`Reads well on ${hits.map((h) => CHANNEL_LABEL[h]).join(" and ")}`);
      }
    }

    if (market && look.bestFor.markets.includes(market)) {
      score += 12;
      reasons.push(`Tuned for ${MARKET_LABEL[market]}`);
    } else if (look.bestFor.markets.includes("pan-africa")) {
      score += 4;
    }

    if (isFrench && look.bestFor.markets.includes("francophone")) {
      score += 8;
      reasons.push("Accents and French headlines keep their shape");
    }

    const cueHits = look.cues.filter((cue) => brief.includes(cue));
    if (cueHits.length > 0) {
      score += Math.min(14, cueHits.length * 5);
      reasons.push(`Matches the words in your brief (${cueHits.slice(0, 2).join(", ")})`);
    }

    const readable = readabilityScore(look);
    score += Math.round(readable * 12);
    if (readable >= 0.7) {
      reasons.push("Price and offer still read at thumbnail size");
    }

    return { look, score, reasons: reasons.slice(0, 3) };
  });

  return ranked
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.look.name.localeCompare(b.look.name) ||
        a.look.id.localeCompare(b.look.id)
    )
    .slice(0, limit);
}

/** The three looks an advisor would put in front of this seller first. */
export function topLooks(profile: LookProfile): RankedLook[] {
  return recommendLooks(profile, 3);
}

/** Looks that share a family, for "if you liked this" chips. */
export function siblingLooks(id: BrandLookId): BrandLook[] {
  const look = brandLookById(id);
  if (!look) return [];
  return BRAND_LOOKS.filter((item) => item.family === look.family && item.id !== look.id);
}

/**
 * Filters the gallery. Empty arrays mean "no filter on that axis".
 */
export function filterLooks(input: {
  vertical?: string | null;
  goal?: BrandGoal | null;
  goals?: BrandGoal[];
  channels?: BrandChannel[];
  family?: BrandLookFamily | null;
  market?: BrandMarket | null;
}): BrandLook[] {
  const goals = input.goals?.length ? input.goals : input.goal ? [input.goal] : [];
  return BRAND_LOOKS.filter((look) => {
    if (input.family && look.family !== input.family) return false;
    if (input.market && !look.bestFor.markets.includes(input.market)) return false;
    if (input.vertical && !look.bestFor.verticals.includes(input.vertical as BrandVertical)) {
      return false;
    }
    if (goals.length > 0 && overlap(look.bestFor.goals, goals).length === 0) return false;
    if (
      input.channels?.length &&
      overlap(look.bestFor.channels, input.channels).length === 0
    ) {
      return false;
    }
    return true;
  });
}
