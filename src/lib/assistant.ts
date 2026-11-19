import {
  ApiError,
  api,
  type CampaignStatus,
  type ScheduleChannel,
  type ScheduleStatus,
} from "@/lib/api";
import type { StoryRefineResult } from "@adgenie/core";

export type { StoryRefineResult };

/**
 * Client half of the Genie contract (the server half is
 * apps/api/src/assistant). Same endpoints serve the web app today and the
 * Flutter client later: one turn in, one reply out, no server-side transcript.
 * The wire format keeps the API's snake_case names; the UI works in camelCase.
 */

export type AssistantScreen =
  | "create"
  | "dashboard"
  | "campaign"
  | "library"
  | "notifications"
  | "credits"
  | "settings"
  | "calendar"
  | "other";

export type AssistantSuggestionKind = "headline" | "caption" | "hook" | "cta" | "idea" | "tip";

export interface AssistantSuggestion {
  kind: AssistantSuggestionKind;
  label: string;
  text: string;
}

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantTurn {
  reply: string;
  suggestions: AssistantSuggestion[];
  followups: string[];
  /** Twi and Ga drafts need a native-speaker check before posting. */
  beta: boolean;
  provider?: string;
  model?: string;
}

export interface AssistantContext {
  screen: AssistantScreen;
  language?: string | null;
  vertical?: string | null;
  businessName?: string | null;
  headline?: string | null;
  details?: string | null;
  sourceUrl?: string | null;
  goal?: string | null;
  priceLabel?: string | null;
  offerLabel?: string | null;
  formats?: string[] | null;
  brand?: {
    name?: string | null;
    tone?: string | null;
    look?: string | null;
    primary?: string | null;
    secondary?: string | null;
  } | null;
  credits?: number | null;
  campaignStatus?: CampaignStatus | null;
  recentCampaigns?: { status: CampaignStatus; title: string }[] | null;
  library?: {
    plans?: number | null;
    images?: number | null;
    videos?: number | null;
    captions?: number | null;
  } | null;
  /** `day` is the label the customer reads on screen, not a timestamp. */
  agenda?: {
    unscheduled?: number | null;
    items?: {
      day: string;
      title: string;
      channel?: ScheduleChannel | null;
      status?: ScheduleStatus | null;
    }[] | null;
  } | null;
  notifications?: {
    unread?: number | null;
    recent?: { kind: string; title: string }[] | null;
  } | null;
}

interface WireContext {
  screen: AssistantScreen;
  language?: string;
  vertical?: string;
  business_name?: string;
  headline?: string;
  details?: string;
  goal?: string;
  price_label?: string;
  offer_label?: string;
  formats?: string[];
  brand?: Record<string, string>;
  credits?: number;
  campaign_status?: string;
  recent_campaigns?: { status: string; title: string }[];
  library?: { plans?: number; images?: number; videos?: number; captions?: number };
  agenda?: {
    unscheduled?: number;
    items?: { day: string; title: string; channel?: string; status?: string }[];
  };
  notifications?: {
    unread?: number;
    recent?: { kind: string; title: string }[];
  };
}

