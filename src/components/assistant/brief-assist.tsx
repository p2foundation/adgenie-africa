"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Check,
  Copy,
  Info,
  Loader2,
  Sparkles,
  SpellCheck,
  Type,
  Undo2,
  Wand2,
} from "lucide-react";
import { ApiError } from "@/lib/api";
import { copyToClipboard } from "@/lib/clipboard";
import {
  refineStory,
  suggestCopy,
  type AssistantContext,
  type AssistantSuggestion,
  type StoryRefineResult,
} from "@/lib/assistant";
import { useAssistant } from "@/components/assistant/assistant-provider";
import { tidyStory, type Language, type Vertical } from "@adgenie/core";
import { cn } from "@/lib/utils";

type AssistField = "headline" | "details";
type AssistAction = AssistField | "story";

const LANGUAGES: readonly string[] = ["en", "fr", "tw", "gaa"];
const VERTICALS: readonly string[] = ["seller", "company", "fashion", "spot"];

function asLanguage(value?: string | null): Language | null {
  return value && LANGUAGES.includes(value) ? (value as Language) : null;
}

function asVertical(value?: string | null): Vertical | null {
  return value && VERTICALS.includes(value) ? (value as Vertical) : null;
}

/**
 * The brief step's inline half of Genie: two field-targeted drafts and a
 * faithful story editor instead of a conversation. It sends the same
 * /assistant contracts the dock does, so the mobile client can put this strip on
 * its own brief form with no new work.
 *
 * "Tidy my story" runs the shared rules engine on the device the instant it is
 * tapped, then asks the server for the model's polish. Whichever lands, lands —
 * a busy vendor only costs the extra shine, never the result.
 */
