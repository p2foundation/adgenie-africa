import { z } from "zod";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const Vertical = z.enum(["seller", "company", "fashion", "spot"]);
export type Vertical = z.infer<typeof Vertical>;

export const Language = z.enum(["en", "fr", "tw", "gaa"]);
export type Language = z.infer<typeof Language>;

export const CampaignStatus = z.enum([
  "draft",
  "planned",
  "running",
  "done",
  "failed",
  "cancelled",
]);
export type CampaignStatus = z.infer<typeof CampaignStatus>;

export const AssetKind = z.enum([
  "product",
  "logo",
  "person",
  "venue",
  "output",
]);
export type AssetKind = z.infer<typeof AssetKind>;

export const CreditType = z.enum(["free", "paid"]);
export type CreditType = z.infer<typeof CreditType>;

export const OutputSize = z.enum(["1:1", "4:5", "9:16"]);
export type OutputSize = z.infer<typeof OutputSize>;

export const GenerationKind = z.enum(["image", "video", "copy", "overlay"]);
export type GenerationKind = z.infer<typeof GenerationKind>;

export const PlanCodeZod = z.enum(["starter", "growth", "business", "topup"]);
// Note: PlanCode as TypeScript type comes from pricing.ts (keyof typeof PLANS)
export type PlanCodeSchema = z.infer<typeof PlanCodeZod>;

// ─── Credit / Ledger ─────────────────────────────────────────────────────────

export const CreditLedgerRow = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  delta: z.number().int(),
  reason: z.string().max(120),
  ref: z.string().max(120),
  credit_type: CreditType,
  created_at: z.string().datetime(),
});
export type CreditLedgerRow = z.infer<typeof CreditLedgerRow>;

// What a generation costs is not modelled here: public.generation_costs is the
// single source of truth and start_generation() debits from it by kind.

/**
 * Stamped into consent_log whenever a user accepts the terms. The client never
 * carries it — bump this when the terms or privacy policy are republished.
 */
export const CONSENT_POLICY_VERSION = "2026-10";

// ─── User / Profile ───────────────────────────────────────────────────────────

export const Profile = z.object({
  id: z.string().uuid(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  display_name: z.string().max(80).optional(),
  language: Language.default("en"),
  vertical: Vertical.optional(),
  created_at: z.string().datetime(),
});
export type Profile = z.infer<typeof Profile>;

// ─── Brand Kit ────────────────────────────────────────────────────────────────

export const BrandKit = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().max(80),
  logo_url: z.string().url().optional(),
  primary_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  secondary_color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  whatsapp_number: z.string().max(20).optional(),
  website_url: z.string().url().optional(),
  tone: z
    .enum(["casual", "professional", "playful", "luxury", "corporate"])
    .optional(),
});
export type BrandKit = z.infer<typeof BrandKit>;

// ─── Venue / Event ────────────────────────────────────────────────────────────

export const Venue = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  name: z.string().max(100),
  type: z.enum([
    "restaurant",
    "bar",
    "club",
    "hotel",
    "beach",
    "event_space",
    "other",
  ]),
  area: z.string().max(100),
  lat: z.number().optional(),
  lng: z.number().optional(),
  whatsapp: z.string().max(20).optional(),
  booking_url: z.string().url().optional(),
  opening_hours: z.record(z.string()).optional(),
});
export type Venue = z.infer<typeof Venue>;

export const Event = z.object({
  id: z.string().uuid(),
  venue_id: z.string().uuid(),
  title: z.string().max(100),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime().optional(),
  price_text: z.string().max(60).optional(),
  ticket_url: z.string().url().optional(),
  dress_code: z.string().max(60).optional(),
  performers: z.array(z.string().max(80)).max(10).optional(),
});
export type Event = z.infer<typeof Event>;

// ─── Campaign ─────────────────────────────────────────────────────────────────

export const CampaignPlan = z.object({
  concepts: z.array(
    z.object({
      id: z.string(),
      headline: z.string(),
      body: z.string(),
      sizes: z.array(OutputSize),
      channels: z.array(z.string()),
      includes_video: z.boolean(),
    })
  ),
  estimated_credits: z.number().int().positive(),
  copy_angles: z.array(z.string()),
});
export type CampaignPlan = z.infer<typeof CampaignPlan>;

export const Campaign = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  project_id: z.string().uuid().optional(),
  vertical: Vertical,
  goal: z.string().max(200),
  language: Language,
  status: CampaignStatus,
  plan: CampaignPlan.optional(),
  credit_budget: z.number().int().positive(),
  created_at: z.string().datetime(),
});
export type Campaign = z.infer<typeof Campaign>;

// ─── Agent Run ────────────────────────────────────────────────────────────────

export const AgentRunStatus = z.enum([
  "queued",
  "running",
  "paused",
  "done",
  "failed",
]);
export type AgentRunStatus = z.infer<typeof AgentRunStatus>;

export const AgentStep = z.object({
  id: z.string().uuid(),
  run_id: z.string().uuid(),
  seq: z.number().int(),
  tool: z.string(),
  input: z.record(z.unknown()),
  output: z.record(z.unknown()).optional(),
  status: z.enum(["pending", "running", "done", "failed"]),
  cost_usd_micros: z.number().int().optional(),
  latency_ms: z.number().int().optional(),
});
export type AgentStep = z.infer<typeof AgentStep>;

// ─── Payments ─────────────────────────────────────────────────────────────────

export const PaymentStatus = z.enum([
  "pending",
  "success",
  "failed",
  "refunded",
]);
export type PaymentStatus = z.infer<typeof PaymentStatus>;

export const Payment = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  plan_code: z.enum(["starter", "growth", "business", "topup"]),
  amount_pesewas: z.number().int().positive(),
  currency: z.literal("GHS"),
  channels: z.array(
    z.enum(["mobile_money", "card", "bank_transfer"])
  ),
  paystack_ref: z.string().optional(),
  status: PaymentStatus,
  credits_granted: z.number().int().nonnegative(),
  created_at: z.string().datetime(),
});
export type Payment = z.infer<typeof Payment>;

// ─── API responses ────────────────────────────────────────────────────────────

export const ApiSuccess = <T extends z.ZodTypeAny>(data: T) =>
  z.object({ success: z.literal(true), data });

export const ApiError = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});
