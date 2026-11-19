import { cookies } from "next/headers";
import {
  ApiError,
  api,
  type AccountBilling,
  type AdminAuditPage,
  type AdminCampaignDetail,
  type AdminCampaignsPage,
  type AdminEconomy,
  type AdminOverview,
  type AdminSubscriptionsPage,
  type AdminUserDetail,
  type AdminUsersPage,
  type BrandKit,
  type Campaign,
  type CampaignCalendar,
  type CampaignsPage,
  type CurrencyRates,
  type GenerationCosts,
  type KycQueuePage,
  type KycStaffRecord,
  type KycView,
  type LedgerPage,
  type LibraryOverview,
  type NotificationsPage,
  type NotificationsSummary,
  type PaymentOptions,
  type PaymentReadiness,
  type PaymentsPage,
  type Profile,
  type PushConfig,
} from "./api";

/** Use only in server components: forwards the visitor's session cookie to the API. */
async function withSession<T>(path: string): Promise<T | null> {
  const jar = (await cookies()).toString();
  try {
    return await api<T>(path, { cookie: jar });
  } catch (err) {
    // Only 401 collapses to null — pages turn that into redirect("/sign-in").
    // A 404 must keep throwing so resource pages can still notFound() on a
    // genuinely missing record while the session is alive.
    if (err instanceof ApiError && err.status === 401) {
      return null;
    }
    throw err;
  }
}

export function readSession() {
  return withSession<Profile>("/auth/me");
}

export function readBalance() {
  return withSession<number>("/credits/balance");
}

export function readCurrencyRates() {
  return withSession<CurrencyRates>("/credits/rates");
}

export function readPaymentOptions() {
  return withSession<PaymentOptions>("/credits/payment-options");
}

export function readPayments(params: { page?: number; limit?: number } = {}) {
  const search = new URLSearchParams();
  search.set("page", String(params.page ?? 1));
  if (params.limit) search.set("limit", String(params.limit));
  return withSession<PaymentsPage>(`/credits/payments?${search.toString()}`);
}

export function readLedger(params: { page?: number; limit?: number } = {}) {
  const search = new URLSearchParams();
  search.set("page", String(params.page ?? 1));
  if (params.limit) search.set("limit", String(params.limit));
  return withSession<LedgerPage>(`/credits/ledger?${search.toString()}`);
}

export function readCampaigns(params: { page?: number; limit?: number } = {}) {
  const search = new URLSearchParams();
  search.set("page", String(params.page ?? 1));
  if (params.limit) search.set("limit", String(params.limit));
  return withSession<CampaignsPage>(`/campaigns?${search.toString()}`);
}

export function readCampaign(id: string) {
  return withSession<Campaign>(`/campaigns/${id}`);
}

export function readCampaignCosts() {
  return withSession<GenerationCosts>("/campaigns/costs");
}

export function readCalendar(
  params: { month?: string; from?: string; to?: string } = {}
) {
  const search = new URLSearchParams();
  if (params.month) search.set("month", params.month);
  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);
  return withSession<CampaignCalendar>(`/campaigns/calendar?${search.toString()}`);
}

export function readLibrary(
  params: {
    plansPage?: number;
    filesPage?: number;
    q?: string;
    tab?: string;
  } = {}
) {
  const search = new URLSearchParams();
  search.set("plansPage", String(params.plansPage ?? 1));
  search.set("filesPage", String(params.filesPage ?? 1));
  if (params.q) search.set("q", params.q);
  if (params.tab && params.tab !== "all") search.set("tab", params.tab);
  return withSession<LibraryOverview>(`/library?${search.toString()}`);
}

export function readBrandKit() {
  return withSession<BrandKit | null>("/account/brand-kit");
}

export function readKyc() {
  return withSession<KycView>("/kyc");
}

export function readNotifications(
  params: { page?: number; filter?: "all" | "unread" } = {}
) {
  const search = new URLSearchParams();
  search.set("page", String(params.page ?? 1));
  search.set("filter", params.filter === "unread" ? "unread" : "all");
  return withSession<NotificationsPage>(`/notifications?${search.toString()}`);
}

