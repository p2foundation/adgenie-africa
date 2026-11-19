import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  Coins,
  Sparkles,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";

export interface NotificationTone {
  icon: LucideIcon;
  className: string;
  label: string;
}

const TONES: Record<string, NotificationTone> = {
  kyc_verified: {
    icon: BadgeCheck,
    className: "bg-teal-500/12 text-teal-300",
    label: "Verification",
  },
  kyc_rejected: {
    icon: AlertTriangle,
    className: "bg-rose-500/12 text-rose-300",
    label: "Verification",
  },
  credits_added: {
    icon: Coins,
    className: "bg-emerald-500/12 text-emerald-300",
    label: "Credits",
  },
  campaign_ready: {
    icon: WandSparkles,
    className: "bg-amber-500/12 text-amber-300",
    label: "Campaign",
  },
  campaign_failed: {
    icon: AlertTriangle,
    className: "bg-rose-500/12 text-rose-300",
    label: "Campaign",
  },
  system_test: {
    icon: Sparkles,
    className: "bg-violet-500/12 text-violet-300",
    label: "Test",
  },
};

export function notificationTone(kind: string): NotificationTone {
  return (
    TONES[kind] ?? {
      icon: Bell,
      className: "bg-amber-500/12 text-amber-300",
      label: "Update",
    }
  );
}
