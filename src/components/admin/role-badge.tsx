import { type AppRole } from "@adgenie/core";
import { cn } from "@/lib/utils";

const LABELS: Record<AppRole, string> = {
  user: "Creator",
  manager: "Manager",
  admin: "Admin",
  super_admin: "Super admin",
  root: "Root",
};

const STYLES: Record<AppRole, string> = {
  user: "border-white/10 bg-white/5 text-white/45",
  manager: "border-teal-400/25 bg-teal-400/10 text-teal-300",
  admin: "border-sky-400/25 bg-sky-400/10 text-sky-300",
  super_admin: "border-violet-400/25 bg-violet-400/10 text-violet-300",
  root: "border-amber-400/30 bg-amber-400/10 text-amber-300",
};

export function RoleBadge({
  role,
  className,
}: {
  role: AppRole;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
        STYLES[role],
        className
      )}
    >
      {LABELS[role]}
    </span>
  );
}

export function roleLabel(role: AppRole): string {
  return LABELS[role];
}
