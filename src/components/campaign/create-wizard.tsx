"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Box,
  Camera,
  Check,
  Facebook,
  Film,
  Image as ImageIcon,
  Info,
  Instagram,
  Loader2,
  Lock,
  MessageCircle,
  Music2,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { DirectionDeck } from "@/components/studio/direction-deck";
import { BriefAssist } from "@/components/assistant/brief-assist";
import { PhotoPicker } from "@/components/campaign/photo-picker";
import { UrlImport } from "@/components/campaign/url-import";
import {
  useAssistantApply,
  useAssistantContext,
  type AssistantApplyHandler,
} from "@/components/assistant/assistant-provider";
import type { AssistantContext } from "@/lib/assistant";
import {
  CompanyGlyph,
  EventGlyph,
  FashionGlyph,
  SellerGlyph,
} from "@/components/pictographs";
import { fieldClass, formErrorClass, labelClass } from "@/components/auth/fields";
import {
  ApiError,
  api,
  type BrandKit,
  type Campaign,
  type CampaignFormat,
  type CreativeDirection,
  type CreativeEngine,
  type GenerationCosts,
  type ImportedPage,
  type MotionHook,
  type MotionPace,
  type SpinAudience,
  type SpinMode,
  type SpinProduct,
} from "@/lib/api";
import {
  AUDIENCES,
  PACES,
  PRODUCT_LABEL,
  SPIN_MODE_LABEL,
  enginesFor,
  hooksFor,
  productsFor,
  spinModesFor,
  type EngineOption,
} from "@/lib/studio";
import { cn } from "@/lib/utils";
import {
  CHANNEL_POLICIES,
  FIT_LABEL,
  rankChannels,
  type FitLevel,
  type MarketingChannel,
} from "@adgenie/core";

type Vertical = "seller" | "company" | "fashion" | "spot";
type Language = "en" | "fr" | "tw" | "gaa";

const STEPS = ["The brief", "The look", "The price"];

const VERTICALS: {
  value: Vertical;
  title: string;
  copy: string;
  glyph: typeof SellerGlyph;
}[] = [
  {
    value: "seller",
    title: "Market seller",
    copy: "Products, offers and WhatsApp orders.",
    glyph: SellerGlyph,
  },
  {
    value: "company",
    title: "Company",
    copy: "Services, launches and hiring posts.",
    glyph: CompanyGlyph,
  },
  {
    value: "fashion",
    title: "Fashion & beauty",
    copy: "Lookbooks, drops, salons and studios.",
    glyph: FashionGlyph,
  },
  {
    value: "spot",
    title: "Spot & event",
    copy: "Restaurants, clubs, tickets and nights.",
    glyph: EventGlyph,
  },
];

const LANGUAGES: { value: Language; label: string; beta?: boolean }[] = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "tw", label: "Twi", beta: true },
  { value: "gaa", label: "Ga", beta: true },
];

const FORMATS: {
  value: CampaignFormat;
  label: string;
  sub: string;
  ratio: string;
}[] = [
  { value: "1:1", label: "Feed", sub: "Square", ratio: "aspect-square w-9" },
  { value: "4:5", label: "Portrait", sub: "Profile grid", ratio: "aspect-[4/5] w-8" },
  { value: "9:16", label: "Story", sub: "Reel / status", ratio: "aspect-[9/16] w-6" },
];

const CHANNEL_ICON: Record<MarketingChannel, typeof MessageCircle> = {
  whatsapp: MessageCircle,
  instagram: Instagram,
  tiktok: Music2,
  facebook: Facebook,
};

const FIT_CARD: Record<FitLevel, string> = {
  native: "border-teal-400/20 bg-teal-500/[0.05]",
  workable: "border-amber-400/20 bg-amber-500/[0.05]",
  off_purpose: "border-rose-400/25 bg-rose-500/[0.06]",
};

const DEFAULT_CREATIVE: CreativeDirection = {
  engines: ["image"],
  motionHook: "pov",
  motionPace: "medium",
  spinAudience: "women",
  spinProduct: "outfit",
  spinMode: "mannequin",
};

// A company has no outfit to turn, so the fashion default must never survive
// into a company plan — neither on first load nor after "Start fresh".
function creativeForVertical(
  vertical: Vertical,
  creative: CreativeDirection
): CreativeDirection {
  const allowed = productsFor(vertical).map((product) => product.value);
  return allowed.includes(creative.spinProduct)
    ? creative
    : { ...creative, spinProduct: allowed[0]! };
}

interface CampaignDraft {
  version: 1;
  savedAt: string;
  step: number;
  vertical: Vertical;
  businessName: string;
  headline: string;
  details: string;
  sourceUrl: string;
  priceLabel: string;
  offerLabel: string;
  language: Language;
  formats: CampaignFormat[];
  creative: CreativeDirection;
  photoIds: string[];
}

function draftText(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function draftEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T
): T {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : fallback;
}

