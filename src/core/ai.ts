import { z } from "zod";
import type { BrandLook } from "./brand-looks";
import type { Language, OutputSize, Vertical } from "./schemas";

/**
 * The AI contract: what a provider must implement, what a campaign asks it for,
 * and the prompts that keep models inside our rules.
 *
 * Verified against Google's current docs (Oct 2026):
 *   https://ai.google.dev/gemini-api/docs/text-generation
 *   https://ai.google.dev/gemini-api/docs/image-generation
 *   https://ai.google.dev/gemini-api/docs/structured-output
 *   https://ai.google.dev/api/interactions
 * All providers are called from the API only (AGENTS.md rule 4).
 */

export const AI_PROVIDER_IDS = ["gemini", "openai", "mock"] as const;
export type AiProviderId = (typeof AI_PROVIDER_IDS)[number];

// Quickstart model for text; the image models are the documented
// "Nano Banana 2" family. Both are env-overridable so a rename is a config change.
export const DEFAULT_TEXT_MODEL = "gemini-3.8-flash";
export const DEFAULT_IMAGE_MODEL = "gemini-3.1-flash-image";

// OpenAI is the second vendor, used when Gemini says "not available". These are
// env-overridable (OPENAI_TEXT_MODEL / OPENAI_IMAGE_MODEL) because model names
// move faster than this file.
export const DEFAULT_OPENAI_TEXT_MODEL = "gpt-4o-mini";
export const DEFAULT_OPENAI_IMAGE_MODEL = "gpt-image-1";

/** Provider failures the API maps onto HTTP codes. Never a provider message verbatim. */
export type AiErrorCode =
  | "AI_NOT_CONFIGURED"
  | "AI_CAP_REACHED"
  | "AI_TIMEOUT"
  | "AI_PROVIDER_FAILED"
  | "AI_BAD_RESPONSE";

