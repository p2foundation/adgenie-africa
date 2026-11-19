import { z } from "zod";
import { AiError, copyNeedsReview, languageName } from "./ai";
import type {
  CampaignStatus,
  Language,
  OutputSize,
  Vertical,
} from "./schemas";
import type { MarketingChannel } from "./platform-policy";

/**
 * Genie — the in-app assistant. One contract shared by the web app and the
 * future Flutter client: a stateless turn (recent messages + screen context in,
 * reply + copyable suggestions out). Nothing here touches the database; the
 * caller owns the transcript, which is what lets both clients ship before a
 * threads table is approved.
 *
 * All model calls run in the API (AGENTS.md rule 4). The assistant writes copy,
 * never facts: prices and phone numbers stay with our renderer (rule 1), and the
 * model is told to refuse anything `docs/safety.md` forbids.
 */

export const ASSISTANT_SCREENS = [
  "create",
  "dashboard",
  "campaign",
  "library",
  "notifications",
  "credits",
  "settings",
  "calendar",
  "other",
] as const;
export type AssistantScreen = (typeof ASSISTANT_SCREENS)[number];

export const ASSISTANT_SUGGESTION_KINDS = [
  "headline",
  "caption",
  "hook",
  "cta",
  "idea",
  "tip",
] as const;
export type AssistantSuggestionKind = (typeof ASSISTANT_SUGGESTION_KINDS)[number];

/** Fields the inline "Suggest with AI" button can target inside a brief. */
export const ASSISTANT_SUGGEST_FIELDS = [
  "headline",
  "details",
  "caption",
  "cta",
  "idea",
] as const;
export type AssistantSuggestField = (typeof ASSISTANT_SUGGEST_FIELDS)[number];

export const ASSISTANT_INTENTS = ["chat", "suggest"] as const;
export type AssistantIntent = (typeof ASSISTANT_INTENTS)[number];

export const ASSISTANT_ROLES = ["user", "assistant"] as const;
export type AssistantRole = (typeof ASSISTANT_ROLES)[number];

export interface AssistantMessage {
  role: AssistantRole;
  content: string;
}

/**
 * What the client tells us about the customer's screen. Every field is optional
 * except the screen name, so a new page can start sending context before the
 * contract grows. The API whitelists these fields — anything else is dropped by
 * the validation pipe and never reaches a model.
 */
export interface AssistantContext {
  screen: AssistantScreen;
  language?: Language | null;
  vertical?: Vertical | null;
  businessName?: string | null;
  headline?: string | null;
  /** The customer's own words about what they are selling. */
  details?: string | null;
  /** A source address only; Genie cannot browse or treat it as page content. */
  sourceUrl?: string | null;
  goal?: string | null;
  priceLabel?: string | null;
  offerLabel?: string | null;
  formats?: OutputSize[] | null;
  brand?: {
    name?: string | null;
    tone?: string | null;
    look?: string | null;
    primary?: string | null;
    secondary?: string | null;
  } | null;
  credits?: number | null;
  /** Where the campaign on this screen stands. */
  campaignStatus?: CampaignStatus | null;
  /** The shelf under the campaign: newest plans first, title as the user reads it. */
  recentCampaigns?: { status: CampaignStatus; title: string }[] | null;
  /** What is already in the library, counted by kind. */
  library?: {
    plans?: number | null;
    images?: number | null;
    videos?: number | null;
    captions?: number | null;
  } | null;
  /**
   * The calendar board. `day` is the label the customer sees on their screen
   * (the app renders Africa/Accra), not an ISO timestamp — the model has no
   * clock and an unreadable date is worse than none.
   */
  agenda?: {
    unscheduled?: number | null;
    items?: {
      day: string;
      title: string;
      channel?: MarketingChannel | null;
      status?: "scheduled" | "posted" | "skipped" | null;
    }[] | null;
  } | null;
  notifications?: {
    unread?: number | null;
    recent?: { kind: string; title: string }[] | null;
  } | null;
}

export const AssistantSuggestionSchema = z.object({
  kind: z.enum(ASSISTANT_SUGGESTION_KINDS).catch("idea"),
  label: z.string().trim().min(1).max(40),
  text: z.string().trim().min(1).max(400),
});
export type AssistantSuggestion = z.infer<typeof AssistantSuggestionSchema>;

export const AssistantReplySchema = z.object({
  reply: z.string().trim().min(1).max(900),
  suggestions: z.array(AssistantSuggestionSchema).max(4).default([]),
  followups: z.array(z.string().trim().min(1).max(80)).max(3).default([]),
});
export type AssistantReply = z.infer<typeof AssistantReplySchema>;

/**
 * JSON Schema for the model. Stays inside the subset the Interactions API
 * documents (type, description, properties, required, items, maxItems,
 * propertyOrdering) — enums are validated by Zod instead of asked for.
 */
