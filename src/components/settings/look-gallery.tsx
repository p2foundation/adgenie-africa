"use client";

import { useMemo, useState } from "react";
import { Check, Sparkles, SwatchBook } from "lucide-react";
import {
  BRAND_CHANNELS,
  BRAND_GOALS,
  BRAND_LOOKS,
  CHANNEL_LABEL,
  GOAL_LABEL,
  MARKET_LABEL,
  marketForCountry,
  paletteContrast,
  recommendLooks,
  readabilityScore,
  inkOn,
  type BrandChannel,
  type BrandGoal,
  type BrandLook,
} from "@adgenie/core";
import { FACE_CLASS, caseFor, shadeHex } from "@/lib/studio";
import type { StudioVertical } from "@/lib/studio";
import { cn } from "@/lib/utils";

const FIRST_PAGE = 6;

const SAMPLE: Record<StudioVertical, { headline: string; price: string; offer: string }> = {
  seller: { headline: "New season, ready today", price: "from GH¢ 180", offer: "New drop" },
  company: { headline: "Built to deliver, since 2019", price: "Request a quote", offer: "Trusted" },
  fashion: { headline: "The piece everyone asks about", price: "from GH¢ 240", offer: "Lookbook" },
  spot: { headline: "Friday night at the beach bar", price: "GH¢ 80 at the door", offer: "Doors 7pm" },
};

/**
 * The style gallery. A look is a palette plus a frame: picking one writes the
 * two colour columns and the voice the kit already stores, so no schema change
 * is needed and a look survives a reload because the palette resolves back to
 * it. The advisor is deterministic scoring in `src/core` — it has to
 * answer while the page is still loading, so it cannot be a model call.
 */