function readCampaignDraft(raw: string | null): CampaignDraft | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (value.version !== 1) return null;
    const vertical = draftEnum<Vertical>(
      value.vertical,
      ["seller", "company", "fashion", "spot"],
      "seller"
    );
    const rawCreative =
      value.creative && typeof value.creative === "object"
        ? (value.creative as Record<string, unknown>)
        : {};
    const engines = Array.isArray(rawCreative.engines)
      ? Array.from(
          new Set(
            rawCreative.engines.filter((engine): engine is CreativeEngine =>
              ["image", "motion", "spin"].includes(engine as string)
            )
          )
        )
      : [];
    if (!engines.includes("image")) engines.unshift("image");
    const spinAudience = draftEnum<SpinAudience>(
      rawCreative.spinAudience,
      ["women", "men", "kids"],
      "women"
    );
    const allowedProducts = productsFor(vertical).map((product) => product.value);
    const spinProduct = allowedProducts.includes(
      rawCreative.spinProduct as SpinProduct
    )
      ? (rawCreative.spinProduct as SpinProduct)
      : allowedProducts[0]!;
    const spinMode = draftEnum<SpinMode>(
      rawCreative.spinMode,
      ["model", "mannequin", "kit"],
      "mannequin"
    );

    return {
      version: 1,
      savedAt: draftText(value.savedAt, 40),
      step:
        typeof value.step === "number" && value.step >= 0 && value.step <= 2
          ? Math.floor(value.step)
          : 0,
      vertical,
      businessName: draftText(value.businessName, 120),
      headline: draftText(value.headline, 60),
      details: draftText(value.details, 800),
      sourceUrl: draftText(value.sourceUrl, 500),
      priceLabel: draftText(value.priceLabel, 40),
      offerLabel: draftText(value.offerLabel, 24),
      language: draftEnum<Language>(
        value.language,
        ["en", "fr", "tw", "gaa"],
        "en"
      ),
      formats: Array.isArray(value.formats)
        ? value.formats.filter((format): format is CampaignFormat =>
            ["1:1", "4:5", "9:16"].includes(format as string)
          )
        : ["1:1", "4:5", "9:16"],
      creative: {
        engines,
        motionHook: draftEnum<MotionHook>(
          rawCreative.motionHook,
          ["pov", "three_reasons", "before_after", "testimonial"],
          "pov"
        ),
        motionPace: draftEnum<MotionPace>(
          rawCreative.motionPace,
          ["slow", "medium", "fast"],
          "medium"
        ),
        spinAudience,
        spinProduct,
        spinMode:
          spinAudience === "kids" && spinMode === "model"
            ? "mannequin"
            : spinMode,
      },
      photoIds: Array.isArray(value.photoIds)
        ? value.photoIds
            .filter((id): id is string => typeof id === "string")
            .slice(0, 3)
        : [],
    };
  } catch {
    return null;
  }
}

function subscribeHydrated() {
  return () => {};
}

export function CreateWizard(props: {
  userId: string;
  displayName: string | null;
  balance: number;
  costs: GenerationCosts;
  kit: BrandKit | null;
  defaultLanguage: string;
  defaultVertical: string | null;
}) {
  // Local drafts are an external store: never read during the server render or
  // the first hydrated render, then remount the wizard with the stored brief.
  const hydrated = useSyncExternalStore(
    subscribeHydrated,
    () => true,
    () => false
  );

  if (!hydrated) {
    return (
      <CreateWizardInner
        key="hydrating"
        {...props}
        initialDraft={null}
        autosaveEnabled={false}
      />
    );
  }

  const draft = readCampaignDraft(
    window.localStorage.getItem(`adgenie:campaign-draft:${props.userId}:v1`)
  );
  return (
    <CreateWizardInner
      key="ready"
      {...props}
      initialDraft={draft}
      autosaveEnabled
    />
  );
}

