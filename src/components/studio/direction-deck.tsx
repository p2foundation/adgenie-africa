"use client";

import { useState } from "react";
import {
  Box,
  Check,
  Film,
  Image as ImageIcon,
  Plus,
  Sparkles,
} from "lucide-react";
import { CampaignPreview } from "@/components/campaign/campaign-preview";
import { SpinStage } from "@/components/studio/spin-stage";
import { MotionPreview } from "@/components/studio/motion-preview";
import type {
  BrandKit,
  CreativeDirection,
  CreativeEngine,
  MotionHook,
  MotionPace,
  SpinAudience,
  SpinMode,
  SpinProduct,
} from "@/lib/api";
import {
  AUDIENCES,
  PLAYBOOK_LABEL,
  PACES,
  SPIN_MODE_LABEL,
  enginesFor,
  hooksFor,
  productsFor,
  spinModesFor,
  treatmentFor,
  type StudioVertical,
} from "@/lib/studio";
import { cn } from "@/lib/utils";

type Vertical = StudioVertical;

const ENGINE_ICON = {
  image: ImageIcon,
  motion: Film,
  spin: Box,
} as const;

const ENGINE_HINT: Record<CreativeEngine, string> = {
  image: "Entered with every plan",
  motion: "Priced as the 9:16 video",
  spin: "Free — same still, turned",
};

/**
 * One kit, three engines. The kit sets the palette and voice; each engine
 * expresses it differently. Everything here is a direction preview — the
 * plan stores the choices, and credits only move when generation starts.
 */
