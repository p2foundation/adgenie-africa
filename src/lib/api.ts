import type {
  AppRole,
  KycDocumentKind,
  KycFields,
  KycStatus,
  KycStepState,
  MarketingChannel,
} from "@adgenie/core";

const DEFAULT_API_URL = "http://localhost:4000/api/v1";

export interface ImportedPage {
  sourceUrl: string;
  pageTitle: string;
  businessName: string | null;
  headline: string | null;
  details: string | null;
  priceLabel: string | null;
  images: { url: string; alt: string; kind: "product" | "logo"; preview: string }[];
  note: string;
}

/**
 * In production the browser calls the web origin (`/api/v1`) and Next rewrites
 * that to API_ORIGIN, keeping the session cookie first-party. Server components
 * cannot fetch a relative path, so they go straight at API_ORIGIN. Locally both
 * sides point at the API on :4000, with LAN hosts substituted for phones.
 */
function getApiUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL;

  if (typeof window !== "undefined") {
    try {
      const url = new URL(configured);
      if (
        (url.hostname === "localhost" || url.hostname === "127.0.0.1") &&
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1"
      ) {
        return `${window.location.protocol}//${window.location.hostname}:${url.port || "4000"}${url.pathname.replace(/\/$/, "")}`;
      }
    } catch {
      // Relative URL: same origin, which the rewrite handles.
    }
    return configured;
  }

  const origin = process.env.API_ORIGIN?.replace(/\/+$/, "");
  if (origin) return `${origin}/api/v1`;

  if (/^https?:\/\//.test(configured)) return configured;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      return new URL(configured, appUrl).toString().replace(/\/+$/, "");
    } catch {
      // Fall through to the local default.
    }
  }
  return DEFAULT_API_URL;
}

/** The envelope every paginated API list returns. */
export interface Page<T> {
  total: number;
  page: number;
  limit: number;
  pages: number;
  items: T[];
}

export interface NotificationItem {
  id: string;
  kind: string;
  title: string;
  body: string;
  href: string | null;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
  /** When the inbox clears this row by itself. */
  expiresAt: string;
}

export type NotificationsPage = Page<NotificationItem>;

export interface NotificationsSummary {
  unread: number;
  total: number;
  lastAt: string | null;
}

/** Only public Firebase values ever leave the API. */
export interface PublicFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface PushConfig {
  enabled: boolean;
  reason: "ready" | "server_missing" | "web_missing" | "vapid_missing";
  config: PublicFirebaseConfig | null;
  vapidKey: string | null;
}

export interface PushOutcome {
  configured: boolean;
  devices: number;
  sent: number;
  failed: number;
  pruned: number;
}

export interface NotificationTestResult {
  notification: NotificationItem;
  push: PushOutcome;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** The parsed error body, when the API sends more than a message. */
    readonly body: unknown = null,
    /** Set when no answer arrived at all: status is 0 and the copy is ours. */
    readonly cause: "offline" | "timeout" | "network" | null = null
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Safe to offer "Try again" — never true for a 4xx the customer must fix. */
  get retryable(): boolean {
    return this.cause !== null || this.status >= 500;
  }
}

/** The fields a `KYC_INCOMPLETE` rejection names. */
export function kycMissingFrom(err: unknown): string[] {
  const body = err instanceof ApiError ? (err.body as { missing?: unknown } | null) : null;
  return Array.isArray(body?.missing) ? body.missing.filter((k): k is string => typeof k === "string") : [];
}

