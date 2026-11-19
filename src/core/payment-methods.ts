/**
 * What a customer can pay with, in our words. Provider names, service codes and
 * signing never reach this file: the browser only ever sees a tender.
 */
export const PAYMENT_TENDER_IDS = ["mobile_money", "card"] as const;

export type PaymentTenderId = (typeof PAYMENT_TENDER_IDS)[number];

export interface GhanaMobileMoneyNetwork {
  id: string;
  label: string;
  prefixes: readonly string[];
}

/** Live Ghana prefixes. The provider tells us the operator; this is display only. */
export const GHANA_MOBILE_MONEY_NETWORKS: readonly GhanaMobileMoneyNetwork[] = [
  { id: "mtn", label: "MTN Mobile Money", prefixes: ["024", "054", "055", "059"] },
  { id: "telecel", label: "Telecel Cash", prefixes: ["020", "050"] },
  { id: "at", label: "AT Money", prefixes: ["026", "027", "056", "057"] },
];

export interface PaymentTender {
  id: PaymentTenderId;
  label: string;
  detail: string;
  status: "available" | "coming_soon";
  /** Short chips shown under the tender, never provider names. */
  methods: readonly string[];
}

export const PAYMENT_TENDERS: readonly PaymentTender[] = [
  {
    id: "mobile_money",
    label: "Mobile Money",
    detail: "Pay from your MTN, Telecel or AT wallet.",
    status: "available",
    methods: GHANA_MOBILE_MONEY_NETWORKS.map((network) => network.label),
  },
  {
    id: "card",
    label: "Debit or credit card",
    detail: "For customers without a mobile wallet — Visa and Mastercard.",
    status: "available",
    methods: ["Visa", "Mastercard"],
  },
];

export function isPaymentTender(value: string): value is PaymentTenderId {
  return (PAYMENT_TENDER_IDS as readonly string[]).includes(value);
}

/**
 * Accepts the shapes people actually type and returns the local 0XXXXXXXXX
 * form the provider expects, or null. Never persisted by the API.
 */
export function normalizeGhanaMsisdn(input: string): string | null {
  const digits = input.replace(/[^\d]/g, "");
  const local = digits.startsWith("233") ? `0${digits.slice(3)}` : digits;
  if (!/^0\d{9}$/.test(local)) return null;
  return local;
}

export function detectMobileMoneyNetwork(input: string): GhanaMobileMoneyNetwork | null {
  const local = normalizeGhanaMsisdn(input);
  if (!local) return null;
  const prefix = local.slice(0, 3);
  return (
    GHANA_MOBILE_MONEY_NETWORKS.find((network) => network.prefixes.includes(prefix)) ?? null
  );
}

/** Grouped the way a Ghanaian reads their own number: 024 123 4567. */
export function formatGhanaMsisdn(input: string): string {
  const local = normalizeGhanaMsisdn(input);
  if (!local) return input.trim();
  return `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
}

/**
 * The provider answers with its own word for the network (`MTN`, `TELECEL`,
 * `AIRTEL`, and older rows still say `VODAFONE`). Prefix detection is a guess;
 * this is the answer, so it wins whenever the two disagree.
 */
export function networkFromProviderHint(hint: string): GhanaMobileMoneyNetwork | null {
  const word = hint.toUpperCase().replace(/[^A-Z]/g, "");
  if (!word) return null;
  if (word.includes("MTN") || word.includes("MOKPO")) {
    return GHANA_MOBILE_MONEY_NETWORKS.find((network) => network.id === "mtn") ?? null;
  }
  if (word.includes("TELECEL") || word.includes("VODAFONE")) {
    return GHANA_MOBILE_MONEY_NETWORKS.find((network) => network.id === "telecel") ?? null;
  }
  if (word.includes("AIRTEL") || word.includes("ATMONEY") || word === "AT") {
    return GHANA_MOBILE_MONEY_NETWORKS.find((network) => network.id === "at") ?? null;
  }
  return null;
}
