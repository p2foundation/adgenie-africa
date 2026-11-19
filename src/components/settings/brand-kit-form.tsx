"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Palette, Save } from "lucide-react";
import type { BrandLook } from "@adgenie/core";
import { fieldClass, formErrorClass, labelClass } from "@/components/auth/fields";
import { LookGallery } from "@/components/settings/look-gallery";
import { DirectionDeck } from "@/components/studio/direction-deck";
import { useAssistantContext } from "@/components/assistant/assistant-provider";
import type { AssistantContext } from "@/lib/assistant";
import {
  ApiError,
  api,
  type BrandKit,
  type CreativeDirection,
  type CreativeEngine,
} from "@/lib/api";
import {
  FACE_CLASS,
  caseFor,
  enginesFor,
  lookOf,
  productsFor,
  type StudioVertical,
} from "@/lib/studio";
import { cn } from "@/lib/utils";

const TONES = [
  { value: "casual", label: "Casual", hint: "Warm, everyday" },
  { value: "professional", label: "Professional", hint: "Clear, composed" },
  { value: "corporate", label: "Corporate", hint: "Logo-led, formal" },
  { value: "playful", label: "Playful", hint: "Loud, bright" },
  { value: "luxury", label: "Luxury", hint: "Slow, restrained" },
] as const;

const DEFAULTS: Record<
  StudioVertical,
  { primary: string; secondary: string; tone: Tone }
> = {
  seller: { primary: "#FBBF24", secondary: "#7C2D12", tone: "casual" },
  company: { primary: "#60A5FA", secondary: "#0F172A", tone: "corporate" },
  fashion: { primary: "#E3B341", secondary: "#2A1E12", tone: "luxury" },
  spot: { primary: "#FACC15", secondary: "#4C1D95", tone: "playful" },
};

const SAMPLE: Record<StudioVertical, { headline: string; price: string; offer: string }> = {
  seller: { headline: "New season", price: "from GH¢ 180", offer: "New drop" },
  company: { headline: "Built to deliver", price: "since 2019", offer: "Trusted" },
  fashion: { headline: "The piece everyone asks about", price: "from GH¢ 240", offer: "Lookbook" },
  spot: { headline: "Friday night", price: "GH¢ 80", offer: "Doors 7pm" },
};

type Tone = (typeof TONES)[number]["value"];

const LANE_NAME: Record<StudioVertical, string> = {
  seller: "market",
  company: "company",
  fashion: "fashion",
  spot: "event",
};

const HEX = /^#[0-9A-Fa-f]{6}$/;