export interface Profile {
  id: string;
  email: string | null;
  phone: string | null;
  displayName: string | null;
  language: string;
  vertical: string | null;
  country: string | null;
  currency: string | null;
  isAdmin: boolean;
  appRole: AppRole;
  emailVerifiedAt: string | null;
  phoneVerifiedAt: string | null;
  freeCreditsGranted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BrandKit {
  id: string;
  name: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  whatsappNumber: string | null;
  websiteUrl: string | null;
  tone: "casual" | "professional" | "playful" | "luxury" | "corporate" | null;
  createdAt: string;
}

export type SubscriptionStatus = "active" | "past_due" | "cancelled" | "expired";

/** `GET /credits/rates` — units of each currency per 1 GHS. */
export interface CurrencyRates {
  base: "GHS";
  rates: Partial<Record<"GHS" | "NGN" | "XOF", number>>;
  updatedAt: string | null;
}

export interface BillingSubscription {
  planCode: string;
  status: SubscriptionStatus;
  creditsPerPeriod: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export interface BillingPayment {
  id: string;
  planCode: string;
  amountPesewas: number;
  currency: string;
  status: "pending" | "success" | "failed" | "refunded";
  creditsGranted: number;
  createdAt: string;
}

export interface AccountBilling {
  subscription: BillingSubscription | null;
  /** Successful GHS payments across the whole account, not just this page. */
  paidPesewas: number;
  payments: Page<BillingPayment>;
}

export type PaymentTenderId = "mobile_money" | "card";

export interface PaymentTenderOption {
  id: PaymentTenderId;
  label: string;
  detail: string;
  methods: string[];
  available: boolean;
}

/** `GET /credits/payment-options` — never names a processor. */
export interface PaymentOptions {
  sandbox: boolean;
  currency: string;
  tenders: PaymentTenderOption[];
}

/** `GET /admin/payments/readiness` — configuration only, never a charge. */
export interface PaymentReadinessCheck {
  id: string;
  state: "pass" | "warn" | "fail";
  message: string;
}

export interface PaymentRailReadiness {
  tender: "mobile_money" | "card";
  label: string;
  ready: boolean;
  checks: PaymentReadinessCheck[];
}

export interface PaymentReadiness {
  mode: "sandbox" | "live";
  environment: string;
  ready_for_live_test: boolean;
  checks: PaymentReadinessCheck[];
  rails: PaymentRailReadiness[];
  checked_at: string;
}

/** `POST /credits/checkout` */
export interface CheckoutResult {
  payment_id: string;
  reference: string;
  plan_code: string;
  plan_name: string;
  amount_pesewas: number;
  credits: number;
  currency: string;
  status: "verifying" | "success" | "failed" | "checkout_ready";
  provider_status: string;
  checkout_url: string | null;
  retry_after_ms: number;
  message: string;
  /**
   * What the bank says about the wallet we are prompting, when it answered.
   * Absent for card and whenever the enquiry had nothing to say — never treat a
   * missing wallet as a failed payment.
   */
  wallet?: {
    network_id: string | null;
    network_label: string | null;
    holder_name: string | null;
  };
}

/** `GET /credits/payments/:id` and the rows of `GET /credits/payments`. */
export interface PaymentView {
  id: string;
  plan_code: string;
  plan_name: string;
  amount_pesewas: number;
  currency: string;
  credits: number;
  credits_granted: number;
  status: "verifying" | "success" | "failed" | "refunded";
  tender: PaymentTenderId | null;
  reference: string | null;
  test: boolean;
  message: string;
  created_at: string;
  updated_at: string;
}

export type PaymentsPage = Page<PaymentView>;

export interface LedgerEntry {
  id: string;
  delta: number;
  reason: string;
  creditType: "free" | "paid";
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  detail: Record<string, unknown>;
  createdAt: string;
  actorEmail: string | null;
  targetEmail: string | null;
}

export interface AdminOverview {
  generatedAt: string;
  totals: {
    users: number;
    verified: number;
    new7d: number;
    active7d: number;
    campaigns: number;
    generations: number;
    spent14d: number;
    outstanding: number;
    spenders7d: number;
    revenue30dPesewas: number;
    aiCost30dMicros: number;
  };
  /** What is actually waiting on a human, not just what happened. */
  queues: {
    kycWaiting: number;
    kycOldestSubmittedAt: string | null;
    failedGenerations: number;
    openFlags: number;
    pendingPayments: number;
    failedPayments: number;
  };
  pipeline: Record<CampaignStatus, number>;
  roles: Record<AppRole, number>;
  signups: { date: string; count: number }[];
  spend: { date: string; credits: number }[];
  revenue: { date: string; pesewas: number }[];
  staff: {
    id: string;
    displayName: string | null;
    email: string | null;
    appRole: AppRole;
    lastSignInAt: string | null;
  }[];
  auditVisible: boolean;
  recentAudit: AuditEntry[];
}

export interface AdminUser {
  id: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  appRole: AppRole;
  emailVerified: boolean;
  phoneVerified: boolean;
  lastSignInAt: string | null;
  createdAt: string;
  balance: number;
  kycStatus: KycStatus | null;
  campaigns: number;
  creditsSpent: number;
}

export interface AdminUserDetail {
  user: AdminUser & {
    legalName: string | null;
    businessName: string | null;
    country: string | null;
    currency: string | null;
    kycSubmittedAt: string | null;
    kycVerifiedAt: string | null;
    kycRejectionReason: string | null;
  };
  stats: {
    creditsSpent30d: number;
    topupsPesewas: number;
    paymentCount: number;
    failedGenerations: number;
  };
  ledger: Page<LedgerEntry>;
  campaigns: Page<{
    id: string;
    title: string;
    goal: string;
    status: CampaignStatus;
    vertical: string;
    language: string;
    creditBudget: number;
    creditsSpent: number;
    createdAt: string;
    updatedAt: string;
  }>;
  payments: Page<AdminPayment>;
  audit: Page<AuditEntry>;
  subscription: AdminSubscription | null;
}

export interface AdminSubscription {
  id: string;
  userId: string;
  email: string | null;
  displayName: string | null;
  planCode: string;
  planName: string | null;
  status: SubscriptionStatus;
  creditsPerPeriod: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  overdueActive?: boolean;
}

export type AdminSubscriptionsPage = Page<AdminSubscription>;

export interface AdminAssignablePlan {
  code: string;
  name: string;
  credits: number;
  pricePesewas: number;
}

export interface AdminCreditGrant {
  ledgerId: string;
  granted: number;
  balance: number;
}

export interface AdminPlanAssignment {
  subscription: {
    id: string;
    planCode: string;
    planName: string;
    status: SubscriptionStatus;
    creditsPerPeriod: number;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
  granted: number;
  balance: number;
}

export type AdminPaymentStatus = "pending" | "success" | "failed" | "refunded";

export interface AdminPayment {
  id: string;
  email?: string | null;
  planCode: string;
  amountPesewas: number;
  currency: string;
  status: AdminPaymentStatus;
  creditsGranted: number;
  createdAt: string;
}

export type AdminUsersPage = Page<AdminUser>;

export interface AdminCampaign {
  id: string;
  userId: string;
  creator: string | null;
  email: string | null;
  title: string;
  goal: string;
  vertical: string;
  language: string;
  status: CampaignStatus;
  creditBudget: number;
  creditsSpent: number;
  createdAt: string;
  updatedAt: string;
  generations: number;
  failedGenerations: number;
}

export type AdminCampaignsPage = Page<AdminCampaign>;

export interface AdminCampaignDetail {
  campaign: {
    id: string;
    userId: string;
    creator: string | null;
    email: string | null;
    phone: string | null;
    title: string;
    goal: string;
    vertical: string;
    language: string;
    status: CampaignStatus;
    plan: CampaignPlan | null;
    creditBudget: number;
    creditsSpent: number;
    createdAt: string;
    updatedAt: string;
    failedGenerations: number;
    openFlags: number;
  };
  generations: Page<{
    id: string;
    kind: "image" | "video" | "copy" | "overlay";
    status: "queued" | "running" | "done" | "failed" | "refunded";
    creditsReserved: number;
    creditsSpent: number;
    error: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  runs: Page<{
    id: string;
    status: string;
    model: string | null;
    startedAt: string | null;
    finishedAt: string | null;
    creditsReserved: number;
    creditsSpent: number;
    error: string | null;
    createdAt: string;
    steps: number;
  }>;
  flags: Page<{
    id: string;
    reason: string;
    resolvedAt: string | null;
    createdAt: string;
  }>;
}

export interface AdminEconomy {
  generatedAt: string;
  totals: {
    revenue30dPesewas: number;
    revenueAllPesewas: number;
    creditsSold30d: number;
    creditsSpent30d: number;
    aiCost30dMicros: number;
    pendingPayments: number;
    failedPayments: number;
    activeSubscriptions: number;
  };
  revenue: { date: string; pesewas: number }[];
  aiSpend: { date: string; micros: number }[];
  plans: { planCode: string; payments: number; pesewas: number; credits: number }[];
  providers: { provider: string; callType: string; calls: number; micros: number }[];
  payments: Page<AdminPayment>;
  webhooks: Page<{ id: string; eventType: string; processedAt: string }>;
  topSpenders: { userId: string; email: string | null; credits: number }[];
}

export type AdminAuditPage = Page<AuditEntry> & { actions: string[] };

export type CampaignFormat = "1:1" | "4:5" | "9:16";

export type CreativeEngine = "image" | "motion" | "spin";
export type MotionHook = "pov" | "three_reasons" | "before_after" | "testimonial";
export type MotionPace = "slow" | "medium" | "fast";
export type SpinAudience = "women" | "men" | "kids";
export type SpinProduct = "outfit" | "doll" | "product" | "packaging";
export type SpinMode = "model" | "mannequin" | "kit";

export interface CreativeDirection {
  engines: CreativeEngine[];
  motionHook: MotionHook;
  motionPace: MotionPace;
  spinAudience: SpinAudience;
  spinProduct: SpinProduct;
  spinMode: SpinMode;
  /** Asset ids the image model uses as references, in this campaign only. */
  photos?: string[];
}

export type PhotoKind = "product" | "logo" | "person" | "venue";

export interface AssetSummary {
  id: string;
  kind: PhotoKind;
  personLabel: string | null;
  consentAttested: boolean;
  createdAt: string;
}

export interface AssetList {
  items: AssetSummary[];
  limit: number;
  maximum: number;
}

export type ScheduleChannel = MarketingChannel;
export type ScheduleStatus = "scheduled" | "posted" | "skipped";

export interface CampaignSchedule {
  scheduledAt: string;
  channel: ScheduleChannel;
  status: ScheduleStatus;
  note: string | null;
  updatedAt: string;
}

export interface CampaignCalendarItem {
  id: string;
  goal: string;
  vertical: string;
  language: string;
  status: CampaignStatus;
  headline: string;
  businessName: string | null;
  formats: CampaignFormat[];
  creative: CreativeDirection;
  schedule: CampaignSchedule | null;
  createdAt: string;
}

export interface CampaignCalendar {
  month: string;
  from: string;
  to: string;
  scheduled: CampaignCalendarItem[];
  unscheduled: CampaignCalendarItem[];
}

export interface GenerationCosts {
  image: number;
  video: number;
  copy: number;
  overlay: number;
}

export interface CampaignQuoteLine {
  kind: "image" | "video" | "copy" | "overlay";
  label: string;
  units: number;
  unitCredits: number;
  credits: number;
}

export interface CampaignBrief {
  businessName: string | null;
  headline: string;
  details: string | null;
  sourceUrl: string | null;
  priceLabel: string | null;
  offerLabel: string | null;
  formats: CampaignFormat[];
  video: boolean;
  creative?: CreativeDirection;
}

export interface CampaignPlan {
  version: number;
  brief: CampaignBrief;
  quote: {
    lines: CampaignQuoteLine[];
    total: number;
    budget: number;
    currency: "credits";
  };
  schedule?: CampaignSchedule;
  createdAt: string;
}

export type CampaignStatus =
  | "draft"
  | "planned"
  | "running"
  | "done"
  | "failed"
  | "cancelled";

export interface CampaignSummary {
  id: string;
  vertical: string;
  goal: string;
  language: string;
  status: CampaignStatus;
  creditBudget: number;
  createdAt: string;
}

export interface Campaign extends CampaignSummary {
  plan: CampaignPlan | null;
  creditsSpent: number;
  updatedAt: string;
  /** Present on the detail endpoint: which model writes and draws, and whether it is live. */
  ai?: AiStatus;
  run?: CampaignRun | null;
  steps?: CampaignStep[];
  outputs?: CampaignOutput[];
  copy?: CampaignCopy | null;
}

export interface AiStatus {
  mode: "gemini" | "openai" | "mock";
  textModel: string;
  imageModel: string;
  /** The other vendor, used only when the primary is unavailable. */
  backup: {
    provider: "gemini" | "openai" | "mock";
    textModel: string;
    imageModel: string;
  } | null;
  configured: boolean;
  note: string;
}

export interface CampaignRun {
  id: string;
  status: "queued" | "running" | "paused" | "done" | "failed";
  model: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  creditsReserved: number;
  creditsSpent: number;
  error: string | null;
}

export interface CampaignStep {
  seq: number;
  tool: string;
  status: "pending" | "running" | "done" | "failed";
  latencyMs: number | null;
  createdAt: string;
}

export interface CampaignOutputFile {
  index: number;
  role: string;
  label: string | null;
  mimeType: string;
  width: number | null;
  height: number | null;
  bytes: number | null;
}

export interface CampaignOutput {
  id: string;
  kind: "image" | "video" | "overlay" | "copy";
  creditsSpent: number;
  createdAt: string;
  files: CampaignOutputFile[];
}

export interface CampaignCopy {
  strategy: string;
  headline: string;
  hook: string;
  caption: string;
  hashtags: string[];
  cta: string;
  alt: string;
}

export interface LibrarySummary {
  files: number;
  images: number;
  videos: number;
  captions: number;
  plans: number;
}

export type LibraryPlan = Campaign;

export interface LibraryFile {
  id: string;
  campaignId: string | null;
  kind: "image" | "video" | "copy" | "overlay";
  outputText: string | null;
  hasFiles: boolean;
  files: Array<{
    index: number;
    role: string;
    label: string | null;
    width: number | null;
    height: number | null;
  }>;
  creditsSpent: number;
  createdAt: string;
  campaignGoal: string | null;
  campaignVertical: string | null;
}

export interface LibraryOverview {
  summary: LibrarySummary;
  plans: Page<LibraryPlan>;
  files: Page<LibraryFile>;
}

export type CampaignsPage = Page<CampaignSummary>;

export type LedgerPage = Page<LedgerEntry>;

export interface SignUpResult {
  userId: string;
  consentPolicyVersion: string;
  verificationRequired: boolean;
  devVerificationUrl?: string;
}

export interface SignInResult {
  userId: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
}

/**
 * `GET /kyc`. `fields` are the API's snake_case names so a `missing` key from a
 * rejection maps straight onto a form input.
 */
export type KycFieldValues = KycFields & {
  address: string | null;
  sector: string | null;
  website_url: string | null;
};

export interface KycDocumentMeta {
  kind: KycDocumentKind;
  contentType: string;
  bytes: number;
  revision: number;
  updatedAt: string;
}

export interface KycView {
  started: boolean;
  status: KycStatus;
  currentStep: number;
  editable: boolean;
  fields: KycFieldValues;
  steps: KycStepState[];
  documents: KycDocumentMeta[];
  declaration: { version: string; accepted: boolean; acceptedAt: string | null };
  submittedAt: string | null;
  reviewedAt: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
}

/** One row of `GET /admin/kyc/queue`. */
export interface KycQueueItem {
  userId: string;
  email: string | null;
  displayName: string | null;
  status: KycStatus;
  businessName: string | null;
  legalName: string | null;
  submittedAt: string | null;
}

export type KycQueuePage = Page<KycQueueItem>;

/** `GET /admin/kyc/:id` — what a reviewer is asked to trust, plus the evidence. */
export interface KycStaffRecord {
  status: KycStatus;
  fields: KycFieldValues;
  steps: KycStepState[];
  account: { email: string | null; displayName: string | null };
  documentRecords: (KycDocumentMeta & { sha256: string })[];
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
}

/**
 * One entry point for the NestJS API. The session lives in an HttpOnly cookie the
 * API sets, so the browser sends it (credentials) and server components forward
 * the incoming cookie jar — a token never appears in JavaScript or in a URL.
 */
/**
 * A JSON call should not hang forever on a bad connection, and an upload on 3G
 * needs room. Neither number is a business rule — just how long we wait before
 * telling the customer the truth.
 */
const JSON_TIMEOUT_MS = 20_000;
const UPLOAD_TIMEOUT_MS = 90_000;

/**
 * One place for "the network did not answer", so no screen has to translate a
 * bare TypeError into something a seller can act on. A caller's own abort (an
 * unmounted screen) is rethrown untouched — that is not a connection problem.
 */
async function request(
  path: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const signals = [AbortSignal.timeout(timeoutMs)];
  if (init.signal) signals.push(init.signal);

  try {
    return await fetch(`${getApiUrl()}${path}`, {
      ...init,
      signal: AbortSignal.any(signals),
      credentials: "include",
      cache: "no-store",
    });
  } catch (err) {
    if (init.signal?.aborted) throw err;
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      throw new ApiError(
        0,
        "You're offline. Reconnect and try again — nothing you typed is lost.",
        null,
        "offline"
      );
    }
    const timedOut = err instanceof DOMException && err.name === "TimeoutError";
    throw new ApiError(
      0,
      timedOut
        ? "That's taking longer than it should. Check your connection and try again."
        : "We couldn't reach the studio. Check your connection and try again.",
      null,
      timedOut ? "timeout" : "network"
    );
  }
}

export async function api<T>(
  path: string,
  init: {
    method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    body?: unknown;
    cookie?: string;
    signal?: AbortSignal;
  } = {}
): Promise<T> {
  const headers: Record<string, string> = {};
  if (init.body !== undefined) headers["content-type"] = "application/json";
  if (init.cookie) headers.cookie = init.cookie;

  const res = await request(
    path,
    {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: init.signal ?? undefined,
    },
    JSON_TIMEOUT_MS
  );

  return readJson<T>(res);
}

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  // A proxy or a tunnel answers 502 with HTML, not with our error envelope.
  // Parsing that as JSON would surface a SyntaxError instead of the truth.
  let body: { message?: unknown } | null = null;
  try {
    body = (text ? JSON.parse(text) : null) as { message?: unknown } | null;
  } catch {
    body = null;
  }

