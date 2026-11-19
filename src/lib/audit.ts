import type { AuditEntry } from "./api";

const LABELS: Record<string, string> = {
  role_changed: "Role change",
  role_provisioned: "Role provisioned",
  kyc_verified: "Verification approved",
  kyc_rejected: "Verification sent back",
  credits_granted: "Credits granted",
  subscription_assigned: "Plan assigned",
};

const ROLE_WORDS: Record<string, string> = {
  user: "creator",
  manager: "manager",
  admin: "admin",
  super_admin: "super admin",
  root: "root",
};

export function auditActionLabel(action: string): string {
  return (
    LABELS[action] ??
    action.replace(/_/g, " ").replace(/^./, (letter) => letter.toUpperCase())
  );
}

function roleWord(value: unknown): string {
  return typeof value === "string" ? (ROLE_WORDS[value] ?? value.replace(/_/g, " ")) : "?";
}

/** One human sentence per audit action, so the log is readable without decoding JSON. */
export function auditActionSummary(entry: AuditEntry): string {
  const detail = entry.detail ?? {};

  switch (entry.action) {
    case "role_changed":
      return `${roleWord(detail.from)} → ${roleWord(detail.to)}`;
    case "role_provisioned":
      return `${roleWord(detail.to ?? detail.role)} provisioned from the server`;
    case "kyc_verified":
      return "identity verified";
    case "kyc_rejected": {
      const reason = typeof detail.reason === "string" ? detail.reason.trim() : "";
      return reason ? `sent back — “${reason}”` : "sent back without a reason";
    }
    case "credits_granted": {
      const amount = typeof detail.amount === "number" ? detail.amount : null;
      const reason = typeof detail.reason === "string" ? detail.reason.trim() : "";
      return [
        amount === null ? "credits granted" : `${amount.toLocaleString("en-GH")} credits granted`,
        reason ? `“${reason}”` : null,
      ]
        .filter(Boolean)
        .join(" — ");
    }
    case "subscription_assigned": {
      const plan = typeof detail.planName === "string" ? detail.planName : "plan";
      const credits = typeof detail.credits === "number" ? detail.credits : null;
      const reason = typeof detail.reason === "string" ? detail.reason.trim() : "";
      return [
        `${plan} assigned${credits === null ? "" : ` (${credits.toLocaleString("en-GH")} credits)`}`,
        reason ? `“${reason}”` : null,
      ]
        .filter(Boolean)
        .join(" — ");
    }
    default: {
      const keys = Object.keys(detail);
      return keys.length > 0 ? keys.join(", ") : "no detail recorded";
    }
  }
}
