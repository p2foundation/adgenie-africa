/**
 * Credit plans — SRS ch.16 hybrid model.
 * All amounts in GHS pesewas (1 GHS = 100 pesewas).
 * price_pesewas is the shelf price the user is actually charged (VAT inclusive).
 * price_ex_vat_pesewas is the pre-VAT figure kept for accounting display only.
 */

export type PlanInterval = "monthly" | "one_time";

export interface Plan {
  code: string;
  name: string;
  interval: PlanInterval;
  credits: number;
  price_pesewas: number;
  price_ex_vat_pesewas: number;
  description: string;
}

export const PLANS = {
  starter: {
    code: "starter",
    name: "Starter",
    interval: "monthly",
    credits: 120,
    price_pesewas: 16900,
    price_ex_vat_pesewas: 14100,
    description: "For a seller testing the waters",
  },
  growth: {
    code: "growth",
    name: "Growth",
    interval: "monthly",
    credits: 350,
    price_pesewas: 40800,
    price_ex_vat_pesewas: 34000,
    description: "For active sellers and creators",
  },
  business: {
    code: "business",
    name: "Business",
    interval: "monthly",
    credits: 1000,
    price_pesewas: 111100,
    price_ex_vat_pesewas: 92600,
    description: "For companies running campaigns",
  },
  topup: {
    code: "topup",
    name: "Top-up",
    interval: "one_time",
    credits: 60,
    price_pesewas: 8400,
    price_ex_vat_pesewas: 7000,
    description: "Quick one-time top-up, never expires",
  },
} as const;

export type PlanCode = keyof typeof PLANS;

/** VAT rate for Ghana */
export const VAT_RATE = 0.2;

export function priceWithVat(pesewas: number): number {
  return Math.round(pesewas * (1 + VAT_RATE));
}

export function formatGhs(pesewas: number): string {
  const cedis = (pesewas / 100).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `GH¢${cedis}`;
}

/** Sign-up free credit grant (only after email or phone is verified) */
export const FREE_CREDIT_GRANT = 10;

/** Daily generation cap per user (credits) */
export const DAILY_GENERATION_CAP = 200;

/** Generation kinds that may never be paid for with free credits */
export const FREE_CREDIT_BLOCKED_KINDS = ["video"] as const;
