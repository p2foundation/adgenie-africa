"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, Save, UserRound } from "lucide-react";
import { CURRENCIES, currencyForCountry, currencyLabel } from "@adgenie/core";
import { fieldClass, formErrorClass, labelClass } from "@/components/auth/fields";
import { CountrySelect } from "@/components/ui/country-select";
import { ApiError, api, type Profile } from "@/lib/api";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "tw", label: "Twi (beta)" },
  { value: "gaa", label: "Ga (beta)" },
];

const VERTICALS = [
  { value: "", label: "No lane yet" },
  { value: "seller", label: "Market seller" },
  { value: "company", label: "Company" },
  { value: "fashion", label: "Fashion & beauty" },
  { value: "spot", label: "Spot & event" },
];

export function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [language, setLanguage] = useState(profile.language);
  const [vertical, setVertical] = useState(profile.vertical ?? "");
  const [country, setCountry] = useState(profile.country ?? "");
  const [currency, setCurrency] = useState(profile.currency ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const currencyOptions = [
    { value: "", label: `Auto — ${currencyLabel(currencyForCountry(country || null))}` },
    ...CURRENCIES.map((code) => ({ value: code, label: currencyLabel(code) })),
  ];

  const changed =
    displayName.trim() !== (profile.displayName ?? "") ||
    phone.trim() !== (profile.phone ?? "") ||
    language !== profile.language ||
    (vertical || null) !== profile.vertical ||
    (country || null) !== profile.country ||
    (currency || null) !== profile.currency;
  const phoneOk = phone.trim() === "" || /^\+?[\d\s-]{7,20}$/.test(phone.trim());
  const valid = displayName.trim().length >= 2 && phoneOk;

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || !changed) return;

    setSaving(true);
    setError(null);
    setSaved(false);

    const body: Record<string, unknown> = {};
    if (displayName.trim() !== (profile.displayName ?? "")) body.display_name = displayName.trim();
    if (phone.trim() !== (profile.phone ?? "")) body.phone = phone.trim();
    if (language !== profile.language) body.language = language;
    if ((vertical || null) !== profile.vertical) body.vertical = vertical || null;
    if ((country || null) !== profile.country) body.country = country || null;
    if ((currency || null) !== profile.currency) body.currency = currency || null;

    try {
      await api<Profile>("/account/profile", { method: "PATCH", body });
      router.refresh();
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2600);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      id="profile"
      className="glass-card scroll-mt-[calc(208px_+_env(safe-area-inset-top))] overflow-hidden rounded-2xl lg:scroll-mt-24"
      aria-labelledby="profile-title"
    >
      <div className="flex items-center gap-3 border-b border-white/6 px-5 py-4 md:px-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300">
          <UserRound className="h-4 w-4" />
        </span>
        <div>
          <h2 id="profile-title" className="font-display text-sm font-semibold text-white">
            Profile
          </h2>
          <p className="mt-0.5 text-[11px] text-white/50">How the studio greets you.</p>
        </div>
      </div>

      <form onSubmit={save} className="space-y-5 p-5 md:p-6">
        {error && <p className={formErrorClass}>{error}</p>}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="display-name" className={labelClass}>
              Display name
            </label>
            <input
              id="display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={80}
              required
              className={fieldClass}
              placeholder="Kofi Mensah"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="profile-phone" className={labelClass}>
              Phone
            </label>
            <input
              id="profile-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              maxLength={20}
              className={fieldClass}
              placeholder="024 123 4567"
            />
            <span className="mt-1.5 block text-[11px] text-white/50">
              {phoneOk
                ? "The number we offer back to you when you pay with Mobile Money, and how staff can reach you about a payment."
                : "Use digits, spaces and an optional +."}
            </span>
          </div>

          <SelectField
            id="language"
            label="Language"
            value={language}
            onChange={setLanguage}
            options={LANGUAGES}
          />
          <SelectField
            id="vertical"
            label="Usual lane"
            value={vertical}
            onChange={setVertical}
            options={VERTICALS}
          />
          <div>
            <label htmlFor="country" className={labelClass}>
              Country
            </label>
            <CountrySelect
              id="country"
              value={country || null}
              onChange={(code) => setCountry(code ?? "")}
              placeholder="Not set"
              clearLabel="Not set"
            />
          </div>
          <SelectField
            id="currency"
            label="Display currency"
            value={currency}
            onChange={setCurrency}
            options={currencyOptions}
          />
        </div>

        <p className="text-xs leading-relaxed text-white/50">
          Country and display currency change how prices are shown. You are
          always charged in Ghana cedis; the converted figure is indicative.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/6 pt-4">
          <p className="text-[11px] text-white/45">
            Language applies to new campaigns. Twi and Ga are beta.
          </p>
          <div className="flex items-center gap-3">
            {saved && <span className="text-xs text-teal-300/80">Saved</span>}
            <button
              type="submit"
              disabled={saving || !changed || !valid}
              className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 touch-target"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save profile
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(fieldClass, "appearance-none pr-10 [&>option]:bg-[#0a0d1c]")}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
      </div>
    </div>
  );
}