export function DirectionDeck({
  kit,
  vertical,
  businessName,
  headline,
  priceLabel,
  offerLabel,
  language,
  creative,
  onChange,
  onInclude,
  motionCost,
  wide = false,
  className,
}: {
  kit: BrandKit | null;
  vertical: Vertical;
  businessName: string;
  headline: string;
  priceLabel: string;
  offerLabel: string;
  language: string;
  creative: CreativeDirection;
  onChange: (patch: Partial<CreativeDirection>) => void;
  onInclude?: (engine: CreativeEngine) => void;
  motionCost?: number;
  wide?: boolean;
  className?: string;
}) {
  const [tab, setTab] = useState<CreativeEngine>("image");
  const treatment = treatmentFor(kit, tab, vertical);
  const included = creative.engines.includes(tab);
  const playbook = enginesFor(vertical);
  const current = playbook.find((item) => item.value === tab) ?? playbook[0]!;
  const hooks = hooksFor(vertical);
  const spinProducts = productsFor(vertical);
  const spinProduct = spinProducts.some(
    (option) => option.value === creative.spinProduct
  )
    ? creative.spinProduct
    : spinProducts[0]!.value;
  const audienceApplies = vertical !== "company";
  const modeApplies = vertical === "fashion" && spinProduct === "outfit";
  const modes = spinModesFor(creative.spinAudience);
  const spinMode = modes.some((option) => option.value === creative.spinMode)
    ? creative.spinMode
    : "mannequin";

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-white/8 bg-[#080b16]/85 backdrop-blur-xl",
        className
      )}
      aria-label="Direction deck — one brand kit, three engines"
    >
      <header className="border-b border-white/6 px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-300/80">
              <Sparkles className="h-3 w-3" />
              Direction deck
            </p>
            <p className="mt-1 truncate font-display text-sm font-semibold text-white">
              {PLAYBOOK_LABEL[vertical]}
            </p>
            <p className="mt-0.5 truncate text-[10px] text-white/30">
              {playbook.map((item) => item.label).join(" · ")}
            </p>
          </div>
          <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] font-medium text-white/40">
            {creative.engines.length} of 3
          </span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="flex shrink-0 -space-x-1">
            <span
              className="h-4 w-4 rounded-full border border-black/40"
              style={{ background: treatment.primary }}
            />
            <span
              className="h-4 w-4 rounded-full border border-black/40"
              style={{ background: treatment.secondary }}
            />
          </span>
          <p className="min-w-0 truncate text-[11px] text-white/35">
            {kit?.name ? (
              <>
                <span className="text-white/60">{kit.name}</span>
                <span className="mx-1.5 text-white/20">·</span>
                <span className={cn(treatment.look.look && "font-semibold text-white/55")}>
                  {treatment.look.name}
                </span>
                <span className="mx-1.5 text-white/20">·</span>
                {treatment.tone} voice
              </>
            ) : (
              "House palette — add a brand kit in Settings"
            )}
          </p>
        </div>
      </header>

      {/* Engine tabs */}
      <div role="tablist" aria-label="Creative engines" className="grid grid-cols-3 gap-1 p-2">
        {playbook.map((engine) => {
          const Icon = ENGINE_ICON[engine.value];
          const active = tab === engine.value;
          const inPlan = creative.engines.includes(engine.value);
          return (
            <button
              key={engine.value}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setTab(engine.value)}
              className={cn(
                "relative flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-[11px] font-semibold transition-all",
                active
                  ? "bg-white/[0.07] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                  : "text-white/40 hover:bg-white/[0.03] hover:text-white/70"
              )}
            >
              <Icon className={cn("h-3.5 w-3.5", active ? "text-amber-300" : "")} />
              <span className="truncate">{engine.label}</span>
              {inPlan && (
                <>
                  <span
                    className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-teal-400"
                    aria-hidden="true"
                  />
                  <span className="sr-only"> (in this plan)</span>
                </>
              )}
            </button>
          );
        })}
      </div>

      <div
        className={cn(
          "px-4 pb-4",
          wide && "grid gap-5 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)] lg:items-start"
        )}
      >
        <div
          className={cn(
            "mx-auto w-full",
            tab === "spin"
              ? "max-w-[340px]"
              : tab === "motion"
                ? "max-w-[236px]"
                : "max-w-[252px]",
            wide && tab !== "spin" && "lg:max-w-[236px]"
          )}
        >
          {tab === "image" && (
            <CampaignPreview
              vertical={vertical}
              businessName={businessName}
              headline={headline}
              priceLabel={priceLabel}
              offerLabel={offerLabel}
              language={language}
              primary={treatment.primary}
              secondary={treatment.secondary}
              cta={treatment.cta}
              look={treatment.look}
            />
          )}

          {tab === "motion" && (
            <MotionPreview
              vertical={vertical}
              businessName={businessName}
              headline={headline}
              priceLabel={priceLabel}
              offerLabel={offerLabel}
              language={language}
              hook={creative.motionHook}
              pace={creative.motionPace}
              primary={treatment.primary}
              look={treatment.look}
            />
          )}

          {tab === "spin" && (
            <SpinStage
              audience={creative.spinAudience}
              product={spinProduct}
              mode={spinMode}
              primary={treatment.primary}
              secondary={treatment.secondary}
              speed={treatment.spinSpeed}
              className="aspect-[4/5] w-full"
            />
          )}
        </div>

        <div className={cn("mt-4 space-y-4", wide && "lg:mt-0")}>
          <p className="text-xs leading-relaxed text-white/45">
            {vertical === "company" || vertical === "spot"
              ? current.detail
              : treatment.support}
          </p>

          {treatment.look.look && (
            <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-white/70">
                  {treatment.look.name}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-white/25">
                  {treatment.look.family}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-white/40">
                {treatment.look.promise}
              </p>
              <p className="mt-1 text-[10px] leading-relaxed text-amber-200/45">
                Watch out: {treatment.look.watchOut}
              </p>
            </div>
          )}

          {tab === "image" && (
            <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-white/70">
                  {current.label}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-teal-300">
                  <Check className="h-3 w-3" /> In this plan
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-white/30">
                {ENGINE_HINT.image}. Sizes are picked in the brief.
              </p>
            </div>
          )}

          {tab === "motion" && (
            <>
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/35">
                  Opening hook
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {hooks.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={creative.motionHook === option.value}
                      onClick={() =>
                        onChange({ motionHook: option.value as MotionHook })
                      }
                      className={cn(
                        "rounded-lg border px-2 py-1.5 text-left transition-colors",
                        creative.motionHook === option.value
                          ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
                          : "border-white/8 text-white/45 hover:border-white/20 hover:text-white/70"
                      )}
                    >
                      <span className="block text-[11px] font-semibold">
                        {option.label}
                      </span>
                      <span className="block text-[9px] uppercase tracking-wider opacity-55">
                        {option.tag}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/35">
                  Pace
                </p>
                <div className="grid grid-cols-3 gap-1 rounded-lg border border-white/8 p-0.5">
                  {PACES.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={creative.motionPace === option.value}
                      onClick={() =>
                        onChange({ motionPace: option.value as MotionPace })
                      }
                      className={cn(
                        "rounded-md py-1.5 text-[10px] font-semibold transition-colors",
                        creative.motionPace === option.value
                          ? "bg-white/10 text-white"
                          : "text-white/35 hover:text-white/70"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === "spin" && (
            <>
              {audienceApplies && (
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/35">
                    Who it is for
                  </p>
                  <div className="grid grid-cols-3 gap-1 rounded-lg border border-white/8 p-0.5">
                    {AUDIENCES.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={creative.spinAudience === option.value}
                        onClick={() =>
                          onChange({
                            spinAudience: option.value as SpinAudience,
                            ...(option.value === "kids" && creative.spinMode === "model"
                              ? { spinMode: "mannequin" as SpinMode }
                              : {}),
                          })
                        }
                        className={cn(
                          "rounded-md py-1.5 text-[10px] font-semibold transition-colors",
                          creative.spinAudience === option.value
                            ? "bg-white/10 text-white"
                            : "text-white/35 hover:text-white/70"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/35">
                  What turns
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {spinProducts.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={spinProduct === option.value}
                      onClick={() =>
                        onChange({ spinProduct: option.value as SpinProduct })
                      }
                      className={cn(
                        "rounded-lg border px-2.5 py-2 text-left transition-colors",
                        creative.spinProduct === option.value
                          ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
                          : "border-white/8 text-white/45 hover:border-white/20 hover:text-white/70"
                      )}
                    >
                      <span className="block text-[11px] font-semibold">
                        {option.label}
                      </span>
                      <span className="block text-[9px] uppercase tracking-wider opacity-55">
                        {option.hint}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {modeApplies && (
                <div>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35">
                      How it is shown
                    </p>
                    <span className="text-[9px] uppercase tracking-wider text-white/25">
                      Fashion
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 rounded-lg border border-white/8 p-0.5">
                    {modes.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={spinMode === option.value}
                        onClick={() => onChange({ spinMode: option.value as SpinMode })}
                        className={cn(
                          "rounded-md px-1 py-1.5 text-[10px] font-semibold leading-tight transition-colors",
                          spinMode === option.value
                            ? "bg-white/10 text-white"
                            : "text-white/35 hover:text-white/70"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[10px] leading-relaxed text-white/30">
                    {creative.spinAudience === "kids"
                      ? "Never a modelled child — kids' fashion turns on the mannequin or as a digital kit."
                      : modes.find((option) => option.value === spinMode)?.hint}
                  </p>
                </div>
              )}

              <p className="rounded-lg border border-white/6 bg-white/[0.02] px-2.5 py-2 text-[10px] leading-relaxed text-white/30">
                {audienceApplies
                  ? `Drag the stage to turn it. ${modeApplies ? `${SPIN_MODE_LABEL[spinMode]} presentation is set in the brief, so the still and the 360° match.` : "The same frame feeds the 360° clip — no extra credits."}`
                  : "A neutral studio, no people in frame. Built for products and packaging that have to look considered."}
              </p>
            </>
          )}

          {/* Plan state */}
          <div className="flex items-center justify-between gap-3 border-t border-white/6 pt-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-white/25">
                {current.label} · {current.kicker}
              </p>
              <p className="mt-0.5 text-[11px] text-white/40">{current.detail}</p>
              <p className="mt-0.5 text-[10px] text-white/25">{ENGINE_HINT[tab]}</p>
            </div>
            {included ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-teal-400/25 bg-teal-500/10 px-2.5 py-1 text-[10px] font-semibold text-teal-300">
                <Check className="h-3 w-3" />
                {tab === "image" ? "Always on" : "In plan"}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onInclude?.(tab)}
                disabled={!onInclude}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-300 transition-colors hover:border-amber-400/50 hover:text-amber-200 disabled:opacity-50"
              >
                <Plus className="h-3 w-3" />
                {tab === "motion" && motionCost
                  ? `Add · +${motionCost}`
                  : tab === "spin"
                    ? "Add · free"
                    : "Add"}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