function count(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * The API only accepts the enumerated values, and rejects the whole turn when it
 * sees one it does not know. Profile rows are plain strings, so a stale or hand-
 * edited value is dropped here rather than turning a question into a 400.
 */
const WIRE_LANGUAGES = ["en", "fr", "tw", "gaa"];
const WIRE_VERTICALS = ["seller", "company", "fashion", "spot"];
const WIRE_FORMATS = ["1:1", "4:5", "9:16"];

function oneOf<T extends string>(
  value: T | string | null | undefined,
  allowed: readonly string[]
): T | undefined {
  return typeof value === "string" && allowed.includes(value) ? (value as T) : undefined;
}

function wireContext(context: AssistantContext): WireContext {
  const language = oneOf(context.language, WIRE_LANGUAGES);
  const vertical = oneOf(context.vertical, WIRE_VERTICALS);
  const sizes = context.formats?.filter((format) => WIRE_FORMATS.includes(format));
  const brand = context.brand
    ? Object.fromEntries(
        Object.entries(context.brand).filter((entry): entry is [string, string] =>
          typeof entry[1] === "string" && entry[1].length > 0
        )
      )
    : undefined;

  const recent = context.notifications?.recent
    ?.slice(0, 5)
    .map((item) => ({ kind: item.kind.slice(0, 40), title: item.title.slice(0, 160) }));
  const unread = context.notifications?.unread;
  const notifications =
    typeof unread === "number" || (recent && recent.length > 0)
      ? {
          ...(typeof unread === "number" ? { unread } : {}),
          ...(recent && recent.length > 0 ? { recent } : {}),
        }
      : undefined;

  const shelf = context.recentCampaigns
    ?.slice(0, 5)
    .map((item) => ({ status: item.status, title: item.title.slice(0, 80) }));

  const made = context.library;
  const plans = made?.plans;
  const images = made?.images;
  const videos = made?.videos;
  const captions = made?.captions;
  const library =
    count(plans) || count(images) || count(videos) || count(captions)
      ? {
          ...(count(plans) ? { plans } : {}),
          ...(count(images) ? { images } : {}),
          ...(count(videos) ? { videos } : {}),
          ...(count(captions) ? { captions } : {}),
        }
      : undefined;

  const agendaItems =
    context.agenda?.items && context.agenda.items.length > 0
      ? context.agenda.items.slice(0, 7).map((item) => ({
          day: item.day.slice(0, 40),
          title: item.title.slice(0, 80),
          ...(item.channel ? { channel: item.channel } : {}),
          ...(item.status ? { status: item.status } : {}),
        }))
      : undefined;
  const unscheduled = context.agenda?.unscheduled;
  const agenda =
    agendaItems || count(unscheduled)
      ? {
          ...(count(unscheduled) ? { unscheduled } : {}),
          ...(agendaItems ? { items: agendaItems } : {}),
        }
      : undefined;

  return {
    screen: context.screen,
    ...(language ? { language } : {}),
    ...(vertical ? { vertical } : {}),
    ...(context.businessName ? { business_name: context.businessName } : {}),
    ...(context.headline ? { headline: context.headline } : {}),
    ...(context.details ? { details: context.details } : {}),
    ...(context.sourceUrl ? { source_url: context.sourceUrl } : {}),
    ...(context.goal ? { goal: context.goal } : {}),
    ...(context.priceLabel ? { price_label: context.priceLabel } : {}),
    ...(context.offerLabel ? { offer_label: context.offerLabel } : {}),
    ...(sizes && sizes.length > 0 ? { formats: sizes } : {}),
    ...(brand && Object.keys(brand).length > 0 ? { brand } : {}),
    ...(typeof context.credits === "number" ? { credits: context.credits } : {}),
    ...(context.campaignStatus ? { campaign_status: context.campaignStatus } : {}),
    ...(shelf && shelf.length > 0 ? { recent_campaigns: shelf } : {}),
    ...(library && Object.keys(library).length > 0 ? { library } : {}),
    ...(agenda ? { agenda } : {}),
    ...(notifications ? { notifications } : {}),
  };
}

/** The API caps the window at 12 turns; send the newest ones, oldest first. */
export function windowMessages(messages: AssistantMessage[]): AssistantMessage[] {
  return messages.slice(-12);
}

/**
 * The server gives each vendor 25s, so two of them fit inside this budget. The
 * deadline is the last line of defence: a customer should never watch dots
 * forever, even if a proxy swallows the response.
 */
const ASSISTANT_DEADLINE_MS = 55_000;

async function withDeadline<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ASSISTANT_DEADLINE_MS);
  try {
    return await run(controller.signal);
  } catch (err) {
    if (controller.signal.aborted) {
      throw new ApiError(
        504,
        "Genie took too long to answer. Try a shorter question, or ask again in a moment.",
        null
      );
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function askGenie(input: {
  messages: AssistantMessage[];
  context: AssistantContext;
}): Promise<AssistantTurn> {
  return withDeadline((signal) =>
    api<AssistantTurn>("/assistant/chat", {
      method: "POST",
      body: {
        messages: windowMessages(input.messages),
        context: wireContext(input.context),
      },
      signal,
    })
  );
}

export async function suggestCopy(input: {
  messages: AssistantMessage[];
  context: AssistantContext;
  field: "headline" | "details" | "caption" | "cta" | "idea";
}): Promise<AssistantTurn> {
  return withDeadline((signal) =>
    api<AssistantTurn>("/assistant/suggest", {
      method: "POST",
      body: {
        messages: windowMessages(input.messages),
        context: wireContext(input.context),
        field: input.field,
      },
      signal,
    })
  );
}

/**
 * Ask Genie to tidy the story the owner typed. The server always answers: it
 * polishes with the model when one is free, and falls back to the same
 * `tidyStory` rules the client ran, so a busy vendor never eats the result.
 */
export async function refineStory(input: {
  story: string;
  context: AssistantContext;
}): Promise<StoryRefineResult> {
  return withDeadline((signal) =>
    api<StoryRefineResult>("/assistant/refine-story", {
      method: "POST",
      body: {
        story: input.story,
        context: wireContext(input.context),
      },
      signal,
    })
  );
}

export interface AssistantStatus {
  available: boolean;
  mode: string;
  text_model: string;
  note: string;
}

export function readAssistantStatus(): Promise<AssistantStatus> {
  return api<AssistantStatus>("/assistant/status", { method: "GET" });
}

/** Screens name themselves; anything unmapped is "other". */
export function screenFromPath(pathname: string): AssistantScreen {
  const first = pathname.split("/").filter(Boolean)[0] ?? "dashboard";
  switch (first) {
    case "create":
    case "dashboard":
    case "library":
    case "notifications":
    case "credits":
    case "settings":
    case "calendar":
      return first;
    case "campaigns":
      return "campaign";
    default:
      return "other";
  }
}

// ─── Transcript kept on the device ────────────────────────────────────────────

const TRANSCRIPT_KEY = "adgenie.genie.transcript.v1";
const MAX_STORED = 20;

export function loadTranscript(): AssistantMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(TRANSCRIPT_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is AssistantMessage =>
          Boolean(item) &&
          typeof item === "object" &&
          ((item as AssistantMessage).role === "user" ||
            (item as AssistantMessage).role === "assistant") &&
          typeof (item as AssistantMessage).content === "string"
      )
      .slice(-MAX_STORED);
  } catch {
    return [];
  }
}

export function saveTranscript(messages: AssistantMessage[]): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(TRANSCRIPT_KEY, JSON.stringify(messages.slice(-MAX_STORED)));
  } catch {
    // Storage full or blocked: the conversation still works for this page.
  }
}

export function clearTranscript(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(TRANSCRIPT_KEY);
  } catch {
    // Nothing to clear.
  }
}