export class AiError extends Error {
  constructor(
    readonly code: AiErrorCode,
    message: string,
    readonly status: number,
    readonly retryable = false
  ) {
    super(message);
    this.name = "AiError";
  }
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface TextRequest {
  system?: string;
  prompt: string;
  /** JSON Schema; when set the provider must return JSON matching it. */
  schema?: Record<string, unknown>;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  /**
   * Structured context for the mock provider and evals. Real providers see only
   * the prompt; nothing here is silently appended to it.
   */
  context?: unknown;
}

export interface TextResult {
  text: string;
  provider: AiProviderId;
  model: string;
  usage: TokenUsage;
  costUsdMicros: number;
  latencyMs: number;
}

export interface ImageReference {
  data: Uint8Array;
  mimeType: string;
}

export interface ImageRequest {
  prompt: string;
  aspectRatio: OutputSize;
  references?: ImageReference[];
  timeoutMs?: number;
  /** Palette and subject hints for the mock provider and evals. */
  context?: unknown;
}

export interface ImageResult {
  data: Uint8Array;
  mimeType: string;
  provider: AiProviderId;
  model: string;
  costUsdMicros: number;
  latencyMs: number;
}

export interface TextProvider {
  readonly id: AiProviderId;
  readonly model: string;
  complete(request: TextRequest): Promise<TextResult>;
}

export interface ImageProvider {
  readonly id: AiProviderId;
  readonly model: string;
  generate(request: ImageRequest): Promise<ImageResult>;
}

export function providerLabel(id: AiProviderId): string {
  if (id === "gemini") return "Gemini";
  if (id === "openai") return "OpenAI";
  return "Sample render";
}

// ─── Text to speech ──────────────────────────────────────────────────────────
// Video campaigns want a voiceover. Two vendors behind one contract: GhanaNLP's
// Khaya for Twi and Ga, ElevenLabs for English and French. Both are keyed by env
// and both are optional — a video renders without audio rather than failing the
// campaign when a vendor is not configured.

/** Languages Khaya covers. Anything else goes to ElevenLabs. */
export const KHAYA_LANGUAGES: Language[] = ["tw", "gaa"];

/**
 * Voice is a brand choice, so no vendor voice is hard-coded here. Empty means
 * "not chosen yet": TtsService then skips ElevenLabs and the video is silent.
 * Populate (or pass request.voiceId) once the owner picks the house voice.
 */
export const ELEVENLABS_DEFAULT_VOICES: Partial<Record<Language, string>> = {};

export type TtsProviderId = "khaya" | "elevenlabs";

export interface TtsRequest {
  text: string;
  language: Language;
  voiceId?: string;
  speed?: number;
}

export interface TtsResult {
  data: Uint8Array;
  mimeType: string;
  durationSeconds: number;
  provider: TtsProviderId;
  model: string;
}

export interface TtsProvider {
  readonly id: TtsProviderId;
  readonly model: string;
  synthesize(request: TtsRequest): Promise<TtsResult>;
}

// ─── Cost (internal accounting, not customer pricing) ─────────────────────────
// Text rates are the published per-1M-token prices for Gemini 3.8 Flash. Google
// does not publish a per-image rate on the image-generation page, so the image
// figure is a conservative configured estimate used only for the spend guard and
// provider_costs; it is never shown to a customer.

export const TEXT_PRICE_USD_PER_MTOK = { input: 0.3, output: 2.5 } as const;
export const IMAGE_ESTIMATE_USD_MICROS = 40_000;

export function textCostMicros(usage: TokenUsage): number {
  const usd =
    (usage.inputTokens * TEXT_PRICE_USD_PER_MTOK.input +
      usage.outputTokens * TEXT_PRICE_USD_PER_MTOK.output) /
    1_000_000;
  return Math.round(usd * 1_000_000);
}

// ─── Output geometry ──────────────────────────────────────────────────────────

export const OUTPUT_CANVAS: Record<OutputSize, { width: number; height: number }> = {
  "1:1": { width: 1080, height: 1080 },
  "4:5": { width: 1080, height: 1350 },
  "9:16": { width: 1080, height: 1920 },
};

export const OUTPUT_LABEL: Record<OutputSize, string> = {
  "1:1": "Square feed",
  "4:5": "Portrait feed",
  "9:16": "Story / Reel",
};

// ─── Copy contract ────────────────────────────────────────────────────────────

export const CampaignCopySchema = z.object({
  strategy: z.string().min(1).max(400),
  headline: z.string().min(1).max(70),
  hook: z.string().min(1).max(120),
  caption: z.string().min(1).max(700),
  hashtags: z.array(z.string().min(1).max(40)).min(1).max(8),
  cta: z.string().min(1).max(60),
  alt: z.string().min(1).max(240),
});
export type CampaignCopy = z.infer<typeof CampaignCopySchema>;

/**
 * JSON Schema handed to the model. Kept to the subset the Interactions API
 * documents (type, description, properties, required, items, maxItems,
 * propertyOrdering) rather than OpenAPI keywords it does not promise.
 */
export const CAMPAIGN_COPY_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    strategy: {
      type: "string",
      description: "One sentence naming the angle you chose and why it fits this business.",
    },
    headline: {
      type: "string",
      description: "The line drawn large on the ad. At most 6 words. No price.",
    },
    hook: {
      type: "string",
      description: "The first line of a 15-second vertical cut. At most 15 words.",
    },
    caption: {
      type: "string",
      description: "The post caption with a call to action. Two or three short sentences.",
    },
    hashtags: {
      type: "array",
      items: { type: "string" },
      maxItems: 6,
      description: "Local discovery hashtags, without the # symbol.",
    },
    cta: {
      type: "string",
      description: "A short button-style instruction, at most 5 words.",
    },
    alt: {
      type: "string",
      description: "Alt text describing the ad for someone who cannot see it.",
    },
  },
  required: ["strategy", "headline", "hook", "caption", "hashtags", "cta", "alt"],
  propertyOrdering: ["strategy", "headline", "hook", "caption", "hashtags", "cta", "alt"],
};