export function LookGallery({
  vertical,
  country,
  language,
  primary,
  secondary,
  onPick,
}: {
  vertical: StudioVertical;
  country: string | null;
  language: string;
  primary: string;
  secondary: string;
  onPick: (look: BrandLook) => void;
}) {
  const [goal, setGoal] = useState<BrandGoal | null>(null);
  const [channels, setChannels] = useState<BrandChannel[]>([]);
  const [showAll, setShowAll] = useState(false);

  const market = marketForCountry(country);
  const selected = useMemo(
    () =>
      BRAND_LOOKS.find(
        (look) =>
          look.primary.toUpperCase() === primary.toUpperCase() &&
          look.secondary.toUpperCase() === secondary.toUpperCase()
      ) ?? null,
    [primary, secondary]
  );

  const advice = useMemo(
    () =>
      recommendLooks({
        vertical,
        country,
        language,
        goal,
        channels,
      }, 3),
    [vertical, country, language, goal, channels]
  );

  const ranked = useMemo(() => {
    const scores = new Map(advice.map((item) => [item.look.id, item]));
    const reasons = new Map(advice.map((item) => [item.look.id, item.reasons]));
    const top = scores.get(advice[0]?.look.id ?? "");
    const scored = BRAND_LOOKS.map((look) => ({
      look,
      match: scores.get(look.id) ?? null,
      score: top ? Math.round(((scores.get(look.id)?.score ?? 0) / top.score) * 100) : 0,
      reasons: reasons.get(look.id) ?? [],
    }));
    return scored.sort((a, b) => {
      if (a.match && b.match) return b.match!.score - a.match!.score;
      if (a.match) return -1;
      if (b.match) return 1;
      return 0;
    });
  }, [advice]);

  const filtersOn = channels.length > 0 || goal !== null;

  const filtered = useMemo(() => {
    if (!filtersOn) return ranked;
    const matches = new Set(
      recommendLooks({ vertical, country, language, goal, channels }).map(
        (item) => item.look.id
      )
    );
    const strong = ranked.filter((item) => matches.has(item.look.id) && item.match);
    const rest = ranked.filter((item) => !strong.includes(item));
    return [...strong, ...rest];
  }, [ranked, filtersOn, goal, channels, vertical, country, language]);

  const visible = showAll ? filtered : filtered.slice(0, FIRST_PAGE);
  const sample = SAMPLE[vertical] ?? SAMPLE.seller;
  const best = advice[0];

  function toggleChannel(channel: BrandChannel) {
    setChannels((current) =>
      current.includes(channel)
        ? current.filter((item) => item !== channel)
        : [...current, channel]
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-300/80">
            <SwatchBook className="h-3 w-3" />
            Choose a look
          </p>
          <h3 className="mt-1 font-display text-sm font-semibold text-white">
            {BRAND_LOOKS.length} looks across 5 families
          </h3>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-white/50">
            A look is the palette <em>and</em> the frame: type, layout, motion
            pace and caption voice all travel with it. Pick one, or keep your
            own colours — the studio follows whatever is saved.
            {market && <> Tuned for {MARKET_LABEL[market]}.</>}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-white/8 bg-white/[0.02] px-2.5 py-1 text-[11px] tabular-nums text-white/50">
          {visible.length} shown · {BRAND_LOOKS.length} total
        </span>
      </div>

      {/* Filters */}
      <div className="mt-4 space-y-3">
        <FilterRow label="What is this campaign for?">
          {BRAND_GOALS.map((item) => (
            <FilterChip
              key={item.value}
              label={item.label}
              hint={item.hint}
              active={goal === item.value}
              onClick={() => setGoal(goal === item.value ? null : item.value)}
            />
          ))}
        </FilterRow>
        <FilterRow label="Where is it going first?">
          {BRAND_CHANNELS.map((item) => (
            <FilterChip
              key={item.value}
              label={item.label}
              hint={item.hint}
              active={channels.includes(item.value)}
              onClick={() => toggleChannel(item.value)}
            />
          ))}
        </FilterRow>
      </div>

      {/* Advisor */}
      {best && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-teal-400/20 bg-teal-500/[0.06] p-3.5 sm:flex-row sm:items-center">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-500/15 text-teal-200">
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold text-teal-100">
              Style advisor suggests {best.look.name}
              {goal && <> for {GOAL_LABEL[goal]}</>}
              {channels.length > 0 && (
                <> · {channels.map((channel) => CHANNEL_LABEL[channel]).join(", ")}</>
              )}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-white/40">
              {best.reasons.join(" · ") || best.look.why}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onPick(best.look)}
            disabled={selected?.id === best.look.id}
            className="shrink-0 rounded-lg border border-teal-400/30 bg-teal-500/10 px-3 py-2 text-[11px] font-semibold text-teal-100 transition-colors hover:border-teal-300/50 hover:bg-teal-500/20 disabled:cursor-default disabled:opacity-45 touch-target"
          >
            {selected?.id === best.look.id ? "Already applied" : "Apply this look"}
          </button>
        </div>
      )}

      {/* Gallery */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {visible.map((item) => {
          const active = selected?.id === item.look.id;
          return (
            <LookCard
              key={item.look.id}
              look={item.look}
              sample={sample}
              active={active}
              recommended={Boolean(item.match) && item.score >= 85}
              score={item.score}
              reasons={item.reasons}
              contrast={paletteContrast(item.look.primary, item.look.secondary)}
              readable={readabilityScore(item.look)}
              onPick={onPick}
            />
          );
        })}
      </div>

      {filtered.length > FIRST_PAGE && (
        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-[11px] font-semibold text-white/55 transition-colors hover:border-white/25 hover:text-white/80 touch-target"
        >
          {showAll
            ? "Show fewer"
            : `Show all ${filtered.length} looks (${filtered.length - FIRST_PAGE} more)`}
        </button>
      )}

      {!selected && (
        <p className="mt-3 text-xs leading-relaxed text-white/50">
          Your kit uses its own palette right now. The studio still gives it a
          frame from your voice — pick a look above to make the type, layout and
          pace match it too.
        </p>
      )}
    </div>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] uppercase tracking-widest text-white/45">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterChip({
  label,
  hint,
  active,
  onClick,
}: {
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={hint}
      className={cn(
        "rounded-full border px-2.5 py-1.5 text-[11px] font-medium transition-colors touch-target",
        active
          ? "border-amber-400/40 bg-amber-500/10 text-amber-100"
          : "border-white/8 bg-white/[0.02] text-white/40 hover:border-white/20 hover:text-white/70"
      )}
    >
      {label}
    </button>
  );
}