export function readNotificationSummary() {
  return withSession<NotificationsSummary>("/notifications/summary");
}

export function readPushConfig() {
  return withSession<PushConfig>("/notifications/config");
}

export function readBilling(params: { page?: number } = {}) {
  const search = new URLSearchParams();
  search.set("page", String(params.page ?? 1));
  return withSession<AccountBilling>(`/account/billing?${search.toString()}`);
}

export function readAdminOverview() {
  return withSession<AdminOverview>("/admin/overview");
}

export function readAdminUsers(params: {
  query?: string;
  kyc?: string;
  page?: number;
}) {
  const search = new URLSearchParams();
  if (params.query) search.set("query", params.query);
  if (params.kyc) search.set("kyc", params.kyc);
  search.set("page", String(params.page ?? 1));
  return withSession<AdminUsersPage>(`/admin/users?${search.toString()}`);
}

export function readAdminUser(
  id: string,
  params: {
    ledgerPage?: number;
    campaignsPage?: number;
    paymentsPage?: number;
    auditPage?: number;
  } = {}
) {
  const search = new URLSearchParams();
  search.set("ledgerPage", String(params.ledgerPage ?? 1));
  search.set("campaignsPage", String(params.campaignsPage ?? 1));
  search.set("paymentsPage", String(params.paymentsPage ?? 1));
  search.set("auditPage", String(params.auditPage ?? 1));
  return withSession<AdminUserDetail>(`/admin/users/${id}?${search.toString()}`);
}

export function readAdminCampaigns(params: {
  status?: string;
  health?: string;
  query?: string;
  page?: number;
}) {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.health) search.set("health", params.health);
  if (params.query) search.set("query", params.query);
  search.set("page", String(params.page ?? 1));
  return withSession<AdminCampaignsPage>(`/admin/campaigns?${search.toString()}`);
}

export function readAdminCampaign(
  id: string,
  params: { outputsPage?: number; runsPage?: number; flagsPage?: number } = {}
) {
  const search = new URLSearchParams();
  search.set("outputsPage", String(params.outputsPage ?? 1));
  search.set("runsPage", String(params.runsPage ?? 1));
  search.set("flagsPage", String(params.flagsPage ?? 1));
  return withSession<AdminCampaignDetail>(
    `/admin/campaigns/${id}?${search.toString()}`
  );
}

export function readAdminEconomy(
  params: { paymentsPage?: number; webhooksPage?: number } = {}
) {
  const search = new URLSearchParams();
  search.set("paymentsPage", String(params.paymentsPage ?? 1));
  search.set("webhooksPage", String(params.webhooksPage ?? 1));
  return withSession<AdminEconomy>(`/admin/economy?${search.toString()}`);
}

/** Config-only on purpose: the economy page must not wait on a provider call. */
export function readPaymentReadiness() {
  return withSession<PaymentReadiness>("/admin/payments/readiness");
}

export function readAdminSubscriptions(params: {
  status?: string;
  query?: string;
  page?: number;
}) {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.query) search.set("query", params.query);
  search.set("page", String(params.page ?? 1));
  return withSession<AdminSubscriptionsPage>(
    `/admin/subscriptions?${search.toString()}`
  );
}

export function readAdminAudit(params: {
  page?: number;
  limit?: number;
  action?: string;
  query?: string;
} = {}) {
  const search = new URLSearchParams();
  search.set("page", String(params.page ?? 1));
  if (params.limit) search.set("limit", String(params.limit));
  if (params.action) search.set("action", params.action);
  if (params.query) search.set("query", params.query);
  return withSession<AdminAuditPage>(`/admin/audit?${search.toString()}`);
}

export function readKycQueue(params: { status?: string; page?: number }) {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  search.set("page", String(params.page ?? 1));
  return withSession<KycQueuePage>(`/admin/kyc/queue?${search.toString()}`);
}

export function readKycRecord(userId: string) {
  return withSession<KycStaffRecord>(`/admin/kyc/${userId}`);
}
