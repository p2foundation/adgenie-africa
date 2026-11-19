import type { KycStatus } from "@adgenie/core";
import { cn } from "@/lib/utils";

const LABELS: Record<KycStatus, string> = {
  in_progress: "Draft",
  under_review: "Waiting",
  verified: "Verified",
  rejected: "Sent back",
};

const STYLES: Record<KycStatus, string> = {
  in_progress: "border-white/10 bg-white/[0.03] text-white/45",
  under_review: "border-amber-400/25 bg-amber-400/[0.08] text-amber-200",
  verified: "border-teal-400/25 bg-teal-500/[0.08] text-teal-200",
  rejected: "border-rose-400/25 bg-rose-500/[0.08] text-rose-200",
};

export function StatusPill({ status }: { status: KycStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
        STYLES[status]
      )}
    >
      {LABELS[status]}
    </span>
  );
}