/** Parse and validate a model's JSON. Throws AiError when it does not match. */
export function parseCampaignCopy(text: string): CampaignCopy {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new AiError("AI_BAD_RESPONSE", "The writer returned text we could not read.", 502);
  }
  const parsed = CampaignCopySchema.safeParse(raw);
  if (!parsed.success) {
    throw new AiError("AI_BAD_RESPONSE", "The writer returned copy that breaks our rules.", 502);
  }
  return parsed.data;
}

// ─── Briefs and prompts ───────────────────────────────────────────────────────

/**
 * How a fashion garment is presented. The three modes are the industry's three
 * honest answers: an AI model wearing it, a headless retail mannequin, or the
 * garment as a digital kit. Stored in the campaign plan — no schema change.
 */
export const SPIN_MODES = ["model", "mannequin", "kit"] as const;
export type SpinMode = (typeof SPIN_MODES)[number];

export interface CampaignBriefForAi {
  vertical: Vertical;
  /** Human market name for the prompt, e.g. "Ghana". */
  market: string;
  language: Language;
  goal: string;
  businessName?: string | null;
  headline?: string | null;
  details?: string | null;
  priceLabel?: string | null;
  offerLabel?: string | null;
  sourceUrl?: string | null;
  look?: Pick<BrandLook, "name" | "primary" | "secondary" | "layout" | "voice"> | null;
  tone?: string | null;
  /** Fashion presentation. Ignored outside the fashion vertical. */
  spinMode?: SpinMode | null;
}

const VERTICAL_SUBJECT: Record<Vertical, string> = {
  seller: "the product itself as the hero, on a real surface or held in a real hand",
  company: "the people and the workplace that deliver the service, at work but posed",
  fashion: "an adult model wearing the garment or accessory, full outfit visible",
  spot: "the venue, the table or the signature plate as the customer would first see it",
};

/**
 * Each mode changes what the camera points at, not the grade. A mannequin shot
 * has no person in it, so the model must not invent one; a kit shot is a
 * product presentation, not a lifestyle scene.
 */
const FASHION_PRESENTATION: Record<SpinMode, string> = {
  model:
    "an adult model wearing the garment, full-length, relaxed editorial pose, face turned three-quarters away from camera, natural skin and fabric movement",
  mannequin:
    "the garment on a headless tailor's mannequin in a premium boutique, no person and no face anywhere in frame",
  kit:
    "a digital fashion kit: the garment shown clean and suspended with its cut, seams and fabric texture visible, no person, no hanger text, no labels",
};

const LANGUAGE_NAME: Record<Language, string> = {
  en: "English",
  fr: "French",
  tw: "Twi",
  gaa: "Ga",
};

const LOOK_DIRECTION: Record<string, string> = {
  poster: "a single bold subject centred in the frame with generous empty space above and below",
  street: "a candid, unstaged frame with the subject slightly off-centre, moving",
  editorial: "a calm, styled still life with deliberate negative space and soft shadow",
  corporate: "a clean, evenly lit frame with structured empty space on one side for text",
};