export const ASSISTANT_REPLY_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    reply: {
      type: "string",
      description:
        "The answer to the customer, at most 80 words. Plain language, no markdown headings, no bullet characters.",
    },
    suggestions: {
      type: "array",
      maxItems: 4,
      description:
        "Copy the customer can use as-is. Empty when the question is not about writing something.",
      items: {
        type: "object",
        properties: {
          kind: {
            type: "string",
            description: "One of: headline, caption, hook, cta, idea, tip.",
          },
          label: {
            type: "string",
            description: "Two or three words naming the approach, e.g. 'Weekend urgency'.",
          },
          text: {
            type: "string",
            description:
              "The ready-to-use line. No placeholders, no invented price, no invented claim.",
          },
        },
        required: ["kind", "label", "text"],
        propertyOrdering: ["kind", "label", "text"],
      },
    },
    followups: {
      type: "array",
      maxItems: 3,
      description: "Short questions the customer might ask next, at most 8 words each.",
      items: { type: "string" },
    },
  },
  required: ["reply", "suggestions", "followups"],
  propertyOrdering: ["reply", "suggestions", "followups"],
};

/** Parse and validate a model's JSON. Throws AiError when it does not match. */
export function parseAssistantReply(text: string): AssistantReply {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new AiError(
      "AI_BAD_RESPONSE",
      "Genie answered in a way we could not read. Please try again.",
      502
    );
  }
  const parsed = AssistantReplySchema.safeParse(raw);
  if (!parsed.success) {
    throw new AiError(
      "AI_BAD_RESPONSE",
      "Genie answered in a way we could not read. Please try again.",
      502
    );
  }
  return parsed.data;
}

// ─── Product knowledge ────────────────────────────────────────────────────────
// Facts only, and only ones this repository can back up. No prices, no delivery
// times, no feature promises: the quote screen is the single source of cost.

const PRODUCT_FACTS = [
  "AdGenie turns a short brief into a campaign pack: ad images in 1:1, 4:5 and 9:16, a caption with hashtags and a call to action, and optionally a short vertical video or a fashion spin (model, mannequin or digital kit).",
  "It serves four kinds of customer: shops and small sellers, companies, fashion and model creators, and venues or events.",
  "It writes in English, French, Twi and Ga. Twi and Ga are in beta, so those drafts should be checked by a native speaker before posting.",
  "Credits are prepaid. The exact price appears on the review step before anything runs, and a failed generation is refunded automatically. Payment is in Ghana cedis by mobile money or card.",
  "Prices, phone numbers, business names and calls to action are drawn by our renderer from the facts the customer typed. The image model is not allowed to draw text.",
  "Notifications mean: a campaign finished, a campaign failed, or an identity check was approved or rejected.",
  "A signed-up account starts with free credits; the balance and packs are on the Credits page.",
];

export function assistantSystemPrompt(): string {
  return [
    "You are Genie, the assistant inside AdGenie Africa, a tool that makes ads for small businesses in Ghana and West Africa.",
    "You are warm, brief and practical. You sound like a sharp friend who runs campaigns for a living, not a chatbot.",
    "",
    "Rules you never break:",
    "1. Reply in the customer's language. If they wrote in Twi or Ga, keep sentences plain and remind them a native speaker should check copy before posting.",
    "2. Never invent a price, discount, date, award, testimonial, guarantee, statistic or health claim. Use only facts the customer gave you or the product facts below.",
    "3. Never put a price or a phone number inside a headline, hook or CTA. Those are drawn by our renderer.",
    "4. Never ask for a password, mobile-money PIN, card number or ID documents. If money or identity is involved, point the customer to Support.",
    "5. Never claim to be a human, and never promise a result (sales, reach, followers).",
    "6. Refuse dishonest work in one line and offer an honest alternative: fake reviews or testimonials, before/after body claims, medical claims, targeting minors, or using a real person's likeness without consent.",
    "7. Suggestions must be copy-ready: no placeholders like [price] or [your business], no instructions to the customer inside the text.",
    "8. Keep replies under 80 words unless the customer explicitly asks for longer copy.",
    "9. Return JSON only, matching the supplied schema.",
    "",
    "What you know about AdGenie:",
    ...PRODUCT_FACTS.map((fact) => `- ${fact}`),
  ].join("\n");
}

function fmtList(values: (string | null | undefined)[] | null | undefined): string {
  const clean = (values ?? []).filter((value): value is string => Boolean(value));
  return clean.length > 0 ? clean.join(", ") : "not set";
}