export function BriefAssist({
  context,
  onHeadline,
  onDetails,
}: {
  context: AssistantContext;
  onHeadline: (text: string) => void;
  onDetails: (text: string) => void;
}) {
  const { openAssistant } = useAssistant();
  const [busy, setBusy] = useState<AssistAction | null>(null);
  const [target, setTarget] = useState<AssistAction | null>(null);
  const [suggestions, setSuggestions] = useState<AssistantSuggestion[]>([]);
  const [beta, setBeta] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [applied, setApplied] = useState<number | null>(null);
  const [story, setStory] = useState<StoryRefineResult | null>(null);
  const [storyFrom, setStoryFrom] = useState<string | null>(null);
  const [storyPolished, setStoryPolished] = useState(false);
  const [storyApplied, setStoryApplied] = useState(false);
  const storyBefore = useRef<string>("");
  const runId = useRef(0);

  const hasBrief = Boolean(context.details && context.details.trim().length >= 10);
  const detailsNow = (context.details ?? "").trim();

  // The proposal is about the words that were on the page when it was made. Once
  // the owner edits past both their draft and the tidy, drop it rather than show
  // advice about text they no longer have.
  useEffect(() => {
    if (!storyFrom) return;
    if (detailsNow === storyFrom || detailsNow === (story?.text.trim() ?? "")) return;
    setStory(null);
    setStoryFrom(null);
    setStoryApplied(false);
    setStoryPolished(false);
  }, [detailsNow, story?.text, storyFrom]);

  const run = useCallback(
    async (field: AssistField) => {
      const id = ++runId.current;
      setBusy(field);
      setTarget(field);
      setSuggestions([]);
      setBeta(false);
      setError(null);
      setCopied(null);
      setApplied(null);

      try {
        const turn = await suggestCopy({
          messages: [
            {
              role: "user",
              content:
                field === "headline"
                  ? "Give me headline options for this campaign."
                  : "Draft the brief for me from what you can see.",
            },
          ],
          context,
          field,
        });
        if (runId.current !== id) return;

        const usable = turn.suggestions
          .filter((suggestion) => suggestion.text.trim().length > 0)
          .slice(0, 4);
        setSuggestions(usable);
        setBeta(turn.beta);
        if (usable.length === 0) {
          setError(turn.reply || "Genie had no suggestion that time. Try again.");
        }
      } catch (err) {
        if (runId.current !== id) return;
        setError(
          err instanceof ApiError ? err.message : "Genie could not help just now. Try again."
        );
      } finally {
        if (runId.current === id) setBusy(null);
      }
    },
    [context]
  );

  const tidy = useCallback(async () => {
    const original = detailsNow;
    if (original.length < 12) return;

    const id = ++runId.current;
    const local = tidyStory({
      text: original,
      language: asLanguage(context.language),
      vertical: asVertical(context.vertical),
    });
    setTarget("story");
    setBusy("story");
    setSuggestions([]);
    setError(null);
    setStoryFrom(original);
    setStoryApplied(false);
    setStoryPolished(false);
    setStory({
      text: local.text,
      fixes: local.fixes,
      missing: local.missing,
      headline: null,
      source: "rules",
      note: "Tidied on your device. Genie is reading it now…",
    });

    try {
      const refined = await refineStory({ story: original, context });
      if (runId.current !== id) return;
      setStory(refined);
      if (refined.source === "ai") setStoryPolished(true);
    } catch (err) {
      if (runId.current !== id) return;
      setStory((current) =>
        current
          ? {
              ...current,
              source: "rules",
              note:
                err instanceof ApiError && err.message
                  ? `${err.message} The tidy above ran on your device.`
                  : "Genie could not reach the model, so this device tidied it.",
            }
          : current
      );
    } finally {
      if (runId.current === id) setBusy(null);
    }
  }, [context, detailsNow]);

  const use = useCallback(
    (index: number, suggestion: AssistantSuggestion) => {
      if (target === "headline") {
        onHeadline(suggestion.text.replace(/\s+/g, " ").trim().slice(0, 60));
      } else {
        onDetails(suggestion.text.trim().slice(0, 800));
      }
      setApplied(index);
      window.setTimeout(() => {
        setApplied((current) => (current === index ? null : current));
      }, 1800);
    },
    [onDetails, onHeadline, target]
  );

  const applyStory = useCallback(() => {
    if (!story) return;
    storyBefore.current = detailsNow;
    onDetails(story.text.trim().slice(0, 800));
    setStoryApplied(true);
  }, [detailsNow, onDetails, story]);

  const undoStory = useCallback(() => {
    onDetails(storyBefore.current);
    setStoryApplied(false);
  }, [onDetails]);

  const copy = useCallback(async (index: number, text: string) => {
    const ok = await copyToClipboard(text);
    if (!ok) return;
    setCopied(index);
    window.setTimeout(() => {
      setCopied((current) => (current === index ? null : current));
    }, 1600);
  }, []);

  const chip =
    "inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-[11px] font-semibold transition-colors disabled:cursor-wait disabled:opacity-55 sm:flex-none sm:px-3";
  const action =
    "inline-flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-lg px-3 py-1 text-[10px] font-bold transition-colors sm:flex-none";

  return (
    <div
      aria-busy={busy !== null}
      className="mt-2.5 rounded-2xl border border-amber-400/15 bg-gradient-to-br from-amber-400/[0.07] via-amber-400/[0.02] to-teal-400/[0.05] p-3"
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 text-black shadow-sm shadow-amber-500/30">
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2.4} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-200/80">
            Genie can draft this
          </p>
          <p className="mt-0.5 text-[10px] leading-relaxed text-white/30">
            Reads what you typed, your brand kit and your language.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openAssistant("What is missing from my brief?")}
          className="touch-target flex shrink-0 items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-white/35 transition-colors hover:bg-white/5 hover:text-amber-200"
        >
          Open chat
          <ArrowUpRight className="h-3 w-3" />
        </button>
      </div>

      <div className="mt-2.5 flex flex-wrap gap-2">
        {hasBrief && (
          <button
            type="button"
            onClick={() => void tidy()}
            disabled={busy !== null}
            className={cn(
              chip,
              "border-teal-400/30 text-teal-100 hover:border-teal-400/60 hover:bg-teal-400/10"
            )}
          >
            {busy === "story" ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <SpellCheck className="h-3 w-3 text-teal-300/80" />
            )}
            Tidy my story
          </button>
        )}
        <button
          type="button"
          onClick={() => void run("headline")}
          disabled={busy !== null}
          className={cn(
            chip,
            "border-amber-400/25 text-amber-100 hover:border-amber-400/50 hover:bg-amber-400/10"
          )}
        >
          {busy === "headline" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Type className="h-3 w-3 text-amber-300/80" />
          )}
          {context.headline ? "Punch up my headline" : "Suggest a headline"}
        </button>
        <button
          type="button"
          onClick={() => void run("details")}
          disabled={busy !== null}
          className={cn(
            chip,
            "border-white/12 text-white/65 hover:border-white/30 hover:text-white"
          )}
        >
          {busy === "details" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Wand2 className="h-3 w-3 text-teal-300/80" />
          )}
          {hasBrief ? "Improve my brief" : "Draft my brief"}
        </button>
      </div>

      {busy && busy !== "story" && !story && (
        <div className="mt-3 space-y-2" aria-hidden>
          {[0, 1].map((row) => (
            <div
              key={row}
              className="rounded-xl border border-white/8 bg-black/20 p-2.5"
            >
              <span className="block h-2.5 w-1/3 animate-pulse rounded bg-white/8" />
              <span className="mt-2 block h-2.5 w-full animate-pulse rounded bg-white/5" />
              <span className="mt-1.5 block h-2.5 w-2/3 animate-pulse rounded bg-white/5" />
            </div>
          ))}
          <p className="flex items-center gap-1.5 pl-0.5 text-[10px] text-white/30">
            <Loader2 className="h-3 w-3 animate-spin text-amber-300/70" />
            Genie is writing a few options…
          </p>
        </div>
      )}

      {!busy && error && (
        <p className="mt-3 flex items-start gap-1.5 rounded-xl border border-rose-400/20 bg-rose-500/[0.06] px-2.5 py-2 text-[11px] leading-relaxed text-rose-200/85">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => (target === "story" ? void tidy() : void run(target ?? "headline"))}
            className="touch-target shrink-0 rounded-lg border border-rose-400/30 px-3 text-[10px] font-bold text-rose-200 transition-colors hover:border-rose-400/60 hover:bg-rose-400/10"
          >
            Retry
          </button>
        </p>
      )}

      {story && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          aria-live="polite"
          className={cn(
            "mt-3 rounded-xl border bg-black/25 p-2.5 transition-colors duration-500",
            storyPolished ? "border-amber-400/45" : "border-teal-400/20"
          )}
        >
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                story.source === "ai"
                  ? "border-amber-400/25 bg-amber-400/10 text-amber-200/90"
                  : "border-teal-400/25 bg-teal-400/10 text-teal-200/90"
              )}
            >
              {busy === "story" && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
              {story.source === "ai" ? "Genie polished it" : "Tidied by rules"}
            </span>
            <span className="ml-auto text-[10px] tabular-nums text-white/25">
              {story.text.length}/800
            </span>
          </div>

          <p className="mt-1.5 whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-white/85">
            {story.text}
          </p>

          {story.fixes.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {story.fixes.map((fix) => (
                <li
                  key={fix}
                  className="inline-flex items-center gap-1 rounded-md border border-white/8 bg-white/[0.03] px-1.5 py-0.5 text-[9.5px] font-medium text-white/45"
                >
                  <Check className="h-2.5 w-2.5 text-teal-300/70" />
                  {fix}
                </li>
              ))}
            </ul>
          )}

          {story.missing.length > 0 && (
            <ul className="mt-2 space-y-1">
              {story.missing.map((gap) => (
                <li
                  key={gap}
                  className="flex items-start gap-1.5 text-[10.5px] leading-relaxed text-amber-200/70"
                >
                  <Info className="mt-0.5 h-2.5 w-2.5 shrink-0" />
                  {gap}
                </li>
              ))}
            </ul>
          )}

          {story.note && (
            <p className="mt-2 text-[10px] leading-relaxed text-white/30">{story.note}</p>
          )}

          <div className="mt-2 flex flex-wrap gap-1.5">
            {storyApplied ? (
              <button
                type="button"
                onClick={undoStory}
                className={cn(
                  action,
                  "border border-white/12 text-white/55 hover:border-white/30 hover:text-white"
                )}
              >
                <Undo2 className="h-2.5 w-2.5" /> Back to my words
              </button>
            ) : (
              <button
                type="button"
                onClick={applyStory}
                className={cn(action, "bg-amber-400 text-black hover:bg-amber-300")}
              >
                Use this story
              </button>
            )}
            {story.headline && (
              <button
                type="button"
                onClick={() => onHeadline(story.headline!.replace(/\s+/g, " ").trim().slice(0, 60))}
                className={cn(
                  action,
                  "border border-amber-400/25 text-amber-100 hover:border-amber-400/50 hover:bg-amber-400/10"
                )}
              >
                Use “{story.headline}”
              </button>
            )}
            <button
              type="button"
              onClick={() => void copy(-1, story.text)}
              className={cn(
                action,
                copied === -1
                  ? "bg-teal-400/20 text-teal-200"
                  : "border border-white/10 text-white/55 hover:border-white/25 hover:text-white"
              )}
            >
              {copied === -1 ? (
                <>
                  <Check className="h-2.5 w-2.5" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-2.5 w-2.5" /> Copy
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}

      {!busy && suggestions.length > 0 && (
        <div className="mt-3 space-y-2" aria-live="polite">
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.kind}-${index}`}
              className="rounded-xl border border-white/8 bg-black/20 p-2.5"
            >
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center rounded-full border border-amber-400/20 bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-200/90">
                  {suggestion.label}
                </span>
                {target === "headline" && (
                  <span
                    className={cn(
                      "ml-auto text-[10px] tabular-nums",
                      suggestion.text.length > 60
                        ? "text-amber-300/80"
                        : "text-white/25"
                    )}
                  >
                    {suggestion.text.length}/60
                  </span>
                )}
              </div>
              <p className="mt-1.5 whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-white/85">
                {suggestion.text}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => void copy(index, suggestion.text)}
                  className={cn(
                    "inline-flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-lg border px-3 py-1 text-[10px] font-semibold transition-colors sm:flex-none",
                    copied === index
                      ? "border-teal-400/30 bg-teal-400/10 text-teal-200"
                      : "border-white/10 text-white/55 hover:border-white/25 hover:text-white"
                  )}
                >
                  {copied === index ? (
                    <>
                      <Check className="h-2.5 w-2.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-2.5 w-2.5" /> Copy
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => use(index, suggestion)}
                  className={cn(
                    "inline-flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-lg px-3 py-1 text-[10px] font-bold transition-colors sm:flex-none",
                    applied === index
                      ? "bg-teal-400/20 text-teal-200"
                      : "bg-amber-400 text-black hover:bg-amber-300"
                  )}
                >
                  {applied === index ? (
                    <>
                      <Check className="h-2.5 w-2.5" /> Done
                    </>
                  ) : target === "headline" ? (
                    "Use as headline"
                  ) : (
                    "Use as my brief"
                  )}
                </button>
              </div>
            </div>
          ))}
          {beta && (
            <p className="text-[10px] leading-relaxed text-violet-300/80">
              Twi/Ga draft — a native speaker should check it before you post.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