export function scenePrompt(
  brief: CampaignBriefForAi,
  size: OutputSize,
  conceptIndex: number
): string {
  const look = brief.look ?? null;
  const composition = LOOK_DIRECTION[look?.layout ?? "poster"] ?? LOOK_DIRECTION.poster;
  const grade = look
    ? `Colour grade toward ${look.primary} and ${look.secondary}, true blacks, no neon.`
    : "Natural warm colour, true blacks.";
  const concept = conceptIndex === 0 ? "" : CONCEPT_ANGLES[conceptIndex % CONCEPT_ANGLES.length]!;
  const subject =
    brief.vertical === "fashion" && brief.spinMode
      ? FASHION_PRESENTATION[brief.spinMode]
      : VERTICAL_SUBJECT[brief.vertical];

  return [
    `A photorealistic advertising photograph made for a small business in ${brief.market}.`,
    `Subject: ${subject}.`,
    brief.vertical === "fashion" && brief.spinMode === "model"
      ? "The model is an adult. Skin keeps its real texture: pores, tone variation and natural highlights, never plastic or airbrushed."
      : "",
    brief.businessName ? `Business: ${brief.businessName}.` : "",
    brief.headline ? `The ad is about: ${brief.headline}.` : `The ad is about: ${brief.goal}.`,
    brief.details ? `Product and service detail: ${brief.details}.` : "",
    look ? `Art direction: ${look.name}, ${look.voice}.` : "",
    `Composition: ${composition}, framed for a ${size} crop.`,
    concept,
    `Lighting: natural daylight, soft but directional. Shot on a phone, 35mm look, shallow depth of field.`,
    grade,
    `Believable ${brief.market}: local materials, local setting, no stock-photo gloss.`,
    `STRICT RULES: no text, no letters, no numbers, no logos, no watermarks, no signage or packaging with readable words anywhere in the image.`,
    `No minors. No recognisable public figures. No self-harm, weapons, medical claims or before/after body imagery.`,
    `Leave the outer edges of the frame uncluttered so a separate text overlay can be placed there.`,
  ]
    .filter(Boolean)
    .join("\n");
}

const CONCEPT_ANGLES = [
  "",
  "Angle: show the product in use, mid-action, as the customer experienced it.",
  "Angle: close detail shot that proves quality — texture, stitching, finish.",
  "Angle: the before/after of the job done, without showing bodies.",
];

export function copySystemPrompt(): string {
  return [
    "You are AdGenie, the campaign writer for small businesses in Ghana and West Africa.",
    "You write short, specific, confident advertising copy that sounds like a person, not a brochure.",
    "",
    "Non-negotiable rules:",
    "1. Never invent a price, discount, date, award, testimonial, guarantee, statistic or health claim. Use only the facts in the brief.",
    "2. If the brief has no price, do not mention one. If it has one, use it exactly as written.",
    "3. No superlatives that cannot be proven ('best in Ghana', '100% safe').",
    "4. No emoji spam; at most one emoji in a caption, none in the headline.",
    "5. The headline is for a poster: six words at most, no full stop, no price.",
    "6. Write in the requested language, in that language's own idiom. Do not translate word for word from English.",
    "7. Return JSON only, matching the supplied schema.",
  ].join("\n");
}

export function copyUserPrompt(brief: CampaignBriefForAi, lookName: string | null): string {
  return [
    `Language: ${LANGUAGE_NAME[brief.language]}.`,
    `Business type: ${brief.vertical}.`,
    `Goal: ${brief.goal}.`,
    brief.businessName ? `Business name: ${brief.businessName}.` : "Business name: not given.",
    brief.headline ? `Working headline: ${brief.headline}.` : "",
    brief.details ? `Facts from the owner: ${brief.details}.` : "No extra facts were supplied.",
    brief.priceLabel ? `Price to use exactly: ${brief.priceLabel}.` : "No price was supplied — do not imply one.",
    brief.offerLabel ? `Offer to use exactly: ${brief.offerLabel}.` : "No offer was supplied — do not invent one.",
    brief.sourceUrl ? `Product page: ${brief.sourceUrl}.` : "",
    lookName ? `Brand voice: ${brief.tone ?? "confident"}, art direction "${lookName}".` : "",
    "",
    "Write one campaign. Caption should read like a caption someone would actually post, with the call to action last.",
    brief.language === "tw" || brief.language === "gaa"
      ? "This is a beta language: keep sentences plain so a native reviewer can correct them quickly."
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Twi and Ga output must be shown as beta, per AGENTS.md rule 7. */
export function copyNeedsReview(language: Language): boolean {
  return language === "tw" || language === "gaa";
}

export function languageName(language: Language): string {
  return LANGUAGE_NAME[language];
}
