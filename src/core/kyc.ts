/**
 * Ghana KYC vocabulary and the client-side mirror of `public.kyc_submit()`.
 *
 * Postgres is the authority on whether a submission may proceed — this module
 * only predicts it, so the wizard can show what is still open while a person is
 * typing. The two must agree on the rules, so every check in
 * `kycStepProgress` has a matching branch in `public.kyc_submit()`
 * (supabase/migrations/20261022000000_kyc_ghana.sql).
 *
 * Labels are English only. Twi and Ga translations need a native speaker's
 * review before they appear here (00_MASTER_PROMPT.md).
 */

export const KYC_STATUSES = ["in_progress", "under_review", "verified", "rejected"] as const;
export type KycStatus = (typeof KYC_STATUSES)[number];

/**
 * `individual` is the market seller with no ORC registration: the Ghana Card is
 * the whole KYC. Informal trade is the majority of the market, so it is a
 * first-class option rather than a hole in the form.
 */
export const KYC_BUSINESS_TYPES = [
  "individual",
  "sole_proprietor",
  "partnership",
  "limited_company",
  "public_company",
  "cooperative",
] as const;
export type KycBusinessType = (typeof KYC_BUSINESS_TYPES)[number];

export const KYC_BUSINESS_TYPE_LABELS: Record<KycBusinessType, string> = {
  individual: "Just me — no registered business",
  sole_proprietor: "Sole proprietorship (Act 151 business name)",
  partnership: "Partnership",
  limited_company: "Private company limited by shares (LLC)",
  public_company: "Public company",
  cooperative: "Cooperative",
};

/** The 16 regions created by the 2018 referendum (Lawyer's + Oti, North East, Savannah, Ahafo, Bono, Bono East). */
export const GHANA_REGIONS = [
  "Ahafo",
  "Ashanti",
  "Bono",
  "Bono East",
  "Central",
  "Eastern",
  "Greater Accra",
  "North East",
  "Northern",
  "Oti",
  "Savannah",
  "Upper East",
  "Upper West",
  "Volta",
  "Western",
  "Western North",
] as const;
export type GhanaRegion = (typeof GHANA_REGIONS)[number];

export const KYC_PAYOUT_METHODS = ["momo", "bank"] as const;
export type KycPayoutMethod = (typeof KYC_PAYOUT_METHODS)[number];

/** Networks whose wallets a Ghana payout can reach. */
export const KYC_MOMO_NETWORKS = ["mtn_momo", "telecel_cash", "at_money"] as const;
export type KycMomoNetwork = (typeof KYC_MOMO_NETWORKS)[number];

export const KYC_MOMO_NETWORK_LABELS: Record<KycMomoNetwork, string> = {
  mtn_momo: "MTN MoMo",
  telecel_cash: "Telecel Cash",
  at_money: "AT Money",
};

export const KYC_DOCUMENT_KINDS = ["identity_document", "business_document"] as const;
export type KycDocumentKind = (typeof KYC_DOCUMENT_KINDS)[number];

export const KYC_DOCUMENT_LABELS: Record<KycDocumentKind, string> = {
  identity_document: "Ghana Card (photo side, readable)",
  business_document: "ORC certificate or business licence",
};

/** Low-bandwidth friendly: a phone photo of the card is enough, under 5 MB. */
export const KYC_MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const KYC_ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

/** Bump with the wording below: an old acceptance then stops counting. */
export const KYC_DECLARATION_VERSION = "2026-10";

export const KYC_DECLARATION_TEXT =
  "I confirm that the identity, business and payout details above are mine and true, " +
  "that I am authorised to receive payment for this business, and that the creative work " +
  "I upload is mine or used with the owner's permission. AdGenie may hold a campaign and " +
  "any payout while it checks these answers.";

export const KYC_STEPS = [
  { id: 1, key: "identity", title: "Who you are" },
  { id: 2, key: "business", title: "The business" },
  { id: 3, key: "payout", title: "Where the money lands" },
  { id: 4, key: "review", title: "Declaration and submit" },
] as const;
export type KycStepKey = (typeof KYC_STEPS)[number]["key"];

const GHANA_CARD_PIN = /^GHA-\d{9}-\d$/;

/** Accepts "GHA 123456789 0" / "gha1234567890" and returns the canonical shape. */
export function normaliseGhanaCardPin(value: string | null | undefined): string | null {
  const compact = value?.replace(/[\s-]/g, "").toUpperCase();
  if (!compact) return null;
  const match = /^GHA(\d{10})$/.exec(compact);
  const digits = match?.[1];
  if (!digits) return null;
  const formatted = `GHA-${digits.slice(0, 9)}-${digits.slice(9)}`;
  return GHANA_CARD_PIN.test(formatted) ? formatted : null;
}

/** A GRA company/organisation number: 7-13 digits. Individuals use the card PIN. */
export function isGhanaTaxId(value: string | null | undefined): boolean {
  if (!value) return false;
  return GHANA_CARD_PIN.test(value) || /^[0-9]{7,13}$/.test(value);
}

/**
 * Ghana numbers to E.164. Accepts 024…, 23324… and +233…; a local 10-digit
 * number becomes +233 plus the last nine.
 */
