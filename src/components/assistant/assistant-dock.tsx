"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import {
  ArrowUp,
  Check,
  Copy,
  Info,
  Lightbulb,
  Loader2,
  MessageSquare,
  MousePointerClick,
  RotateCcw,
  Sparkles,
  Type,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { ApiError } from "@/lib/api";
import { copyToClipboard } from "@/lib/clipboard";
import {
  askGenie,
  clearTranscript,
  loadTranscript,
  readAssistantStatus,
  saveTranscript,
  type AssistantMessage,
  type AssistantScreen,
  type AssistantStatus,
  type AssistantSuggestion,
  type AssistantSuggestionKind,
} from "@/lib/assistant";
import { useAssistantController } from "@/components/assistant/assistant-provider";
import { cn } from "@/lib/utils";

interface Entry {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestions: AssistantSuggestion[];
  followups: string[];
  beta: boolean;
  error?: boolean;
  retryable?: boolean;
}

const SCREEN_LABEL: Record<AssistantScreen, string> = {
  create: "Create campaign",
  dashboard: "Dashboard",
  campaign: "Campaign",
  library: "Library",
  notifications: "Inbox",
  credits: "Credits",
  settings: "Brand kit",
  calendar: "Calendar",
  other: "Studio",
};

/** Only what the screen actually registers — see AssistantPageContext and the hooks. */
const SCREEN_SEES: Record<AssistantScreen, string> = {
  create: "the brief, the offer and the plan you are building",
  dashboard: "your credits, your campaign shelf and the next two weeks",
  campaign: "this brief, where the plan stands and its slot on the calendar",
  library: "how many plans, images and captions you have made",
  notifications: "your latest alerts and what is unread",
  credits: "your credit balance",
  settings: "your brand kit — name, voice, look and colours",
  calendar: "your scheduled posts and the plans waiting for a day",
  other: "your credit balance",
};

const QUICK_PROMPTS: Record<AssistantScreen, string[]> = {
  create: [
    "Punch up my headline",
    "Write a WhatsApp caption for this offer",
    "What is missing from my brief?",
  ],
  dashboard: [
    "What should I post this week?",
    "Explain my credits",
    "Give me a 3-post plan",
  ],
  campaign: [
    "Fix my headline",
    "What is missing from this brief?",
    "When should I post this?",
  ],
  library: ["What should I repost?", "Which plan should I finish first?"],
  notifications: ["What do these alerts mean?", "Is anything urgent?"],
  credits: ["How do credits work?", "Which top-up fits a week of posts?"],
  settings: ["What does the brand kit change?", "Improve my brand tone"],
  calendar: ["Plan this week", "What should I schedule first?"],
  other: ["What can you do?", "Give me a campaign idea"],
};

const KIND_META: Record<
  AssistantSuggestionKind,
  { label: string; icon: LucideIcon; className: string }
> = {
  headline: {
    label: "Headline",
    icon: Type,
    className: "border-amber-400/25 bg-amber-400/10 text-amber-200",
  },
  caption: {
    label: "Caption",
    icon: MessageSquare,
    className: "border-teal-400/25 bg-teal-400/10 text-teal-200",
  },
  hook: {
    label: "Hook",
    icon: Zap,
    className: "border-violet-400/25 bg-violet-400/10 text-violet-200",
  },
  cta: {
    label: "Call to action",
    icon: MousePointerClick,
    className: "border-sky-400/25 bg-sky-400/10 text-sky-200",
  },
  idea: {
    label: "Idea",
    icon: Lightbulb,
    className: "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-200",
  },
  tip: {
    label: "Tip",
    icon: Info,
    className: "border-white/10 bg-white/5 text-white/60",
  },
};

const INVITE_KEY = "adgenie.genie.invite.v1";

const subscribeNoop = () => () => {};