function inkFor(hex: string) {
  const [r, g, b] = [1, 3, 5].map(
    (index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255
  );
  const luminance = 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
  return luminance > 0.6 ? "dark" : "light";
}

export function BrandKitForm({
  kit,
  vertical = "seller",
  country = null,
  language = "en",
}: {
  kit: BrandKit | null;
  vertical?: StudioVertical;
  country?: string | null;
  language?: string;
}) {
  const router = useRouter();
  const fallback = DEFAULTS[vertical] ?? DEFAULTS.seller;
  const [name, setName] = useState(kit?.name ?? "");
  const [logoUrl, setLogoUrl] = useState(kit?.logoUrl ?? "");
  const [primary, setPrimary] = useState(kit?.primaryColor ?? fallback.primary);
  const [secondary, setSecondary] = useState(kit?.secondaryColor ?? fallback.secondary);
  const [whatsapp, setWhatsapp] = useState(kit?.whatsappNumber ?? "");
  const [website, setWebsite] = useState(kit?.websiteUrl ?? "");
  const [tone, setTone] = useState<Tone>(
    (kit?.tone as Tone | null) ?? fallback.tone
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [direction, setDirection] = useState<CreativeDirection>(() => {
    const look = lookOf(kit);
    return {
      engines: ["image", "spin"],
      motionHook: look.hook,
      motionPace: look.pace,
      spinAudience: "women",
      spinProduct: productsFor(vertical)[0]?.value ?? "outfit",
      spinMode: "mannequin",
    };
  });

  const colorsValid = HEX.test(primary) && HEX.test(secondary);
  const valid = name.trim().length > 0 && colorsValid;
  const initials =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase() || "AG";

  const liveKit: BrandKit = {
    id: kit?.id ?? "preview",
    name: name.trim() || "Your brand",
    logoUrl: logoUrl.trim() || null,
    primaryColor: HEX.test(primary) ? primary : null,
    secondaryColor: HEX.test(secondary) ? secondary : null,
    whatsappNumber: whatsapp.trim() || null,
    websiteUrl: website.trim() || null,
    tone,
    createdAt: kit?.createdAt ?? "",
  };

  const sample = SAMPLE[vertical] ?? SAMPLE.seller;
  const liveLook = lookOf(liveKit);

  // Genie answers from the kit as it is being edited, not only the saved one:
  // "does this voice fit my shop?" should follow what is on the screen.
  const genieContext = useMemo<AssistantContext>(
    () => ({
      screen: "settings",
      language,
      vertical,
      brand: {
        name: liveKit.name,
        tone,
        look: liveLook.name,
        primary: liveKit.primaryColor ?? undefined,
        secondary: liveKit.secondaryColor ?? undefined,
      },
    }),
    [
      language,
      vertical,
      tone,
      liveLook.name,
      liveKit.name,
      liveKit.primaryColor,
      liveKit.secondaryColor,
    ]
  );
  useAssistantContext(genieContext);
  const laneTone = fallback.tone;
  const suggestedTone = TONES.find((item) => item.value === laneTone) ?? TONES[0];
  const engineNames = enginesFor(vertical)
    .map((engine) => engine.label)
    .join(" · ");
  const checks = [
    { label: "Brand name", done: name.trim().length > 0 },
    { label: "Valid colours", done: colorsValid },
    { label: "Voice chosen", done: true },
    { label: "WhatsApp or site", done: Boolean(whatsapp.trim() || website.trim()) },
    { label: "Logo file", done: Boolean(logoUrl.trim()) },
  ];
  const ready = checks.filter((check) => check.done).length;
  const ctaInk = HEX.test(primary) ? inkFor(primary) : "dark";

  function includeEngine(engine: CreativeEngine) {
    setDirection((current) =>
      current.engines.includes(engine)
        ? current
        : { ...current, engines: [...current.engines, engine] }
    );
  }

  function applyLook(look: BrandLook) {
    setPrimary(look.primary);
    setSecondary(look.secondary);
    setTone(look.tone);
    setDirection((current) => ({
      ...current,
      motionHook: look.motionHook,
      motionPace: look.motionPace,
    }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!valid) return;

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      await api<BrandKit>("/account/brand-kit", {
        method: "PUT",
        body: {
          name: name.trim(),
          logo_url: logoUrl.trim(),
          primary_color: primary,
          secondary_color: secondary,
          whatsapp_number: whatsapp.trim(),
          website_url: website.trim(),
          tone,
        },
      });
      router.refresh();
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2600);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save your brand kit.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      id="brand"
      className="glass-card scroll-mt-[calc(208px_+_env(safe-area-inset-top))] overflow-hidden rounded-2xl lg:scroll-mt-24"
      aria-labelledby="brand-title"
    >
      <div className="flex items-center gap-3 border-b border-white/6 px-5 py-4 md:px-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
          <Palette className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 id="brand-title" className="font-display text-sm font-semibold text-white">
            Brand kit
          </h2>
          <p className="mt-0.5 text-[11px] text-white/50">
            One kit feeds {engineNames}. Colours, voice and contact details carry
            into every scene.
          </p>
        </div>
        <span
          className={cn(
            "ml-auto shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
            ready === checks.length
              ? "border-teal-400/25 bg-teal-500/10 text-teal-300"
              : "border-white/10 bg-white/[0.03] text-white/45"
          )}
        >
          {ready}/{checks.length} ready
        </span>
      </div>

      <form onSubmit={save} className="p-5 md:p-6">
        {error && <p className={formErrorClass}>{error}</p>}

        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_264px]">
          <div className="min-w-0 space-y-5">
            <div>
              <label htmlFor="brand-name" className={labelClass}>
                Brand name
              </label>
              <input
                id="brand-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={80}
                required
                className={fieldClass}
                placeholder="Kofi's Kitchen"
              />
            </div>

            <div>
              <span className={labelClass}>Voice</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {TONES.map((item) => {
                  const active = tone === item.value;
                  const suggested = item.value === laneTone;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setTone(item.value)}
                      aria-pressed={active}
                      className={cn(
                        "relative rounded-xl border px-3 py-2.5 text-left transition-colors touch-target",
                        active
                          ? "border-amber-400/30 bg-amber-500/[0.08] text-amber-100"
                          : "border-white/8 bg-white/[0.02] text-white/45 hover:border-white/15 hover:text-white/70"
                      )}
                    >
                      {suggested && (
                        <span
                          className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-teal-400"
                          title="Suggested for your lane"
                        />
                      )}
                      <span className="block text-xs font-semibold">{item.label}</span>
                      <span className="mt-0.5 block text-[11px] text-white/50">{item.hint}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-relaxed text-white/50">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
                  Suggested for a {LANE_NAME[vertical]} account
                </span>
                {tone !== laneTone && (
                  <button
                    type="button"
                    onClick={() => setTone(laneTone)}
                    className="touch-target inline-flex items-center rounded-lg px-2 font-semibold text-amber-300/80 underline-offset-2 transition-colors hover:text-amber-200 hover:underline"
                  >
                    Use {suggestedTone.label}
                  </button>
                )}
              </p>
            </div>

            <div>
              <span className={labelClass}>Brand colours</span>
              <div className="grid gap-2 sm:grid-cols-2">
                <ColorField
                  label="Primary"
                  role="CTA, price, offer"
                  value={primary}
                  onChange={setPrimary}
                />
                <ColorField
                  label="Secondary"
                  role="Scenes, backgrounds"
                  value={secondary}
                  onChange={setSecondary}
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.02] px-2.5 py-1 text-[11px] text-white/50">
                  CTA ink: {ctaInk}
                  <span
                    className="h-2.5 w-2.5 rounded-full border border-white/20"
                    style={{
                      backgroundColor: HEX.test(primary)
                        ? primary
                        : fallback.primary,
                    }}
                  />
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]",
                    liveLook.look
                      ? "border-amber-400/25 bg-amber-500/10 text-amber-200/85"
                      : "border-white/8 bg-white/[0.02] text-white/50"
                  )}
                >
                  {liveLook.look ? "Look: " : "Frame: "}
                  {liveLook.name} · {liveLook.family}
                </span>
              </div>
              {!colorsValid && (
                <p className="mt-2 text-[11px] text-rose-300/80">
                  Colours need six-digit hex values, like #FBBF24.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/8 bg-white/[0.015] p-4">
              <LookGallery
                vertical={vertical}
                country={country}
                language={language}
                primary={primary}
                secondary={secondary}
                onPick={applyLook}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="logo-url" className={labelClass}>
                  Logo URL <span className="font-normal text-white/45">(optional)</span>
                </label>
                <input
                  id="logo-url"
                  type="url"
                  value={logoUrl}
                  onChange={(event) => setLogoUrl(event.target.value)}
                  className={fieldClass}
                  placeholder="https://…/logo.png"
                />
              </div>
              <div>
                <label htmlFor="whatsapp" className={labelClass}>
                  WhatsApp number
                </label>
                <input
                  id="whatsapp"
                  type="tel"
                  value={whatsapp}
                  onChange={(event) => setWhatsapp(event.target.value)}
                  className={fieldClass}
                  placeholder="+233 24 000 0000"
                />
              </div>
              <div>
                <label htmlFor="website" className={labelClass}>
                  Website
                </label>
                <input
                  id="website"
                  type="url"
                  value={website}
                  onChange={(event) => setWebsite(event.target.value)}
                  className={fieldClass}
                  placeholder="https://…"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/6 pt-4">
              <p className="text-[11px] text-white/45">
                Stored on your account. Never shared with other clients.
              </p>
              <div className="flex items-center gap-3">
                {saved && <span className="text-xs text-teal-300/80">Saved</span>}
                <button
                  type="submit"
                  disabled={saving || !valid}
                  className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 touch-target"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save brand kit
                </button>
              </div>
            </div>
          </div>

          <aside
            className="order-first w-full max-w-48 justify-self-center 2xl:order-last 2xl:w-auto 2xl:max-w-none 2xl:justify-self-stretch"
            aria-label="Brand kit preview"
          >
            <div
              className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-white/10 p-4"
              style={{
                backgroundImage: `linear-gradient(150deg, ${
                  HEX.test(primary) ? primary : fallback.primary
                }, ${HEX.test(secondary) ? secondary : fallback.secondary})`,
              }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.28),transparent_45%),linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.55))]" />
              <div className="relative flex h-full flex-col">
                {logoUrl.trim().startsWith("http") ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={logoUrl.trim()}
                    alt=""
                    className="h-11 w-auto max-w-[70%] rounded-lg border border-white/20 bg-white/10 object-contain p-1 backdrop-blur-sm"
                  />
                ) : (
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/25 bg-white/10 font-display text-sm font-bold text-white backdrop-blur-sm">
                    {initials}
                  </span>
                )}
                <p
                  className={cn(
                    "mt-auto leading-[1.05] text-white",
                    FACE_CLASS[liveLook.face]
                  )}
                  style={{
                    fontWeight: liveLook.headlineWeight,
                    letterSpacing: `${liveLook.tracking}em`,
                    fontSize: liveLook.layout === "editorial" ? "17px" : "20px",
                  }}
                >
                  {caseFor(name.trim() || "Your brand", liveLook.casing)}
                </p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
                  {liveLook.look ? `${liveLook.name} · ` : ""}
                  {TONES.find((item) => item.value === tone)?.label ?? "Casual"} voice
                </p>
                <p className="mt-0.5 text-[11px] uppercase tracking-wider text-white/40">
                  {engineNames}
                </p>
                <div className="mt-3 flex items-center gap-1.5">
                  <span
                    className="h-4 w-4 rounded-full border border-white/40"
                    style={{ backgroundColor: HEX.test(primary) ? primary : fallback.primary }}
                  />
                  <span
                    className="h-4 w-4 rounded-full border border-white/40"
                    style={{ backgroundColor: HEX.test(secondary) ? secondary : fallback.secondary }}
                  />
                  <span
                    className="ml-auto max-w-[52%] truncate rounded-full px-2 py-0.5 text-[11px] font-bold"
                    style={{
                      backgroundColor: HEX.test(primary) ? primary : fallback.primary,
                      color: ctaInk === "dark" ? "#0A0A0F" : "#FFFFFF",
                    }}
                  >
                    {caseFor(sample.offer, "upper")}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-white/8 bg-white/[0.02] p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-white/50">
                  Ready to publish
                </p>
                <span className="text-[11px] tabular-nums text-white/45">
                  {ready}/{checks.length}
                </span>
              </div>
              <ul className="mt-2 space-y-1">
                {checks.map((check) => (
                  <li
                    key={check.label}
                    className={cn(
                      "flex items-center gap-1.5 text-[11px]",
                      check.done ? "text-white/45" : "text-white/45"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-3.5 w-3.5 items-center justify-center rounded-full border",
                        check.done
                          ? "border-teal-400/30 bg-teal-500/10 text-teal-300"
                          : "border-white/10 text-transparent"
                      )}
                    >
                      <Check className="h-2.5 w-2.5" />
                    </span>
                    {check.label}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </form>

      <div className="border-t border-white/6 p-5 md:p-6">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-300/80">
              From one kit
            </p>
            <h3 className="mt-1 font-display text-sm font-semibold text-white">
              See the kit in {engineNames}
            </h3>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-white/50">
              The kit sets the defaults; each campaign picks its engines. Try
              the tabs — the spin stage turns, the cut plays.
            </p>
          </div>
          <span className="rounded-full border border-white/8 bg-white/[0.02] px-2.5 py-1 text-[11px] text-white/50">
            Live preview · unsaved changes included
          </span>
        </div>

        <DirectionDeck
          wide
          kit={liveKit}
          vertical={vertical}
          businessName={name.trim() || "Your brand"}
          headline={sample.headline}
          priceLabel={sample.price}
          offerLabel={sample.offer}
          language={language}
          creative={direction}
          onChange={(patch) =>
            setDirection((current) => ({ ...current, ...patch }))
          }
          onInclude={includeEngine}
        />
      </div>
    </section>
  );
}

function ColorField({
  label,
  role,
  value,
  onChange,
}: {
  label: string;
  role: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const valid = HEX.test(value);
  return (
    <div>
      <span className="mb-1 flex items-baseline justify-between gap-2">
        <span className="text-[11px] uppercase tracking-widest text-white/45">
          {label}
        </span>
        <span className="truncate text-[11px] text-white/45">{role}</span>
      </span>
      <div
        className={cn(
          "flex items-center gap-2 rounded-xl border bg-white/[0.03] p-1.5 transition-colors",
          valid ? "border-white/10" : "border-rose-400/35"
        )}
      >
        <input
          type="color"
          aria-label={`${label} colour picker`}
          value={valid ? value : "#FBBF24"}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="h-11 w-11 cursor-pointer rounded-lg border-0 bg-transparent p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-0 [&::-moz-color-swatch]:rounded-md [&::-moz-color-swatch]:border-0"
        />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          maxLength={7}
          spellCheck={false}
          aria-label={`${label} hex value`}
          className="min-h-[44px] min-w-0 flex-1 bg-transparent font-mono text-xs uppercase text-white/70 outline-none placeholder:text-white/45"
          placeholder="#FBBF24"
        />
      </div>
    </div>
  );
}