export function normaliseGhanaPhone(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  let national: string | null = null;
  if (digits.startsWith("00233")) national = digits.slice(5);
  else if (digits.startsWith("233") && digits.length >= 12) national = digits.slice(3);
  else if (digits.startsWith("0") && digits.length === 10) national = digits.slice(1);
  else if (digits.length === 9) national = digits;

  // A Ghana subscriber number never starts with 0 or 1 once the trunk prefix is
  // dropped, but it very often starts with 2: MTN's 024 and Telecel's 020 are the
  // two most common prefixes in the country, so excluding 2 would reject the
  // majority of real wallets.
  if (national && /^[2-9][0-9]{8}$/.test(national)) return `+233${national}`;

  // Not a Ghana mobile: keep a well-formed international number as typed.
  if (trimmed.startsWith("+") && /^[+][0-9]{8,15}$/.test(trimmed)) return trimmed;
  return null;
}

export interface KycFields {
  legal_name?: string | null;
  /** ISO 3166-1 alpha-2; also the default display currency. */
  country?: string | null;
  ghana_card_pin?: string | null;
  date_of_birth?: string | null;
  business_type?: KycBusinessType | null;
  business_name?: string | null;
  registration_number?: string | null;
  tax_id?: string | null;
  region?: string | null;
  city?: string | null;
  phone_e164?: string | null;
  whatsapp_e164?: string | null;
  payout_method?: KycPayoutMethod | null;
  payout_network?: KycMomoNetwork | null;
  payout_number?: string | null;
  payout_account_name?: string | null;
  bank_name?: string | null;
  declaration_accepted?: boolean | null;
  declaration_version?: string | null;
}

export interface KycDocumentsPresent {
  identity_document: boolean;
  business_document: boolean;
}

/**
 * Human names for the field keys `kyc_submit()` reports, so a 400 from the API
 * can be read by a person rather than a developer.
 */
export const KYC_FIELD_LABELS: Record<string, string> = {
  legal_name: "your name as it appears on the Ghana Card",
  country: "your country",
  ghana_card_pin: "Ghana Card PIN",
  date_of_birth: "date of birth",
  identity_document: "photo of your Ghana Card",
  business_type: "type of business",
  business_name: "business name",
  registration_number: "ORC registration number",
  business_document: "copy of your registration document",
  tax_id: "TIN or Ghana Card PIN",
  region: "region",
  city: "city or town",
  address: "where you trade",
  sector: "sector",
  website_url: "website or social page",
  phone_e164: "phone number",
  whatsapp_e164: "WhatsApp number",
  payout_method: "how we should pay you",
  payout_number: "payout number or account number",
  payout_account_name: "account holder name",
  payout_network: "mobile money network",
  bank_name: "bank name",
  declaration: "the declaration",
};

export function kycFieldLabel(field: string): string {
  return KYC_FIELD_LABELS[field] ?? field;
}

export interface KycStepState {
  id: number;
  key: KycStepKey;
  title: string;
  missing: string[];
  complete: boolean;
}

function filled(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim() !== "";
}

/**
 * Gaps grouped by wizard step. Field names are the API names so a rejection
 * message from Postgres maps straight onto the form.
 */
export function kycStepProgress(
  fields: KycFields,
  documents: KycDocumentsPresent = { identity_document: false, business_document: false }
): KycStepState[] {
  const registered =
    fields.business_type !== null &&
    fields.business_type !== undefined &&
    fields.business_type !== "individual";

  const identity: string[] = [];
  if (!filled(fields.legal_name)) identity.push("legal_name");
  if (!filled(fields.country)) identity.push("country");
  if (!filled(fields.ghana_card_pin)) identity.push("ghana_card_pin");
  if (!filled(fields.date_of_birth)) identity.push("date_of_birth");
  if (!documents.identity_document) identity.push("identity_document");

  const business: string[] = [];
  if (!fields.business_type) business.push("business_type");
  if (registered) {
    if (!filled(fields.business_name)) business.push("business_name");
    if (!filled(fields.registration_number)) business.push("registration_number");
    if (!documents.business_document) business.push("business_document");
  }
  if (!filled(fields.tax_id)) business.push("tax_id");
  if (!filled(fields.region)) business.push("region");
  if (!filled(fields.city)) business.push("city");

  const payout: string[] = [];
  if (!filled(fields.phone_e164)) payout.push("phone_e164");
  if (!filled(fields.whatsapp_e164)) payout.push("whatsapp_e164");
  if (!fields.payout_method) {
    payout.push("payout_method");
  } else {
    if (!filled(fields.payout_number)) payout.push("payout_number");
    if (!filled(fields.payout_account_name)) payout.push("payout_account_name");
    if (fields.payout_method === "momo" && !fields.payout_network) payout.push("payout_network");
    if (fields.payout_method === "bank" && !filled(fields.bank_name)) payout.push("bank_name");
  }

  const review: string[] = [];
  if (!(fields.declaration_accepted && fields.declaration_version === KYC_DECLARATION_VERSION)) {
    review.push("declaration");
  }

  const states: KycStepState[] = KYC_STEPS.map((step) => {
    const missing =
      step.key === "identity"
        ? identity
        : step.key === "business"
          ? business
          : step.key === "payout"
            ? payout
            : review;
    return { id: step.id, key: step.key, title: step.title, missing, complete: missing.length === 0 };
  });

  return states;
}

/** The first step that still has gaps — where "continue" should land. */
export function kycResumeStep(states: KycStepState[]): number {
  const open = states.find((state) => !state.complete);
  return open?.id ?? 4;
}