function nextId(): string {
  return `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function messagesOf(entries: Entry[]): AssistantMessage[] {
  return entries
    .filter((entry) => !entry.error)
    .map((entry) => ({ role: entry.role, content: entry.content }));
}

export function AssistantDock() {
  const { open, seed, screen, applyHandler, closeAssistant, toggleAssistant, consumeSeed, buildContext } =
    useAssistantController();

  // False during SSR and the hydration pass, true once the portal can mount.
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
  const [entries, setEntries] = useState<Entry[]>(() =>
    loadTranscript().map((message) => ({
      id: nextId(),
      role: message.role,
      content: message.content,
      suggestions: [],
      followups: [],
      beta: false,
    }))
  );
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [appliedKey, setAppliedKey] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [invite, setInvite] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // A seed prefills the composer without a second render.
  const draft = seed ?? input;

  // The transcript is the client's to keep; the API holds no thread.
  useEffect(() => {
    if (!mounted) return;
    saveTranscript(messagesOf(entries).slice(-20));
  }, [entries, mounted]);

  useEffect(() => {
    if (!open || status) return;
    let alive = true;
    readAssistantStatus()
      .then((next) => {
        if (alive) setStatus(next);
      })
      .catch(() => {
        if (!alive) return;
        setStatus({
          available: true,
          mode: "unknown",
          text_model: "",
          note: "Genie could not read its status. You can still ask.",
        });
      });
    return () => {
      alive = false;
    };
  }, [open, status]);

  useEffect(() => {
    if (!open) return;
    const focus = window.setTimeout(() => inputRef.current?.focus(), 80);
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    if (!mobile) return () => window.clearTimeout(focus);

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(focus);
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, entries.length, pending]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (screen !== "create") return;
    if (window.localStorage.getItem(INVITE_KEY) === "1") return;
    if (loadTranscript().length > 0) return;
    const timer = window.setTimeout(() => setInvite(true), 1400);
    return () => window.clearTimeout(timer);
  }, [screen]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setConfirmReset(false);
        closeAssistant();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, closeAssistant]);

  const close = useCallback(() => {
    setConfirmReset(false);
    closeAssistant();
  }, [closeAssistant]);

  const toggle = useCallback(() => {
    if (open) setConfirmReset(false);
    toggleAssistant();
  }, [open, toggleAssistant]);

  const resizeInput = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }, []);

  const prefill = useCallback(
    (text: string) => {
      consumeSeed();
      setInput(text);
      const el = inputRef.current;
      if (el) {
        el.focus();
        resizeInput(el);
      }
    },
    [consumeSeed, resizeInput]
  );

  const dismissInvite = useCallback(() => {
    setInvite(false);
    try {
      window.localStorage.setItem(INVITE_KEY, "1");
    } catch {
      // Private mode: the bubble simply comes back next visit.
    }
  }, []);

  const openFromInvite = useCallback(() => {
    dismissInvite();
    toggle();
  }, [dismissInvite, toggle]);

  const send = useCallback(
    async (raw: string) => {
      const content = raw.trim().slice(0, 1000);
      if (!content || pending) return;

      const history: AssistantMessage[] = [
        ...messagesOf(entries),
        { role: "user", content },
      ];
      const userEntry: Entry = {
        id: nextId(),
        role: "user",
        content,
        suggestions: [],
        followups: [],
        beta: false,
      };

      setEntries((current) => [...current, userEntry]);
      setInput("");
      consumeSeed();
      setPending(true);
      setConfirmReset(false);

      try {
        const context = await buildContext();
        const turn = await askGenie({ messages: history, context });
        setEntries((current) => [
          ...current,
          {
            id: nextId(),
            role: "assistant",
            content: turn.reply,
            suggestions: turn.suggestions,
            followups: turn.followups,
            beta: turn.beta,
          },
        ]);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : "Genie could not answer just now. Try again.";
        // Re-sending a question costs nothing, so any network or 5xx failure
        // offers the retry; a 4xx (bad session, rejected payload) does not.
        const retryable = !(err instanceof ApiError) || err.retryable;
        setEntries((current) => [
          ...current,
          {
            id: nextId(),
            role: "assistant",
            content: message,
            suggestions: [],
            followups: [],
            beta: false,
            error: true,
            retryable,
          },
        ]);
      } finally {
        setPending(false);
      }
    },
    [buildContext, consumeSeed, entries, pending]
  );

  const submit = useCallback(() => {
    void send(draft);
  }, [draft, send]);

  const onComposerKey = useCallback(
    (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submit();
      }
    },
    [submit]
  );

  const onCopy = useCallback(async (key: string, text: string) => {
    const ok = await copyToClipboard(text);
    if (!ok) return;
    setCopiedKey(key);
    window.setTimeout(() => {
      setCopiedKey((current) => (current === key ? null : current));
    }, 1600);
  }, []);

  const onUse = useCallback(
    (key: string, suggestion: AssistantSuggestion) => {
      applyHandler?.apply(suggestion);
      setAppliedKey(key);
      window.setTimeout(() => {
        setAppliedKey((current) => (current === key ? null : current));
      }, 2000);
    },
    [applyHandler]
  );

  const reset = useCallback(() => {
    clearTranscript();
    setEntries([]);
    setInput("");
    setConfirmReset(false);
    setCopiedKey(null);
    inputRef.current?.focus();
  }, []);

  const disabled = status !== null && !status.available;
  const canSend = !pending && !disabled && draft.trim().length > 0;
  const latest = entries[entries.length - 1];

  if (!mounted) return null;

  return createPortal(
    <>
      {open && (
        <div
          aria-hidden
          onClick={close}
          className="fixed inset-0 z-[44] bg-black/55 backdrop-blur-sm md:hidden"
        />
      )}

      {!open && invite && (
        <div className="fixed bottom-[5.4rem] right-6 z-40 hidden w-[280px] rounded-2xl border border-amber-400/20 bg-[#0b0f1b]/[0.98] p-3.5 shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl md:block">
          <button
            type="button"
            onClick={dismissInvite}
            aria-label="Dismiss the Genie tip"
            className="absolute right-2 top-2 rounded-lg p-1 text-white/25 transition-colors hover:text-white/60"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <p className="flex items-center gap-1.5 font-display text-[13px] font-semibold text-white">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            Stuck on the brief?
          </p>
          <p className="mt-1 pr-4 text-[11px] leading-relaxed text-white/45">
            I can write the headline, tighten the offer and draft the caption.
            You still approve the price.
          </p>
          <button
            type="button"
            onClick={openFromInvite}
            className="mt-2.5 w-full rounded-xl bg-amber-400 px-3 py-1.5 text-[11px] font-bold text-black transition-colors hover:bg-amber-300"
          >
            Ask Genie
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={open ? "Close Genie" : "Ask Genie, the studio assistant"}
        className={cn(
          "group fixed bottom-[calc(1.25rem_+_env(safe-area-inset-bottom))] right-4 z-40 flex h-12 items-center gap-2 rounded-full pl-1.5 pr-1.5 text-black shadow-[0_14px_40px_rgba(245,158,11,0.35)] transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 md:bottom-6 md:right-6 md:pr-4",
          "bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600",
          open && "hidden md:flex"
        )}
      >
        <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-black/10">
          {open ? (
            <X className="h-4 w-4" strokeWidth={2.6} />
          ) : (
            <Sparkles className="h-4 w-4" strokeWidth={2.4} />
          )}
          {!open && (
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-teal-300 ring-2 ring-amber-400" />
          )}
        </span>
        <span className="hidden pr-1 text-[13px] font-bold tracking-tight md:inline">
          {open ? "Close" : "Genie"}
        </span>
      </button>

      {open && (
        <section
          role="dialog"
          aria-label="Genie, the studio assistant"
          className="fixed inset-x-0 bottom-0 z-[45] flex h-[88svh] flex-col overflow-hidden rounded-t-3xl border border-b-0 border-white/10 bg-[#080b15]/[0.985] pb-[env(safe-area-inset-bottom)] text-white shadow-[0_-20px_90px_rgba(0,0,0,0.65)] backdrop-blur-2xl md:inset-auto md:bottom-24 md:right-6 md:h-[min(640px,calc(100vh-8rem))] md:w-[404px] md:rounded-3xl md:border-b md:pb-0"
        >
          <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-white/15 md:hidden" />

          <header className="flex items-center gap-3 border-b border-white/8 px-4 py-3">
            <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 text-black shadow-lg shadow-amber-500/25">
              <Sparkles className="h-4 w-4" strokeWidth={2.4} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 font-display text-sm font-semibold leading-none text-white">
                Genie
                <span className="rounded-full border border-teal-400/25 bg-teal-400/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-teal-300">
                  Studio
                </span>
              </p>
              <p className="mt-1 truncate text-[10px] text-white/35">
                {SCREEN_LABEL[screen]} · sees {SCREEN_SEES[screen]}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              title="Start a new conversation"
              aria-label="Start a new conversation"
              className="flex h-11 w-11 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-white/5 hover:text-white/70"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={close}
              aria-label="Close Genie"
              className="flex h-11 w-11 items-center justify-center rounded-lg text-white/30 transition-colors hover:bg-white/5 hover:text-white/70"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          {confirmReset && (
            <div className="flex items-center gap-2 border-b border-white/8 bg-white/[0.03] px-4 py-2">
              <p className="flex-1 text-[11px] text-white/50">
                Clear this conversation?
              </p>
              <button
                type="button"
                onClick={reset}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-rose-400/15 px-3 text-[10px] font-semibold text-rose-200 transition-colors hover:bg-rose-400/25"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-white/10 px-3 text-[10px] font-medium text-white/55 transition-colors hover:text-white"
              >
                Keep
              </button>
            </div>
          )}

          {disabled && (
            <div className="mx-4 mt-3 rounded-xl border border-amber-400/20 bg-amber-500/[0.07] px-3 py-2 text-[11px] leading-relaxed text-amber-200/80">
              Genie is not switched on in this environment yet.
              {status?.note ? ` ${status.note}` : ""}
            </div>
          )}

          <div
            ref={scrollRef}
            aria-live="polite"
            aria-busy={pending}
            className="flex-1 space-y-3.5 overflow-y-auto overscroll-contain px-4 py-4"
          >
            {entries.length === 0 ? (
              <div className="py-2">
                <p className="font-display text-[15px] font-semibold text-white">
                  I&apos;m your studio assistant.
                </p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-white/45">
                  I can see {SCREEN_SEES[screen]}. Ask for a headline, a caption
                  or a plan, and take what you like. I draft — you decide.
                </p>
                <div className="mt-4 space-y-1.5">
                  {QUICK_PROMPTS[screen].map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => prefill(prompt)}
                      className="flex min-h-[44px] w-full items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5 text-left text-[12px] text-white/60 transition-colors hover:border-amber-400/30 hover:bg-amber-400/5 hover:text-white/85"
                    >
                      <Zap className="h-3 w-3 shrink-0 text-amber-400/70" />
                      {prompt}
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-[10px] leading-relaxed text-white/25">
                  Genie never invents a price or a claim, and never asks for a
                  password, PIN or card. It is AI, not a person.
                </p>
              </div>
            ) : (
              entries.map((entry, index) => (
                <div key={entry.id}>
                  <div
                    className={cn(
                      "max-w-[92%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                      entry.role === "user"
                        ? "ml-auto rounded-br-md border border-amber-400/25 bg-amber-500/15 text-amber-50"
                        : entry.error
                          ? "rounded-bl-md border border-rose-400/25 bg-rose-500/10 text-rose-100/90"
                          : "rounded-bl-md border border-white/8 bg-white/[0.04] text-white/80"
                    )}
                  >
                    {entry.content}
                  </div>

                  {entry.error && entry.retryable && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        const asked = entries
                          .slice(0, index)
                          .filter((item) => item.role === "user")
                          .pop();
                        if (asked) void send(asked.content);
                      }}
                      className="touch-target mt-2 inline-flex items-center gap-1.5 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-1.5 text-[11px] font-semibold text-rose-100 transition-colors hover:border-rose-300/45 disabled:opacity-40"
                    >
                      <RotateCcw className="h-3 w-3" />
                      Try again
                    </button>
                  )}

                  {entry.suggestions.length > 0 && (
                    <div className="mt-2.5 space-y-2">
                      {entry.suggestions.map((suggestion, index) => {
                        const key = `${entry.id}:${index}`;
                        const meta = KIND_META[suggestion.kind];
                        const Icon = meta.icon;
                        const applyLabel = applyHandler?.label(suggestion) ?? null;
                        return (
                          <div
                            key={key}
                            className="rounded-xl border border-white/8 bg-white/[0.03] p-3"
                          >
                            <div className="flex items-center gap-1.5">
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                                  meta.className
                                )}
                              >
                                <Icon className="h-2.5 w-2.5" />
                                {meta.label}
                              </span>
                              {suggestion.kind === "headline" && (
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
                            <p className="mt-2 whitespace-pre-wrap break-words text-[13px] leading-relaxed text-white/85">
                              {suggestion.text}
                            </p>
                            <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => void onCopy(key, suggestion.text)}
                                className={cn(
                                  "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold transition-colors",
                                  copiedKey === key
                                    ? "border-teal-400/30 bg-teal-400/10 text-teal-200"
                                    : "border-white/10 text-white/55 hover:border-white/25 hover:text-white"
                                )}
                              >
                                {copiedKey === key ? (
                                  <>
                                    <Check className="h-2.5 w-2.5" /> Copied
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-2.5 w-2.5" /> Copy
                                  </>
                                )}
                              </button>
                              {applyLabel && (
                                <button
                                  type="button"
                                  onClick={() => onUse(key, suggestion)}
                                  className={cn(
                                    "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition-colors",
                                    appliedKey === key
                                      ? "bg-teal-400/20 text-teal-200"
                                      : "bg-amber-400 text-black hover:bg-amber-300"
                                  )}
                                >
                                  {appliedKey === key ? (
                                    <>
                                      <Check className="h-2.5 w-2.5" /> Done
                                    </>
                                  ) : (
                                    applyLabel
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {entry.followups.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {entry.followups.map((followup) => (
                        <button
                          key={followup}
                          type="button"
                          onClick={() => prefill(followup)}
                          className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-white/50 transition-colors hover:border-amber-400/30 hover:text-amber-200"
                        >
                          {followup}
                        </button>
                      ))}
                    </div>
                  )}

                  {entry.beta && (
                    <p className="mt-2 text-[10px] leading-relaxed text-violet-300/80">
                      Twi/Ga draft — a native speaker should check it before you
                      post.
                    </p>
                  )}
                </div>
              ))
            )}

            {pending && (
              <div className="flex w-fit items-center gap-2 rounded-2xl rounded-bl-md border border-white/8 bg-white/[0.04] px-3 py-2.5">
                <span className="flex gap-1">
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-amber-300/80"
                      style={{ animationDelay: `${dot * 120}ms` }}
                    />
                  ))}
                </span>
                <span className="text-[11px] text-white/40">Genie is writing…</span>
              </div>
            )}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
            className="shrink-0 border-t border-white/8 bg-[#070a12]/90 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5"
          >
            <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 transition-colors focus-within:border-amber-400/40">
              <textarea
                ref={inputRef}
                rows={1}
                value={draft}
                onChange={(event) => {
                  consumeSeed();
                  setInput(event.target.value);
                  resizeInput(event.currentTarget);
                }}
                onKeyDown={onComposerKey}
                placeholder={
                  disabled
                    ? "Genie is offline here"
                    : latest && latest.suggestions.length > 0
                      ? "Ask for another take, or tweak it…"
                      : "Ask for a headline, a caption, a plan…"
                }
                maxLength={1000}
                disabled={disabled}
                aria-label="Message Genie"
                className="max-h-32 min-h-[24px] flex-1 resize-none bg-transparent text-[13px] leading-relaxed text-white placeholder:text-white/25 focus:outline-none disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={!canSend}
                aria-label="Send to Genie"
                className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-black transition-all before:absolute before:-inset-1.5 before:content-[''] hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30"
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowUp className="h-4 w-4" strokeWidth={2.6} />
                )}
              </button>
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-3 px-1 text-[9px] text-white/25">
              <span className="hidden sm:inline">
                Enter sends · Shift + Enter for a new line
              </span>
              <span className="flex items-center gap-1 sm:ml-auto">
                <Zap className="h-2.5 w-2.5 text-amber-400/60" />
                AI draft — check facts before posting
              </span>
            </div>
          </form>
        </section>
      )}
    </>,
    document.body
  );
}