function LookCard({
  look,
  sample,
  active,
  recommended,
  score,
  reasons,
  contrast,
  readable,
  onPick,
}: {
  look: BrandLook;
  sample: { headline: string; price: string; offer: string };
  active: boolean;
  recommended: boolean;
  score: number;
  reasons: string[];
  contrast: number;
  readable: number;
  onPick: (look: BrandLook) => void;
}) {
  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border transition-colors",
        active
          ? "border-amber-400/45 bg-amber-500/[0.06]"
          : "border-white/8 bg-white/[0.02] hover:border-white/20"
      )}
    >
      <div
        className="relative aspect-[4/3] overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(158deg, ${look.secondary}, ${shadeHex(
            look.secondary,
            -0.35
          )})`,
        }}
      >
        {look.layout === "corporate" && (
          <span
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, rgba(255,255,255,0.5) 0 1px, transparent 1px 26px)",
            }}
            aria-hidden="true"
          />
        )}
        {look.layout === "street" && (
          <span
            className="absolute -left-6 top-1/3 h-16 w-[140%] -rotate-[14deg] opacity-25"
            style={{ backgroundColor: look.accent }}
            aria-hidden="true"
          />
        )}

        <div className="relative flex h-full flex-col p-3">
          <span
            className="self-start rounded-sm px-1.5 py-0.5 text-[8px] font-bold tracking-widest"
            style={{
              backgroundColor: look.accent,
              color: inkOn(look.accent),
            }}
          >
            {caseFor(sample.offer, look.casing)}
          </span>
          <p
            className={cn("mt-auto text-white", FACE_CLASS[look.face])}
            style={{
              fontWeight: look.headlineWeight,
              letterSpacing: `${look.tracking}em`,
              fontSize: look.layout === "editorial" ? "17px" : "21px",
              lineHeight: 1.06,
            }}
          >
            {caseFor(sample.headline, look.casing)}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5">
            <span
              className="rounded-full px-1.5 py-0.5 text-[8px] font-bold"
              style={{ backgroundColor: look.primary, color: "#0A0A0F" }}
            >
              {sample.price}
            </span>
            <span className="ml-auto flex -space-x-1">
              <span
                className="h-3 w-3 rounded-full border border-black/40"
                style={{ backgroundColor: look.primary }}
              />
              <span
                className="h-3 w-3 rounded-full border border-black/40"
                style={{ backgroundColor: look.secondary }}
              />
              <span
                className="h-3 w-3 rounded-full border border-black/40"
                style={{ backgroundColor: look.accent }}
              />
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-white/85">{look.name}</p>
            <p className="mt-0.5 truncate text-[11px] uppercase tracking-widest text-white/45">
              {look.family} · {look.tone}
            </p>
          </div>
          {active ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[11px] font-bold text-amber-200">
              <Check className="h-2.5 w-2.5" />
              In use
            </span>
          ) : recommended ? (
            <span className="shrink-0 rounded-full border border-teal-400/25 bg-teal-500/10 px-2 py-0.5 text-[11px] font-bold tabular-nums text-teal-300">
              {score}% match
            </span>
          ) : null}
        </div>

        <p className="mt-1.5 text-xs leading-relaxed text-white/45">{look.promise}</p>

        {reasons.length > 0 && (
          <ul className="mt-1.5 space-y-0.5">
            {reasons.map((reason) => (
              <li key={reason} className="text-[11px] leading-relaxed text-teal-200/60">
                · {reason}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-1.5 text-xs leading-relaxed text-white/45">
          Best for {look.bestFor.goals.map((item) => GOAL_LABEL[item]).join(", ")} ·{" "}
          {look.bestFor.channels.map((channel) => CHANNEL_LABEL[channel]).join(", ")}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2.5">
          <span className="text-[11px] tabular-nums text-white/45">
            Contrast {contrast.toFixed(1)}:1 · thumb score{" "}
            {Math.round(readable * 100)}
          </span>
          <button
            type="button"
            onClick={() => onPick(look)}
            aria-pressed={active}
            className={cn(
              "rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors touch-target",
              active
                ? "border-white/10 bg-white/5 text-white/40"
                : "border-amber-400/30 bg-amber-500/10 text-amber-200 hover:border-amber-300/60 hover:bg-amber-500/20"
            )}
          >
            {active ? "Applied" : "Use this look"}
          </button>
        </div>
      </div>
    </article>
  );
}
