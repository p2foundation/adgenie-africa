/**
 * Display currency for prices.
 *
 * Money is earned, spent and charged in Ghana cedis. This module exists only so
 * a person outside Ghana can read a price in the money they think in — it never
 * changes what a payment row says. Every converted figure is shown next to the
 * cedi charge.
 *
 * The rate comes from `public.currency_rates` (units of currency per 1 GHS) and
 * is indicative, not a quote. If a rate is missing, prices fall back to the
 * cedi rather than inventing a number.
 */

import { COUNTRIES, type Country } from "./countries.generated";

export { COUNTRIES };
export type { Country };

export const CURRENCIES = ["GHS", "NGN", "XOF"] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

export interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  /** Put a space between the symbol and the number ("F CFA 8,486"). */
  spaceAfterSymbol: boolean;
  /** Minor-unit digits: pesewas for the cedi, whole naira and CFA francs. */
  decimals: number;
  /** The plural people say in a sentence: "approve the price in cedis". */
  noun: string;
  label: string;
  /** What one unit is called, singular. */
  unit: string;
}

export const CURRENCY_META: Record<CurrencyCode, CurrencyMeta> = {
  GHS: {
    code: "GHS",
    symbol: "GH¢",
    spaceAfterSymbol: false,
    decimals: 2,
    noun: "cedis",
    label: "Ghana cedi",
    unit: "cedi",
  },
  NGN: {
    code: "NGN",
    symbol: "₦",
    spaceAfterSymbol: false,
    decimals: 0,
    noun: "naira",
    label: "Nigerian naira",
    unit: "naira",
  },
  XOF: {
    code: "XOF",
    symbol: "F CFA",
    spaceAfterSymbol: true,
    decimals: 0,
    noun: "CFA francs",
    label: "West African CFA franc",
    unit: "CFA franc",
  },
};

export type CountryCode = (typeof COUNTRIES)[number]["code"];

const COUNTRY_BY_CODE = new Map<string, Country>(
  COUNTRIES.map((country) => [country.code, country] as const)
);

export function countryName(code: string | null | undefined): string | null {
  return code ? (COUNTRY_BY_CODE.get(code.toUpperCase())?.name ?? code) : null;
}

/** Public SVG flag, loaded only when a picker shows it. */
export function countryFlag(code: string | null | undefined): string | null {
  return code ? (COUNTRY_BY_CODE.get(code.toUpperCase())?.flag ?? null) : null;
}

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === "string" && (CURRENCIES as readonly string[]).includes(value);
}

export function isCountryCode(value: unknown): value is CountryCode {
  return typeof value === "string" && COUNTRY_BY_CODE.has(value.toUpperCase());
}

/**
 * Only cedi, naira and CFA francs have display rates. A customer anywhere else
 * still sees the price in cedis — the currency we actually charge.
 */
export function currencyForCountry(country: string | null | undefined): CurrencyCode {
  if (!country) return "GHS";
  const local = COUNTRY_BY_CODE.get(country.toUpperCase())?.currency;
  return local === "NGN" || local === "XOF" ? local : "GHS";
}

/**
 * An explicit Settings choice wins; otherwise the account's country decides.
 * GHS is the honest fallback when neither is known.
 */
export function resolveCurrency(input: {
  currency?: string | null;
  country?: string | null;
}): CurrencyCode {
  if (isCurrencyCode(input.currency)) return input.currency;
  return currencyForCountry(input.country);
}

/** Rates are units per 1 GHS. A missing rate means "show cedis". */
export type CurrencyRateTable = Partial<Record<CurrencyCode, number>>;

export function rateFor(currency: CurrencyCode, rates: CurrencyRateTable): number {
  if (currency === "GHS") return 1;
  const rate = rates[currency];
  return typeof rate === "number" && Number.isFinite(rate) && rate > 0 ? rate : 1;
}

export function convertFromPesewas(
  pesewas: number,
  currency: CurrencyCode,
  unitsPerGhs: number
): number {
  const factor = currency === "GHS" ? 1 : unitsPerGhs;
  const value = (pesewas / 100) * factor;
  const scale = 10 ** CURRENCY_META[currency].decimals;
  return Math.round(value * scale) / scale;
}

/** `formatGhs` in the active currency, using the same grouping as the cedi. */
export function formatMoney(
  pesewas: number,
  currency: CurrencyCode,
  unitsPerGhs = 1
): string {
  const meta = CURRENCY_META[currency];
  const value = convertFromPesewas(pesewas, currency, unitsPerGhs);
  const number = value.toLocaleString("en-GH", {
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  });
  return `${meta.symbol}${meta.spaceAfterSymbol ? " " : ""}${number}`;
}

/** The word for copy: "approve the price in cedis". */
export function currencyNoun(currency: CurrencyCode): string {
  return CURRENCY_META[currency].noun;
}

/** Settings labels: "Nigerian naira (₦)". */
export function currencyLabel(currency: CurrencyCode): string {
  const meta = CURRENCY_META[currency];
  return `${meta.label} (${meta.symbol.trim()})`;
}