  if (!res.ok) {
    const raw = body?.message;
    const message =
      typeof raw === "string"
        ? raw
        : Array.isArray(raw)
          ? raw.join(" ")
          : "Something went wrong on our side. Try again.";
    throw new ApiError(res.status, message, body);
  }

  return body as T;
}

/**
 * Multipart upload. FormData must not be given a content type — the browser sets
 * it with the boundary, and a hand-written header here breaks the request.
 */
export async function apiUpload<T>(path: string, file: File): Promise<T> {
  const form = new FormData();
  form.append("file", file);

  const res = await request(
    path,
    {
      method: "POST",
      body: form,
    },
    UPLOAD_TIMEOUT_MS
  );

  return readJson<T>(res);
}

/**
 * Private bytes served through an authorised route (KYC evidence). Returns a Blob
 * so the caller can show it in a same-origin object URL rather than pointing an
 * `<img src>` at the API: a cross-site subresource would not carry the session
 * cookie, and these files must never be fetched without it.
 */
export async function apiBlob(path: string): Promise<Blob | null> {
  const res = await request(path, {}, JSON_TIMEOUT_MS);
  return res.ok ? await res.blob() : null;
}

const previewCache = new Map<string, Promise<Blob | null>>();
const PREVIEW_CACHE_MAX = 48;

/**
 * Same fetch as apiBlob, but a preview already downloaded in this session is
 * reused. Private files cannot lean on the browser cache (no cookie on a plain
 * `<img src>`, and the byte route answers per session), so without this, walking
 * away from the library and back re-downloads every thumbnail on the shelf.
 */
export function apiBlobCached(path: string): Promise<Blob | null> {
  const existing = previewCache.get(path);
  if (existing) return existing;

  function settle(blob: Blob | null) {
    // Only successes stay in the map. A miss is usually a dead session or a
    // service blip, and the next mount must be free to try again.
    if (!blob && previewCache.get(path) === pending) previewCache.delete(path);
    return blob;
  }

  const pending: Promise<Blob | null> = apiBlob(path)
    .then(settle)
    .catch(() => settle(null));
  previewCache.set(path, pending);

  const oldest = previewCache.keys().next().value;
  if (previewCache.size > PREVIEW_CACHE_MAX && oldest !== undefined) {
    previewCache.delete(oldest);
  }
  return pending;
}

/** The verification token the API hands back in development only. */
export function tokenFromVerificationUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).searchParams.get("token");
  } catch {
    return null;
  }
}