function clip(value: string, max: number): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`;
}

/**
 * The user turn: a compact fact sheet plus the last few messages. Everything is
 * clipped here rather than trusted, so one long message cannot crowd out the
 * instructions — and nothing the customer did not type is sent.
 */
export function assistantContextPrompt(input: {
  context: AssistantContext;
  messages: AssistantMessage[];
  intent: AssistantIntent;
  field?: AssistantSuggestField;
}): string {
  const { context, messages, intent, field } = input;
  const brand = context.brand ?? null;
  const notes = context.notifications ?? null;

  const lines: string[] = [
    `The customer is on the "${context.screen}" screen.`,
    context.language ? `Their campaign language: ${languageName(context.language)}.` : "",
  ];

  const draft: string[] = [];
  if (context.vertical) draft.push(`Business type: ${context.vertical}.`);
  if (context.businessName) draft.push(`Business name: ${clip(context.businessName, 120)}.`);
  if (context.headline) draft.push(`Working headline: ${clip(context.headline, 90)}.`);
  if (context.goal) draft.push(`Goal: ${clip(context.goal, 200)}.`);
  if (context.details) draft.push(`In their words: ${clip(context.details, 1200)}`);
  if (context.sourceUrl) draft.push(`Source address: ${clip(context.sourceUrl, 500)}. Use only facts supplied above; do not claim to have browsed it.`);
  if (context.priceLabel) draft.push(`Price to use exactly: ${clip(context.priceLabel, 40)}.`);
  if (context.offerLabel) draft.push(`Offer to use exactly: ${clip(context.offerLabel, 40)}.`);
  if (context.formats && context.formats.length > 0) {
    draft.push(`Formats chosen: ${fmtList(context.formats)}.`);
  }
  if (context.campaignStatus) {
    draft.push(`Where this plan stands: ${context.campaignStatus}.`);
  }
  if (draft.length > 0) lines.push("", "Their current draft:", ...draft.map((line) => `- ${line}`));

  const profile: string[] = [];
  if (brand?.name) profile.push(`Brand kit: ${clip(brand.name, 80)}.`);
  if (brand?.tone) profile.push(`Voice: ${clip(brand.tone, 40)}.`);
  if (brand?.look) profile.push(`Art direction: ${clip(brand.look, 40)}.`);
  if (brand?.primary || brand?.secondary) {
    profile.push(`Colours: ${fmtList([brand?.primary, brand?.secondary])}.`);
  }
  if (typeof context.credits === "number") profile.push(`Credits left: ${context.credits}.`);
  if (profile.length > 0) lines.push("", ...profile);

  const shelf = (context.recentCampaigns ?? []).slice(0, 5);
  if (shelf.length > 0) {
    lines.push(
      "",
      "Their campaign shelf:",
      ...shelf.map(
        (item) => `- ${item.status}: ${clip(item.title, 80)}`
      )
    );
  }

  const made = context.library;
  if (made) {
    const parts = [
      typeof made.plans === "number" ? `${made.plans} plan${made.plans === 1 ? "" : "s"}` : "",
      typeof made.images === "number" ? `${made.images} image${made.images === 1 ? "" : "s"}` : "",
      typeof made.videos === "number" ? `${made.videos} video${made.videos === 1 ? "" : "s"}` : "",
      typeof made.captions === "number" ? `${made.captions} caption${made.captions === 1 ? "" : "s"}` : "",
    ].filter(Boolean);
    if (parts.length > 0) lines.push("", `In their library: ${parts.join(", ")}.`);
  }

  const agenda = context.agenda;
  const agendaItems = (agenda?.items ?? []).slice(0, 7);
  if (agendaItems.length > 0 || typeof agenda?.unscheduled === "number") {
    lines.push(
      "",
      agendaItems.length > 0 ? "Their posting plan:" : "Their posting plan: nothing on the calendar yet.",
      ...agendaItems.map((item) => {
        const tags = [item.channel, item.status].filter(Boolean).join(", ");
        return `- ${clip(item.day, 40)} — ${clip(item.title, 80)}${tags ? ` (${tags})` : ""}`;
      }),
      typeof agenda?.unscheduled === "number" && agenda.unscheduled > 0
        ? `${agenda.unscheduled} briefed plan${agenda.unscheduled === 1 ? "" : "s"} still waiting for a day.`
        : ""
    );
  }

  if (notes) {
    const recent = (notes.recent ?? []).slice(0, 5).map((item) => `${item.kind} ("${clip(item.title, 120)}")`);
    lines.push(
      "",
      `Notifications: ${typeof notes.unread === "number" ? `${notes.unread} unread` : "unread count unknown"}.`,
      recent.length > 0 ? `Most recent: ${recent.join("; ")}.` : ""
    );
  }

  const history = messages.slice(-8);
  if (history.length > 0) {
    lines.push("", "Conversation so far:");
    for (const message of history) {
      const who = message.role === "user" ? "Customer" : "Genie";
      lines.push(`${who}: ${clip(message.content, 800)}`);
    }
  }

  if (intent === "suggest") {
    const kind =
      field === "headline" || field === "caption" || field === "cta"
        ? field
        : "idea";
    lines.push(
      "",
      `The customer pressed "Suggest with AI" for their ${field ?? "details"} field.`,
      "Write up to 4 complete replacements they can accept as-is, in their language.",
      `Tag every suggestion with kind "${kind}".`,
      "In reply, name the angle in one short sentence (20 words maximum). No greeting, no questions."
    );
  } else {
    lines.push(
      "",
      "Answer the customer's last message now. Offer suggestions only when they help with writing or planning."
    );
  }

  if (context.language && copyNeedsReview(context.language)) {
    lines.push(
      "",
      `${languageName(context.language)} is a beta language: keep copy short and plain so a native reviewer can correct it quickly.`
    );
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