function CreateWizardInner({
  userId,
  displayName,
  balance,
  costs,
  kit,
  defaultLanguage,
  defaultVertical,
  initialDraft,
  autosaveEnabled,
}: {
  userId: string;
  displayName: string | null;
  balance: number;
  costs: GenerationCosts;
  kit: BrandKit | null;
  defaultLanguage: string;
  defaultVertical: string | null;
  initialDraft: CampaignDraft | null;
  autosaveEnabled: boolean;
}) {
  const router = useRouter();
  const initialVertical = (VERTICALS.some((v) => v.value === defaultVertical)
    ? defaultVertical
    : "seller") as Vertical;
  const initialLanguage = (
    ["en", "fr", "tw", "gaa"].includes(defaultLanguage) ? defaultLanguage : "en"
  ) as Language;
  const storageKey = `adgenie:campaign-draft:${userId}:v1`;
  const [step, setStep] = useState(initialDraft?.step ?? 0);
  const [vertical, setVertical] = useState<Vertical>(
    initialDraft?.vertical ?? initialVertical
  );
  const [businessName, setBusinessName] = useState(
    initialDraft?.businessName ?? displayName ?? ""
  );
  const [headline, setHeadline] = useState(initialDraft?.headline ?? "");
  const [details, setDetails] = useState(initialDraft?.details ?? "");
  const [sourceUrl, setSourceUrl] = useState(initialDraft?.sourceUrl ?? "");
  const [importBusy, setImportBusy] = useState(false);
  const [importReset, setImportReset] = useState(0);
  const [photoRevision, setPhotoRevision] = useState(0);
  const [priceLabel, setPriceLabel] = useState(initialDraft?.priceLabel ?? "");
  const [offerLabel, setOfferLabel] = useState(initialDraft?.offerLabel ?? "");
  const [language, setLanguage] = useState<Language>(
    initialDraft?.language ?? initialLanguage
  );
  const [formats, setFormats] = useState<CampaignFormat[]>(
    initialDraft?.formats ?? ["1:1", "4:5", "9:16"]
  );
  const [creative, setCreative] = useState<CreativeDirection>(() =>
    creativeForVertical(
      initialDraft?.vertical ?? initialVertical,
      initialDraft?.creative ?? DEFAULT_CREATIVE
    )
  );
  const [submitting, setSubmitting] = useState(false);
  const [photoIds, setPhotoIds] = useState<string[]>(initialDraft?.photoIds ?? []);
  const [error, setError] = useState<string | null>(null);
  const [draftRestored, setDraftRestored] = useState(initialDraft !== null);
  const [restoredAt, setRestoredAt] = useState<string | null>(
    initialDraft?.savedAt ?? null
  );
  const stepRef = useRef<HTMLFormElement>(null);

  const motion = creative.engines.includes("motion");
  const spin = creative.engines.includes("spin");
  const [stillCopy, motionCopy, spinCopy] = enginesFor(vertical) as [
    EngineOption,
    EngineOption,
    EngineOption,
  ];
  const hooks = hooksFor(vertical);
  const spinProducts = productsFor(vertical);
  const audienceApplies = vertical !== "company";

  const validBrief =
    businessName.trim().length >= 2 &&
    headline.trim().length >= 3 &&
    details.trim().length >= 10;
  const validLook = formats.length > 0;

  const quote = useMemo(() => {
    const lines = [
      {
        kind: "image" as const,
        label: "Scene images",
        units: formats.length,
        unitCredits: costs.image,
        credits: formats.length * costs.image,
      },
      {
        kind: "overlay" as const,
        label: "Text & logo overlays",
        units: formats.length,
        unitCredits: costs.overlay,
        credits: formats.length * costs.overlay,
      },
      {
        kind: "copy" as const,
        label: "Caption, hashtags & CTA",
        units: 1,
        unitCredits: costs.copy,
        credits: costs.copy,
      },
      ...(motion
        ? [
            {
              kind: "video" as const,
              label: `${motionCopy.label} · 9:16`,
              units: 1,
              unitCredits: costs.video,
              credits: costs.video,
            },
          ]
        : []),
    ];
    return {
      lines,
      total: lines.reduce((sum, line) => sum + line.credits, 0),
    };
  }, [formats, motion, costs, motionCopy.label]);

  const channelFits = useMemo(
    () =>
      rankChannels({
        hasVideo: motion,
        formats,
        goal: details,
        vertical,
      }),
    [motion, formats, details, vertical]
  );

  // Genie reads this draft as it is typed, and can write back into the two
  // free-text fields. Captions and hooks stay copy-only: they are not briefs.
  const assistantContext = useMemo<AssistantContext>(
    () => ({
      screen: "create",
      language,
      vertical,
      businessName: businessName.trim() || null,
      headline: headline.trim() || null,
      details: details.trim() || null,
      sourceUrl: sourceUrl.trim() || null,
      priceLabel: priceLabel.trim() || null,
      offerLabel: offerLabel.trim() || null,
      formats,
      credits: balance,
      brand: kit
        ? {
            name: kit.name,
            tone: kit.tone,
            primary: kit.primaryColor ?? undefined,
            secondary: kit.secondaryColor ?? undefined,
          }
        : null,
    }),
    [
      language,
      vertical,
      businessName,
      headline,
      details,
      sourceUrl,
      priceLabel,
      offerLabel,
      formats,
      balance,
      kit,
    ]
  );

  const assistantApply = useMemo<AssistantApplyHandler>(
    () => ({
      label: (suggestion) => {
        if (suggestion.kind === "headline") return "Use as headline";
        if (suggestion.kind === "idea") return "Add to brief";
        return null;
      },
      apply: (suggestion) => {
        if (suggestion.kind === "headline") {
          setHeadline(suggestion.text.replace(/\s+/g, " ").trim().slice(0, 60));
          return;
        }
        if (suggestion.kind === "idea") {
          setDetails((current) =>
            (current.trim() ? `${current.trim()}\n${suggestion.text}` : suggestion.text).slice(
              0,
              800
            )
          );
        }
      },
    }),
    []
  );

  useAssistantContext(assistantContext);
  useAssistantApply(assistantApply);

  useEffect(() => {
    if (!autosaveEnabled) return;
    const isUntouched =
      step === 0 &&
      vertical === initialVertical &&
      businessName === (displayName ?? "") &&
      !headline &&
      !details &&
      !sourceUrl &&
      !priceLabel &&
      !offerLabel &&
      language === initialLanguage &&
      formats.join(",") === "1:1,4:5,9:16" &&
      JSON.stringify(creative) ===
        JSON.stringify(creativeForVertical(initialVertical, DEFAULT_CREATIVE)) &&
      photoIds.length === 0;

    try {
      if (isUntouched) {
        window.localStorage.removeItem(storageKey);
        return;
      }
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({
          version: 1,
          savedAt: new Date().toISOString(),
          step,
          vertical,
          businessName,
          headline,
          details,
          sourceUrl,
          priceLabel,
          offerLabel,
          language,
          formats,
          creative,
          photoIds,
        } satisfies CampaignDraft)
      );
    } catch {
      // A full or unavailable local store must not interrupt the brief.
    }
  }, [
    autosaveEnabled,
    step,
    vertical,
    businessName,
    headline,
    details,
    sourceUrl,
    priceLabel,
    offerLabel,
    language,
    formats,
    creative,
    photoIds,
    displayName,
    initialLanguage,
    initialVertical,
    storageKey,
  ]);

  function discardDraft() {
    setStep(0);
    setVertical(initialVertical);
    setBusinessName(displayName ?? "");
    setHeadline("");
    setDetails("");
    setSourceUrl("");
    setImportReset((current) => current + 1);
    setPriceLabel("");
    setOfferLabel("");
    setLanguage(initialLanguage);
    setFormats(["1:1", "4:5", "9:16"]);
    setCreative(
      creativeForVertical(initialVertical, {
        ...DEFAULT_CREATIVE,
        engines: [...DEFAULT_CREATIVE.engines],
      })
    );
    setPhotoIds([]);
    setError(null);
    setDraftRestored(false);
    setRestoredAt(null);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Nothing else to do if the local store cannot be cleared.
    }
  }

  function patchCreative(patch: Partial<CreativeDirection>) {
    setCreative((current) => ({ ...current, ...patch }));
  }

  function goStep(next: number) {
    setStep(next);
    requestAnimationFrame(() => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      stepRef.current?.scrollIntoView({
        behavior: reduce ? "auto" : "smooth",
        block: "start",
      });
    });
  }

  function chooseAudience(audience: SpinAudience) {
    setCreative((current) => ({
      ...current,
      spinAudience: audience,
      spinMode: audience === "kids" && current.spinMode === "model" ? "mannequin" : current.spinMode,
    }));
  }

  function chooseVertical(next: Vertical) {
    setVertical(next);
    setCreative((current) => creativeForVertical(next, current));
  }

  function includeEngine(engine: CreativeEngine) {
    setCreative((current) =>
      current.engines.includes(engine)
        ? current
        : { ...current, engines: [...current.engines, engine] }
    );
  }

  function toggleEngine(engine: "motion" | "spin") {
    setCreative((current) =>
      current.engines.includes(engine)
        ? {
            ...current,
            engines: current.engines.filter((value) => value !== engine),
          }
        : { ...current, engines: [...current.engines, engine] }
    );
  }

  function toggleFormat(format: CampaignFormat) {
    setFormats((current) =>
      current.includes(format)
        ? current.filter((f) => f !== format)
        : FORMATS.map((f) => f.value).filter(
            (f) => current.includes(f) || f === format
          )
    );
  }

  function applyImport(page: ImportedPage, assetIds: string[]) {
    if (page.businessName) setBusinessName(page.businessName);
    if (page.headline) setHeadline(page.headline);
    if (page.details) setDetails(page.details);
    if (page.priceLabel) setPriceLabel(page.priceLabel);
    setPhotoIds((current) =>
      Array.from(new Set([...current, ...assetIds])).slice(0, 3)
    );
    setPhotoRevision((current) => current + 1);
  }

  async function submit() {
    setError(null);
    setSubmitting(true);
    const url = sourceUrl.trim();

    try {
      const campaign = await api<Campaign>("/campaigns", {
        method: "POST",
        body: {
          vertical,
          goal: details.trim().slice(0, 200),
          language,
          credit_budget: quote.total,
          business_name: businessName.trim(),
          headline: headline.trim(),
          details: details.trim(),
          source_url: url
            ? /^https?:\/\//i.test(url)
              ? url
              : `https://${url}`
            : undefined,
          price_label: priceLabel.trim() || undefined,
          offer_label: offerLabel.trim() || undefined,
          formats,
          video: motion,
          engines: creative.engines,
          motion_hook: creative.motionHook,
          motion_pace: creative.motionPace,
          spin_audience: creative.spinAudience,
          spin_product: creative.spinProduct,
          spin_mode: creative.spinMode,
          photo_ids: photoIds,
        },
      });
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // The campaign is saved; a stale local draft copy is not worth blocking on.
      }
      router.push(`/campaigns/${campaign.id}`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "We could not save the campaign. Try again."
      );
      setSubmitting(false);
    }
  }

  return (
    <div className="shell-wide space-y-8">
      <header className="animate-in">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-400">
          Create campaign
        </p>
        <h1 className="font-display text-3xl font-bold leading-[1.05] tracking-tight text-white md:text-[2.6rem]">
          Brief it. Price it.
          <br />
          <span className="gradient-text-hero glow-text-gold">Post it tonight.</span>
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/50 md:text-base">
          Three answers and the agent has a plan. You approve the credit cost
          before anything is generated.
        </p>
        {draftRestored && (
          <div
            role="status"
            className="mt-5 flex flex-col gap-3 rounded-2xl border border-teal-300/20 bg-teal-500/[0.06] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-teal-100">
                Draft restored on this device
              </p>
              <p className="mt-0.5 text-xs text-white/45">
                {Date.parse(restoredAt ?? "")
                  ? `Saved ${new Date(restoredAt!).toLocaleString("en-GH", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}. Nothing was sent yet.`
                  : "Nothing was sent yet."}
              </p>
            </div>
            <button
              type="button"
              onClick={discardDraft}
              className="touch-target inline-flex shrink-0 items-center justify-center self-start rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white/65 transition hover:border-white/25 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 sm:self-auto"
            >
              Start fresh
            </button>
          </div>
        )}
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0 space-y-5">
          <div className="sticky top-[calc(4rem_+_env(safe-area-inset-top))] z-20 -mx-1 rounded-2xl border border-white/10 bg-[#060810]/85 p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <Stepper step={step} onStep={goStep} />
            <div className="mx-1 mb-0.5 mt-1.5 h-[3px] overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-teal-300 transition-[width] duration-500 ease-out"
                style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
              />
            </div>
          </div>

          <form
            ref={stepRef}
            onSubmit={(event) => {
              event.preventDefault();
              if (importBusy) return;
              if (step === 0 && !validBrief) return;
              if (step === 1 && !validLook) return;
              if (step < 2) {
                goStep(step + 1);
                return;
              }
              void submit();
            }}
            className="glass-card scroll-mt-40 rounded-2xl p-5 pb-24 md:p-7"
          >
            {step === 0 && (
              <div key={`brief-${step}`} className="animate-in space-y-7">
                <div>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/35">
                    What are we making?
                  </p>
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {VERTICALS.map((option) => {
                      const selected = vertical === option.value;
                      const Glyph = option.glyph;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => chooseVertical(option.value)}
                          className={cn(
                            "group relative rounded-2xl border p-4 text-left transition-all",
                            selected
                              ? "border-amber-400/50 bg-amber-500/10 shadow-[0_8px_30px_rgba(245,158,11,0.12)]"
                              : "border-white/8 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                          )}
                        >
                          {selected && (
                            <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-black">
                              <Check className="h-3 w-3" strokeWidth={3} />
                            </span>
                          )}
                          <Glyph
                            className={cn(
                              "mb-4 h-7 w-7",
                              selected ? "text-amber-300" : "text-white/40"
                            )}
                          />
                          <p className="font-display text-sm font-semibold text-white">
                            {option.title}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-white/35 line-clamp-2">
                            {option.copy}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <UrlImport
                  key={`${importReset}:${vertical}`}
                  value={sourceUrl}
                  onChange={setSourceUrl}
                  defaultMode={vertical === "company" ? "company" : "product"}
                  availableSlots={Math.max(0, 3 - photoIds.length)}
                  onApply={applyImport}
                  onBusyChange={setImportBusy}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="business-name" className={labelClass}>
                      Business or brand
                    </label>
                    <input
                      id="business-name"
                      className={cn(fieldClass, "sm:max-w-[420px]")}
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Kofi's Kitchen"
                      maxLength={120}
                      autoComplete="organization"
                    />
                  </div>
                  <div>
                    <label htmlFor="headline" className={labelClass}>
                      Headline on the ad
                    </label>
                    <input
                      id="headline"
                      className={cn(fieldClass, "sm:max-w-[420px]")}
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                      placeholder="Jollof Night"
                      maxLength={60}
                    />
                  </div>
                </div>

                <div className="max-w-[720px]">
                  <label htmlFor="details" className={labelClass}>
                    Tell the agent what you are selling
                  </label>
                  <textarea
                    id="details"
                    className={cn(fieldClass, "min-h-[120px] resize-y")}
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="Friday jollof night at Kofi's Kitchen, Osu. GH¢45 a plate, free delivery over GH¢150. Book on WhatsApp before 6pm."
                    maxLength={800}
                  />
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-xs text-white/50">
                      Facts only — the agent never invents a price or a claim.
                    </p>
                    <span className="text-xs tabular-nums text-white/40">
                      {details.length}/800
                    </span>
                  </div>
                  <BriefAssist
                    context={assistantContext}
                    onHeadline={setHeadline}
                    onDetails={setDetails}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="price-label" className={labelClass}>
                      Price / offer
                    </label>
                    <input
                      id="price-label"
                      className={cn(fieldClass, "max-w-[240px]")}
                      value={priceLabel}
                      onChange={(e) => setPriceLabel(e.target.value)}
                      placeholder="GH¢45 a plate"
                      maxLength={40}
                    />
                  </div>
                  <div>
                    <label htmlFor="offer-label" className={labelClass}>
                      Sticker
                    </label>
                    <input
                      id="offer-label"
                      className={cn(fieldClass, "max-w-[240px]")}
                      value={offerLabel}
                      onChange={(e) => setOfferLabel(e.target.value)}
                      placeholder="FRI 7PM"
                      maxLength={24}
                    />
                  </div>
                  <div className="flex items-end">
                    <p className="pb-3 text-xs leading-relaxed text-white/45">
                      Both are drawn by code, so they stay legible at every size.
                    </p>
                  </div>
                </div>

                <PhotoPicker selected={photoIds} onChange={setPhotoIds} revision={photoRevision} />
              </div>
            )}

            {step === 1 && (
              <div key={`look-${step}`} className="animate-in space-y-7">
                <div>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/35">
                    Language
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {LANGUAGES.map((option) => {
                      const selected = language === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setLanguage(option.value)}
                          className={cn(
                            "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all touch-target",
                            selected
                              ? "border-amber-400/50 bg-amber-500/10 text-amber-200"
                              : "border-white/10 text-white/50 hover:border-white/20 hover:text-white/80"
                          )}
                        >
                          {option.label}
                          {option.beta && (
                            <span className="rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-300">
                              Beta
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {(language === "tw" || language === "gaa") && (
                    <p className="mt-3 rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-xs leading-relaxed text-violet-200/80">
                      Twi and Ga copy is reviewed by a native speaker before it
                      ships. Expect a short review step.
                    </p>
                  )}
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">
                      Where it will run
                    </p>
                    <p className="text-[11px] text-white/30">
                      {costs.image + costs.overlay} credits each
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {FORMATS.map((format) => {
                      const selected = formats.includes(format.value);
                      return (
                        <button
                          key={format.value}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleFormat(format.value)}
                          className={cn(
                            "flex items-center gap-3 rounded-2xl border p-4 text-left transition-all sm:flex-col sm:items-start",
                            selected
                              ? "border-amber-400/50 bg-amber-500/10"
                              : "border-white/8 bg-white/[0.02] hover:border-white/20"
                          )}
                        >
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                            <span
                              className={cn(
                                "rounded-[3px] border-2",
                                format.ratio,
                                selected ? "border-amber-300" : "border-white/30"
                              )}
                            />
                          </span>
                          <span className="min-w-0">
                            <span className="block font-display text-sm font-semibold text-white">
                              {format.value} · {format.label}
                            </span>
                            <span className="mt-0.5 block text-xs text-white/35">
                              {format.sub}
                            </span>
                          </span>
                          {selected && (
                            <Check className="ml-auto h-4 w-4 text-amber-300 sm:absolute sm:right-3 sm:top-3" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {!validLook && (
                    <p className="mt-2 text-xs text-rose-300">
                      Pick at least one size.
                    </p>
                  )}
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">
                      Creative engines
                    </p>
                    <p className="text-[11px] text-white/30">One kit · three outputs</p>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <div className="relative rounded-2xl border border-teal-400/25 bg-teal-500/[0.05] p-3.5">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-400/15 text-teal-300">
                        <ImageIcon className="h-4 w-4" />
                      </span>
                      <p className="mt-3 font-display text-xs font-semibold text-white">
                        {stillCopy.label}
                      </p>
                      <p className="text-xs text-white/45">{stillCopy.kicker}</p>
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-teal-400/20 bg-teal-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-teal-300">
                        <Check className="h-2.5 w-2.5" />
                        Always on
                      </span>
                    </div>

                    <button
                      type="button"
                      aria-pressed={motion}
                      onClick={() => toggleEngine("motion")}
                      className={cn(
                        "relative rounded-2xl border p-3.5 text-left transition-all",
                        motion
                          ? "border-amber-400/50 bg-amber-500/10"
                          : "border-white/8 bg-white/[0.02] hover:border-white/20"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg",
                          motion
                            ? "bg-amber-400/15 text-amber-300"
                            : "bg-white/[0.04] text-white/40"
                        )}
                      >
                        <Film className="h-4 w-4" />
                      </span>
                      <p className="mt-3 font-display text-xs font-semibold text-white">
                        {motionCopy.label}
                      </p>
                      <p className="text-xs text-white/45">{motionCopy.kicker} · 9:16</p>
                      <span
                        className={cn(
                          "mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                          motion
                            ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
                            : "border-white/10 text-white/40"
                        )}
                      >
                        {motion ? "In plan" : `+${costs.video} credits`}
                      </span>
                    </button>

                    <button
                      type="button"
                      aria-pressed={spin}
                      onClick={() => toggleEngine("spin")}
                      className={cn(
                        "relative rounded-2xl border p-3.5 text-left transition-all",
                        spin
                          ? "border-violet-400/50 bg-violet-500/10"
                          : "border-white/8 bg-white/[0.02] hover:border-white/20"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg",
                          spin
                            ? "bg-violet-400/15 text-violet-300"
                            : "bg-white/[0.04] text-white/40"
                        )}
                      >
                        <Box className="h-4 w-4" />
                      </span>
                      <p className="mt-3 font-display text-xs font-semibold text-white">
                        {spinCopy.label}
                      </p>
                      <p className="text-xs text-white/45">{spinCopy.kicker}</p>
                      <span
                        className={cn(
                          "mt-2 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                          spin
                            ? "border-violet-400/30 bg-violet-500/10 text-violet-200"
                            : "border-white/10 text-white/40"
                        )}
                      >
                        {spin ? "In plan" : "Free"}
                      </span>
                    </button>
                  </div>

                  <p
                    className={cn(
                      "mt-2 flex items-start gap-1.5 text-xs leading-relaxed",
                      motion ? "text-teal-200/65" : "text-amber-200/70"
                    )}
                  >
                    <Info className="mt-px h-3 w-3 shrink-0" />
                    {motion
                      ? "Motion exports 9:16, so TikTok and Instagram Reels are in play."
                      : "TikTok takes video only. Without Motion, this kit fits Instagram, Facebook and WhatsApp."}
                  </p>

                  {motion && (
                    <div className="mt-3 space-y-3 rounded-2xl border border-amber-400/15 bg-amber-500/[0.04] p-3.5">
                      <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-white/45">
                          Opening hook
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {hooks.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              aria-pressed={creative.motionHook === option.value}
                              onClick={() =>
                                patchCreative({ motionHook: option.value as MotionHook })
                              }
                              className={cn(
                                "min-h-11 rounded-lg border px-2 py-1.5 text-left text-xs font-medium transition-colors",
                                creative.motionHook === option.value
                                  ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
                                  : "border-white/8 text-white/45 hover:border-white/20 hover:text-white/70"
                              )}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-white/45">
                          Pace
                        </p>
                        <div className="flex gap-1.5">
                          {PACES.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              aria-pressed={creative.motionPace === option.value}
                              onClick={() =>
                                patchCreative({ motionPace: option.value as MotionPace })
                              }
                              className={cn(
                                "min-h-11 flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
                                creative.motionPace === option.value
                                  ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
                                  : "border-white/8 text-white/45 hover:border-white/20 hover:text-white/70"
                              )}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {spin && (
                    <div className="mt-3 space-y-3 rounded-2xl border border-violet-400/15 bg-violet-500/[0.04] p-3.5">
                      {audienceApplies && (
                        <div>
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-white/45">
                            Who it is for
                          </p>
                          <div className="flex gap-1.5">
                            {AUDIENCES.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                aria-pressed={creative.spinAudience === option.value}
                                onClick={() =>
                                  chooseAudience(option.value as SpinAudience)
                                }
                                className={cn(
                                  "min-h-11 flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors",
                                  creative.spinAudience === option.value
                                    ? "border-violet-400/40 bg-violet-500/10 text-violet-100"
                                    : "border-white/8 text-white/45 hover:border-white/20 hover:text-white/70"
                                )}
                              >
                                {option.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-white/45">
                          What turns
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {spinProducts.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              aria-pressed={creative.spinProduct === option.value}
                              onClick={() =>
                                patchCreative({ spinProduct: option.value as SpinProduct })
                              }
                              className={cn(
                                "min-h-11 rounded-lg border px-2 py-1.5 text-left text-xs font-medium transition-colors",
                                creative.spinProduct === option.value
                                  ? "border-violet-400/40 bg-violet-500/10 text-violet-100"
                                  : "border-white/8 text-white/45 hover:border-white/20 hover:text-white/70"
                              )}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {vertical === "fashion" && creative.spinProduct === "outfit" && (
                        <div>
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/45">
                              How the look is shown
                            </p>
                            <span className="text-[10px] uppercase tracking-wider text-white/40">
                              Fashion
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {spinModesFor(creative.spinAudience).map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                aria-pressed={creative.spinMode === option.value}
                                onClick={() =>
                                  patchCreative({ spinMode: option.value as SpinMode })
                                }
                                className={cn(
                                  "min-h-11 rounded-lg border px-2 py-1.5 text-left text-xs font-medium transition-colors",
                                  creative.spinMode === option.value
                                    ? "border-violet-400/40 bg-violet-500/10 text-violet-100"
                                    : "border-white/8 text-white/45 hover:border-white/20 hover:text-white/70"
                                )}
                              >
                                <span className="block">{option.label}</span>
                                <span className="mt-0.5 block text-[10px] font-normal leading-tight text-white/40">
                                  {option.hint}
                                </span>
                              </button>
                            ))}
                          </div>
                          <p className="mt-1.5 text-xs leading-relaxed text-white/45">
                            {creative.spinAudience === "kids"
                              ? "Kids' fashion is only shown on a mannequin or as a digital kit — never on a modelled child."
                              : "The still image is generated with the same presentation, so the ad and the 360° stage match."}
                          </p>
                        </div>
                      )}
                      <p className="text-xs leading-relaxed text-white/45">
                        The 360° stage uses the same still — drag it in the deck
                        to check every side. No extra credits.
                      </p>
                    </div>
                  )}

                  <p className="mt-2 text-xs leading-relaxed text-white/50">
                    The agent draws price, phone and CTA with code. Engines share
                    your brand kit; nothing else to configure.
                  </p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div key={`price-${step}`} className="animate-in space-y-6">
                <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">
                        The brief
                      </p>
                      <p className="mt-1 font-display text-lg font-semibold text-white">
                        {businessName || "Your business"} — {headline || "your ad"}
                      </p>
                      <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/45">
                        {details}
                      </p>
                      {sourceUrl && (
                        <p className="mt-2 truncate text-xs text-teal-300/70">
                          {sourceUrl}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => goStep(0)}
                      className="touch-target inline-flex shrink-0 items-center justify-center rounded-lg border border-amber-400/20 px-3 text-xs font-semibold text-amber-300 transition-colors hover:border-amber-400/45 hover:text-amber-200"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="mt-4 border-t border-white/5 pt-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">
                        The look
                      </p>
                      <button
                        type="button"
                        onClick={() => goStep(1)}
                        className="touch-target inline-flex shrink-0 items-center justify-center rounded-lg border border-amber-400/20 px-3 text-xs font-semibold text-amber-300 transition-colors hover:border-amber-400/45 hover:text-amber-200"
                      >
                        Edit look
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                    {formats.map((format) => (
                      <span
                        key={format}
                        className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/55"
                      >
                        {format}
                      </span>
                    ))}
                    {motion && (
                      <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-200">
                        + {motionCopy.label} ·{" "}
                        {hooks.find((item) => item.value === creative.motionHook)?.label}
                      </span>
                    )}
                    {spin && (
                      <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-200">
                        + {spinCopy.label} ·{" "}
                        {audienceApplies
                          ? AUDIENCES.find(
                              (item) => item.value === creative.spinAudience
                            )?.label
                          : PRODUCT_LABEL[creative.spinProduct]}
                        {vertical === "fashion" &&
                          creative.spinProduct === "outfit" &&
                          ` · ${SPIN_MODE_LABEL[creative.spinMode]}`}
                      </span>
                    )}
                    <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase text-white/55">
                      {language}
                    </span>
                    {photoIds.length > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-400/25 bg-teal-500/10 px-2.5 py-1 text-[11px] text-teal-200">
                        <Camera className="h-3 w-3" />
                        {photoIds.length} photo {photoIds.length === 1 ? "reference" : "references"}
                      </span>
                    )}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">
                      Where this kit can run
                    </p>
                    <p className="text-[11px] text-white/30">Ranked for this kit</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {channelFits.map((fit) => {
                      const policy = CHANNEL_POLICIES[fit.channel];
                      const Icon = CHANNEL_ICON[fit.channel];
                      return (
                        <div
                          key={fit.channel}
                          className={cn(
                            "rounded-2xl border p-3",
                            FIT_CARD[fit.level]
                          )}
                        >
                          <div className="flex items-center gap-1.5">
                            <Icon className="h-3.5 w-3.5 text-white/55" />
                            <p className="text-[11px] font-semibold text-white/85">
                              {policy.label}
                            </p>
                            <span className="ml-auto text-[11px] font-semibold uppercase tracking-wider text-white/45">
                              {FIT_LABEL[fit.level]}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-white/45">
                            {policy.purpose}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-white/55">
                            {fit.reasons[0]}
                          </p>
                          {fit.fix && (
                            <p className="mt-1 text-xs leading-relaxed text-amber-200/75">
                              {fit.fix}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-white/50">
                    Fit is guidance, not a promise of reach. TikTok is a hard no
                    without motion; the other three can carry this kit.
                  </p>
                </div>

                <div>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/35">
                    What the credits buy
                  </p>
                  <ul className="divide-y divide-white/5 rounded-2xl border border-white/8">
                    {quote.lines.map((line) => (
                      <li
                        key={line.kind}
                        className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                      >
                        <span className="text-white/60">
                          {line.label}
                          <span className="ml-2 text-xs text-white/25">
                            {line.units} × {line.unitCredits}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "tabular-nums",
                            line.kind === "video"
                              ? "text-right text-xs font-semibold text-white/40"
                              : "font-semibold text-white"
                          )}
                        >
                          {line.kind === "video"
                            ? `${line.credits} credits · not in this run yet`
                            : line.credits}
                        </span>
                      </li>
                    ))}
                    <li className="flex items-center justify-between gap-4 px-4 py-3.5">
                      <span className="font-display font-semibold text-white">
                        Plan total
                      </span>
                      <span className="flex items-center gap-1.5 font-display text-xl font-bold text-amber-300">
                        <Zap className="h-4 w-4" />
                        {quote.total}
                      </span>
                    </li>
                  </ul>
                  {motion && (
                    <p className="mt-2 px-1 text-xs leading-relaxed text-white/50">
                      This run charges {quote.total - costs.video} of {quote.total}{" "}
                      credits — the stills, sizes and caption. The film line is
                      reserved and released, never billed, until the video worker
                      ships.
                    </p>
                  )}
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-teal-400/20 bg-teal-500/[0.07] px-4 py-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" />
                  <p className="text-xs leading-relaxed text-teal-100/70">
                    Nothing is charged yet. This saves the brief and the price;
                    credits move only when generation starts, and unused credits
                    are refunded.
                  </p>
                </div>

                <div
                  className={cn(
                    "flex items-center gap-2 text-xs",
                    quote.total > balance ? "text-amber-300/80" : "text-white/35"
                  )}
                >
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  {quote.total > balance
                    ? `You have ${balance} credits; this plan needs ${quote.total}. Top up before generation starts.`
                    : `You have ${balance} credits. The plan fits.`}
                </div>

                {error && <div className={formErrorClass}>{error}</div>}
              </div>
            )}

            {/* On a phone this bar is pinned to the bottom edge so Back and
                Continue stay under the thumb while the brief scrolls above it. */}
            <div className="mt-7 flex items-center justify-between gap-3 border-t border-white/5 pt-5 max-sm:fixed max-sm:inset-x-0 max-sm:bottom-0 max-sm:z-30 max-sm:mt-0 max-sm:border-white/10 max-sm:bg-[#060810]/95 max-sm:px-4 max-sm:pb-[calc(0.85rem_+_env(safe-area-inset-bottom))] max-sm:pt-3 max-sm:pr-[5.25rem] max-sm:backdrop-blur-xl max-sm:shadow-[0_-14px_34px_rgba(0,0,0,0.55)]">
              {step > 0 ? (
                <button
                  type="button"
                  onClick={() => goStep(step - 1)}
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-white/45 transition-colors hover:text-white/80 touch-target"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
              ) : (
                <span />
              )}

              {step < 2 ? (
                <button
                  type="submit"
                  disabled={step === 0 ? !validBrief || importBusy : !validLook}
                  className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 touch-target"
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting || importBusy}
                  className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 touch-target"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving plan…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Save the plan
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>

        <aside className="h-fit lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1">
          <DirectionDeck
            kit={kit}
            vertical={vertical}
            businessName={businessName}
            headline={headline}
            priceLabel={priceLabel}
            offerLabel={offerLabel}
            language={language}
            creative={creative}
            onChange={patchCreative}
            onInclude={includeEngine}
            motionCost={costs.video}
          />

          <div className="mt-4 flex items-end justify-between gap-3 px-1">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-white/40">
                Draft estimate
              </p>
              <p className="font-display text-3xl font-bold leading-none text-white">
                {quote.total}
                <span className="ml-1 text-sm font-medium text-white/35">credits</span>
              </p>
            </div>
            <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
              {formats.length} {formats.length === 1 ? "size" : "sizes"}
              {motion ? " · motion" : ""}
              {spin ? " · 360" : ""}
            </span>
          </div>
          <p className="mt-3 px-1 text-xs leading-relaxed text-white/45">
            The deck is a sketch. The agent keeps your product, logo or venue
            from your photos and draws every price, phone and CTA with code. The
            360° stage is included with your still.
          </p>
        </aside>
      </div>
    </div>
  );
}

function Stepper({
  step,
  onStep,
}: {
  step: number;
  onStep: (index: number) => void;
}) {
  return (
    <ol className="grid grid-cols-3 gap-2">
      {STEPS.map((label, index) => {
        const done = index < step;
        const active = index === step;
        return (
          <li key={label}>
            <button
              type="button"
              onClick={() => {
                if (index < step) onStep(index);
              }}
              aria-current={active ? "step" : undefined}
              className={cn(
                "min-h-[44px] w-full rounded-xl border px-3 py-2.5 text-left transition-all",
                active
                  ? "border-amber-400/40 bg-amber-500/10"
                  : done
                    ? "border-white/10 bg-white/[0.03] hover:border-white/20"
                    : "border-white/5 bg-transparent opacity-50"
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                    active
                      ? "bg-amber-400 text-black"
                      : done
                        ? "bg-teal-400/20 text-teal-300"
                        : "bg-white/5 text-white/40"
                  )}
                >
                  {done ? <Check className="h-3 w-3" strokeWidth={3} /> : index + 1}
                </span>
                <span
                  className={cn(
                    "truncate text-xs font-semibold",
                    active ? "text-white" : "text-white/45"
                  )}
                >
                  {label}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
