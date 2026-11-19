import type { AdminPaymentStatus, CampaignStatus, SubscriptionStatus } from "@/lib/api";

const CAMPAIGN_LABELS: Record<CampaignStatus, string> = {
  draft: "Draft",
  planned: "Planned",
  running: "Running",
  done: "Done",
  failed: "Failed",
  cancelled: "Cancelled",
};

const CAMPAIGN_STYLES: Record<CampaignStatus, string> = {
  draft: "border-white/10 bg-white/5 text-white/50",
  planned: "border-sky-400/20 bg-sky-400/10 text-sky-300",
  running: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  done: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  failed: "border-rose-400/25 bg-rose-400/10 text-rose-300",
  cancelled: "border-white/8 bg-white/[0.02] text-white/30",
};

export function CampaignStatusPill({ status }: { status: CampaignStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${CAMPAIGN_STYLES[status]}`}
    >
      {CAMPAIGN_LABELS[status]}
    </span>
  );
}

const PAYMENT_LABELS: Record<AdminPaymentStatus, string> = {
  pending: "Pending",
  success: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};

const PAYMENT_STYLES: Record<AdminPaymentStatus, string> = {
  pending: "border-amber-400/20 bg-amber-400/[0.06] text-amber-300/80",
  success: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  failed: "border-rose-400/25 bg-rose-400/10 text-rose-300",
  refunded: "border-violet-400/20 bg-violet-400/10 text-violet-300",
};

export function PaymentStatusPill({ status }: { status: AdminPaymentStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${PAYMENT_STYLES[status]}`}
    >
      {PAYMENT_LABELS[status]}
    </span>
  );
}

const SUBSCRIPTION_LABELS: Record<SubscriptionStatus, string> = {
  active: "Active",
  past_due: "Past due",
  cancelled: "Cancelled",
  expired: "Expired",
};

const SUBSCRIPTION_STYLES: Record<SubscriptionStatus, string> = {
  active: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  past_due: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  cancelled: "border-white/8 bg-white/[0.02] text-white/30",
  expired: "border-white/10 bg-white/5 text-white/45",
};

export function SubscriptionStatusPill({ status }: { status: SubscriptionStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${SUBSCRIPTION_STYLES[status]}`}
    >
      {SUBSCRIPTION_LABELS[status]}
    </span>
  );
}
