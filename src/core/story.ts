import { z } from "zod";
import { AiError, languageName } from "./ai";
import type { Language, Vertical } from "./schemas";

export interface StoryFacts {
  date: boolean;
  time: boolean;
  venue: boolean;
  contact: boolean;
  price: boolean;
}

export interface StoryTidyResult {
  text: string;
  fixes: string[];
  missing: string[];
  facts: StoryFacts;
}

export interface StoryRefineResult {
  text: string;
  fixes: string[];
  missing: string[];
  headline: string | null;
  source: "ai" | "rules";
  provider?: string;
  model?: string;
  note?: string;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const SPELLINGS: Array<[RegExp, string]> = [
  [/\bmanagment\b/gi, "management"],
  [/\bmangement\b/gi, "management"],
  [/\bmanagemnt\b/gi, "management"],
  [/\bmanagemetn\b/gi, "management"],
  [/\bbussiness\b/gi, "business"],
  [/\bbuisness\b/gi, "business"],
  [/\bbusinesss\b/gi, "business"],
  [/\brecieve\b/gi, "receive"],
  [/\brecieved\b/gi, "received"],
  [/\brecieving\b/gi, "receiving"],
  [/\bseperate\b/gi, "separate"],
  [/\bseperated\b/gi, "separated"],
  [/\bseperately\b/gi, "separately"],
  [/\boccured\b/gi, "occurred"],
  [/\bcalender\b/gi, "calendar"],
  [/\baccomodate\b/gi, "accommodate"],
  [/\baccomodation\b/gi, "accommodation"],
  [/\btranning\b/gi, "training"],
  [/\btraning\b/gi, "training"],
  [/\bdigitial\b/gi, "digital"],
  [/\beventhough\b/gi, "even though"],
  [/\bthier\b/gi, "their"],
  [/\bteh\b/gi, "the"],
  [/\badn\b/gi, "and"],
  [/\breccomend\b/gi, "recommend"],
  [/\brecomend\b/gi, "recommend"],
  [/\benviroment\b/gi, "environment"],
  [/\boffice\b/gi, "office"],
];

const PROPER_TERMS: Array<[RegExp, string]> = [
  [/\bwhatsapp\b/gi, "WhatsApp"],
  [/\binstagram\b/gi, "Instagram"],
  [/\bfacebook\b/gi, "Facebook"],
  [/\btiktok\b/gi, "TikTok"],
  [/\bghana\b/gi, "Ghana"],
  [/\baccra\b/gi, "Accra"],
  [/\bkomenda\b/gi, "Komenda"],
  [/\btcot\b/gi, "TCOT"],
];

function capitalized(correct: string, match: string): string {
  if (match.length > 1 && match === match.toUpperCase()) return correct.toUpperCase();
  if (match[0] === match[0]?.toUpperCase()) return correct[0]?.toUpperCase() + correct.slice(1);
  return correct;
}

function replaceWholeWords(
  text: string,
  replacements: Array<[RegExp, string]>
): string {
  return replacements.reduce(
    (current, [pattern, correct]) =>
      current.replace(pattern, (match) => capitalized(correct, match)),
    text
  );
}

/**
 * Owners type fast and their words run together: "2026at the office". A digit
 * glued to a word is always a missing space. Ordinals keep their suffix, and a
 * lone capital after a digit is a model number ("3D", "4K"), not a word.
 */
function restoreMissingSpaces(text: string): string {
  return text.replace(/(\d)([a-zA-Z]+)/g, (match, digits: string, letters: string) => {
    if (letters.length === 1 && letters === letters.toUpperCase()) return match;
    const ordinal = letters.match(/^(st|nd|rd|th)(.*)$/i);
    if (ordinal) return `${digits}${ordinal[1]}${ordinal[2] ? ` ${ordinal[2]}` : ""}`;
    return `${digits} ${letters}`;
  });
}

function normalizePunctuation(text: string): string {
  return restoreMissingSpaces(
    text
      .replace(/[ \t]+/g, " ")
      .replace(/ *\n */g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/\s+([,.!?;])/g, "$1")
      .replace(/([,;])(?=[^\s\d])/g, "$1 ")
      .replace(/([!?]){2,}/g, "$1")
  );
}

function normalizeDatesAndTimes(text: string): string {
  const monthPattern = MONTHS.map((month) => month.slice(0, 3)).join("|");
  const weekdayPattern = WEEKDAYS.map((day) => day.slice(0, 3)).join("|");
  return text
    .replace(
      new RegExp(`(\\b\\d{1,2})\\s*-\\s*(\\d{1,2}\\s+(?:${monthPattern})[a-z]*)`, "gi"),
      "$1–$2"
    )
    .replace(
      /(\b\d{1,2}(?::\d{2})?)\s*([ap]\.?\s?m\.?)(?=\b)/gi,
      (_match, time: string, suffix: string) => {
        const cleanSuffix = suffix.replace(/\./g, "").toUpperCase();
        return `${time.includes(":") ? time : `${time}:00`} ${cleanSuffix}`;
      }
    )
    .replace(new RegExp(`\\b(${monthPattern})[a-z]*\\b`, "gi"), (match) => {
      const month = MONTHS.find(
        (candidate) => candidate.slice(0, 3).toLowerCase() === match.slice(0, 3).toLowerCase()
      );
      return month ? capitalized(month, match) : match;
    })
    .replace(new RegExp(`\\b(${weekdayPattern})[a-z]*\\b`, "gi"), (match) => {
      const day = WEEKDAYS.find(
        (candidate) => candidate.slice(0, 3).toLowerCase() === match.slice(0, 3).toLowerCase()
      );
      return day ? capitalized(day, match) : match;
    })
    .replace(/\bIT office\b/gi, "IT office")
    .replace(/\bit office\b/g, "IT office");
}

function capitalizeSentences(text: string): string {
  const capitalized = text.replace(
    /(^|[.!?]\s+|\n)([a-z])/g,
    (_match, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`
  );
  const needsPeriod =
    capitalized.length > 20 &&
    !/[.!?]$/.test(capitalized.trim()) &&
    !/[?]$/.test(capitalized.trim());
  return needsPeriod ? `${capitalized.trim()}.` : capitalized;
}

function hasDate(text: string): boolean {
  const monthPattern = MONTHS.map((month) => month.slice(0, 3)).join("|");
  const weekdayPattern = WEEKDAYS.map((day) => day.slice(0, 3)).join("|");
  return (
    new RegExp(
      `\\b\\d{1,2}(?:st|nd|rd|th)?\\s+(?:[-–]\\s*\\d{1,2}\\s+)?(?:${monthPattern})[a-z]*\\.?,?\\s*\\d{4}`,
      "i"
    ).test(text) ||
    new RegExp(`\\b(?:${monthPattern})[a-z]*\\.?\\s+\\d{1,2},?\\s*\\d{4}`, "i").test(text) ||
    new RegExp(`\\b(?:${weekdayPattern})[a-z]*\\b`, "i").test(text) ||
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/.test(text) ||
    /\b(?:today|tomorrow|tonight|next week|this weekend)\b/i.test(text)
  );
}

function hasTime(text: string): boolean {
  return (
    /\b\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)\b/i.test(text) ||
    /\b\d{1,2}(?:[._-]\d{2})\s*(?:hours?|hrs?|am|pm)\b/i.test(text) ||
    /\b\d{4}\s*(?:hours?|hrs?|am|pm)\b/i.test(text)
  );
}

function hasVenue(text: string): boolean {
  return /\b(?:at|near|venue|location|office|hall|school|auditorium|hotel|restaurant|premises|branch|store|room|centre|center|church|campus)\b/i.test(
    text
  );
}

function hasContact(text: string): boolean {
  return /\b(?:whatsapp|what.?app|call|phone|text|dms|dm|book|booking|register|registration|join|contact|email|ticket|rsvp|link|dial|visit)\b/i.test(
    text
  );
}

function hasPrice(text: string): boolean {
  return (
    /(?:GH¢|GHS|₵|cedis)\s*\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?\s*(?:GH¢|GHS|₵|cedis)/i.test(text) ||
    /\bfree\b/i.test(text)
  );
}

export function extractStoryFacts(text: string): StoryFacts {
  return {
    date: hasDate(text),
    time: hasTime(text),
    venue: hasVenue(text),
    contact: hasContact(text),
    price: hasPrice(text),
  };
}

function missingStoryFacts(
  facts: StoryFacts,
  vertical: Vertical | null | undefined,
  text: string
): string[] {
  const event =
    /\b(?:training|workshop|seminar|launch|conference|masterclass|class|webinar|event|party|concert|opening|graduation)\b/i.test(
      text
    );
  const product = vertical === "seller" || vertical === "fashion";
  const missing: string[] = [];

  if ((event || vertical === "spot" || vertical === "company") && !facts.date) {
    missing.push("Add the date so people know when it happens.");
  }
  if ((event || vertical === "spot") && !facts.time) {
    missing.push("Add the time so the invitation is complete.");
  }
  if ((event || vertical === "spot" || vertical === "company") && !facts.venue) {
    missing.push("Add the venue or say whether it is online.");
  }
  if (!facts.contact && (event || product || vertical === "company")) {
    missing.push("Add how people should book, order or contact you.");
  }
  if (product && !facts.price) {
    missing.push("Add the price, or say that it is free.");
  }
  return missing.slice(0, 4);
}

export function tidyStory(input: {
  text: string;
  language?: Language | null;
  vertical?: Vertical | null;
}): StoryTidyResult {
  const original = input.text.trim();
  let current = original;

  const spellingBefore = current;
  current = replaceWholeWords(current, SPELLINGS);
  current = replaceWholeWords(current, PROPER_TERMS);
  const spellingFixed = current !== spellingBefore;

  const dateBefore = current;
  current = normalizeDatesAndTimes(current);
  const dateFixed = current !== dateBefore;

  const punctuationBefore = current;
  current = normalizePunctuation(current);
  const punctuationFixed = current !== punctuationBefore;

  const capitalizationBefore = current;
  current = capitalizeSentences(current);
  const capitalizationFixed = current !== capitalizationBefore;

  const facts = extractStoryFacts(current);
  const fixes: string[] = [];
  if (spellingFixed) fixes.push("Spelling corrected");
  if (dateFixed) fixes.push("Dates and times tidied");
  if (capitalizationFixed) fixes.push("Capitalization fixed");
  if (punctuationFixed) fixes.push("Punctuation and spacing fixed");

  return {
    text: current.slice(0, 800),
    fixes,
    missing: missingStoryFacts(facts, input.vertical, current),
    facts,
  };
}

function normalizedFacts(text: string, pattern: RegExp): string[] {
  return [...text.matchAll(pattern)]
    .map((match) => match[0].toLowerCase().replace(/[\s–-]+/g, "").replace(/[.,;!?]/g, ""))
    .filter(Boolean);
}

/**
 * What the story still lacks, recomputed from the text that is about to be shown.
 * The model's own "missing" list is never trusted: a machine may not be the one
 * to decide which facts the owner has to go and find.
 */
export function storyGaps(text: string, vertical?: Vertical | null): string[] {
  return missingStoryFacts(extractStoryFacts(text), vertical ?? null, text);
}

/**
 * A headline may only reuse numbers the story already states, so Genie can offer
 * one without breaking the rule against inventing a price or a date.
 */
export function storyHeadlineIsSafe(headline: string, story: string): boolean {
  const trimmed = headline.trim();
  if (trimmed.length === 0) return false;
  const stated = [...story.matchAll(/\d+(?:[.,]\d+)?/g)].map((match) => match[0]);
  return [...trimmed.matchAll(/\d+(?:[.,]\d+)?/g)].every((match) =>
    stated.includes(match[0])
  );
}

export function storyFactsPreserved(original: string, refined: string): boolean {
  const currency = /(?:GH¢|GHS|₵|cedis)\s*\d+(?:[.,]\d+)?|\d+(?:[.,]\d+)?\s*(?:GH¢|GHS|₵|cedis)/gi;
  const originalPrices = normalizedFacts(original, currency);
  const refinedPrices = normalizedFacts(refined, currency);
  if (
    originalPrices.some((value) => !refinedPrices.includes(value)) ||
    refinedPrices.some((value) => !originalPrices.includes(value))
  ) {
    return false;
  }

  const contact = /\+?\d[\d\s-]{7,}\d(?!\d)/g;
  const originalContacts = normalizedFacts(original, contact);
  const refinedContacts = normalizedFacts(refined, contact);
  if (
    originalContacts.some((value) => !refinedContacts.includes(value)) ||
    refinedContacts.some((value) => !originalContacts.includes(value))
  ) {
    return false;
  }

  const urls = /https?:\/\/\S+|\b[\w.-]+@[\w.-]+\.\w{2,}\b|\b(?:instagram|facebook|tiktok)\.com\/\S+/gi;
  const originalUrls = normalizedFacts(original, urls);
  const refinedUrls = normalizedFacts(refined, urls);
  if (
    originalUrls.some((value) => !refinedUrls.includes(value)) ||
    refinedUrls.some((value) => !originalUrls.includes(value))
  ) {
    return false;
  }

  if (hasDate(original) && !hasDate(refined)) return false;
  if (hasTime(original) && !hasTime(refined)) return false;
  return true;
}

export const StoryRefineSchema = z.object({
  cleaned_text: z.string().trim().min(10).max(1200),
  fixes: z.array(z.string().trim().min(1).max(70)).max(6).default([]),
  missing: z.array(z.string().trim().min(1).max(90)).max(4).default([]),
  suggested_headline: z.string().trim().max(60).optional(),
});
export type StoryRefineReply = z.infer<typeof StoryRefineSchema>;

export const STORY_REFINE_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    cleaned_text: {
      type: "string",
      description:
        "The customer's story, tidied into one clear paragraph. Keep every fact they supplied.",
    },
    fixes: {
      type: "array",
      maxItems: 6,
      description: "Short, customer-facing notes about what was corrected.",
      items: { type: "string" },
    },
    missing: {
      type: "array",
      maxItems: 4,
      description: "Facts still missing from the story. Never invent them.",
      items: { type: "string" },
    },
    suggested_headline: {
      type: "string",
      description:
        "Optional headline using only supplied facts, maximum 60 characters. Omit when no safe headline exists.",
    },
  },
  required: ["cleaned_text", "fixes", "missing"],
  propertyOrdering: ["cleaned_text", "fixes", "missing", "suggested_headline"],
};

export function parseStoryRefine(text: string): StoryRefineReply {
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
  const parsed = StoryRefineSchema.safeParse(raw);
  if (!parsed.success) {
    throw new AiError(
      "AI_BAD_RESPONSE",
      "Genie answered in a way we could not read. Please try again.",
      502
    );
  }
  return parsed.data;
}

export function storyRefineSystemPrompt(): string {
  return [
    "You are Genie, a faithful story editor for AdGenie Africa.",
    "Your job is to make the customer's own story clear and professional without changing what it means.",
    "",
    "Non-negotiable rules:",
    "1. Preserve every fact the customer supplied: names, dates, times, venue, prices, offers, contact instructions, quantities and links.",
    "2. Never invent a fact, price, discount, date, guarantee, statistic, testimonial or claim.",
    "3. Correct spelling, capitalization, punctuation and sentence flow only.",
    "4. Keep the customer's language unless the draft is clearly in another language.",
    "5. Return JSON only, matching the supplied schema.",
    "6. The cleaned_text must be 800 characters or fewer.",
    "7. If a useful headline cannot be written from supplied facts alone, omit suggested_headline.",
  ].join("\n");
}

export function storyRefinePrompt(input: {
  story: string;
  language?: Language | null;
  vertical?: Vertical | null;
  businessName?: string | null;
  headline?: string | null;
  priceLabel?: string | null;
  offerLabel?: string | null;
  local: StoryTidyResult;
}): string {
  const context = [
    input.language ? `Language: ${languageName(input.language)}.` : "",
    input.vertical ? `Business type: ${input.vertical}.` : "",
    input.businessName ? `Business name: ${input.businessName}.` : "",
    input.headline ? `Current headline: ${input.headline}.` : "",
    input.priceLabel ? `Price to preserve exactly: ${input.priceLabel}.` : "",
    input.offerLabel ? `Offer to preserve exactly: ${input.offerLabel}.` : "",
  ].filter(Boolean);

  return [
    context.length > 0 ? `Context:\n${context.join("\n")}` : "",
    "",
    "The customer's story:",
    input.story.slice(0, 2000),
    "",
    "Fact-safe local tidy already applied:",
    input.local.text.slice(0, 1200),
    input.local.fixes.length > 0 ? `Fixes: ${input.local.fixes.join(", ")}` : "Fixes: none",
    input.local.missing.length > 0 ? `Missing: ${input.local.missing.join(" ")}` : "Missing: none",
    "",
    "Return one JSON object. Improve clarity while preserving every fact above.",
  ]
    .filter(Boolean)
    .join("\n");
}
