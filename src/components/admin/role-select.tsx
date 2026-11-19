"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ASSIGNABLE_ROLES,
  ROLE_RANK,
  type AppRole,
} from "@adgenie/core";
import { ApiError, api } from "@/lib/api";
import { roleLabel } from "./role-badge";

/**
 * Only the options below the viewer's own rank are offered; the API enforces
 * the same rule, so this is convenience rather than the security boundary.
 */
export function RoleSelect({
  userId,
  currentRole,
  viewerRole,
}: {
  userId: string;
  currentRole: AppRole;
  viewerRole: AppRole;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = ASSIGNABLE_ROLES.filter(
    (role) => ROLE_RANK[role] < ROLE_RANK[viewerRole]
  );

  async function onChange(next: AppRole) {
    if (next === currentRole || pending) return;
    setPending(true);
    setError(null);
    try {
      await api(`/admin/users/${userId}/role`, {
        method: "PATCH",
        body: { role: next },
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not change this role");
      setPending(false);
    }
  }

  return (
    <div className="space-y-1">
      <select
        aria-label={`Role for this account (currently ${roleLabel(currentRole)})`}
        value={currentRole}
        disabled={pending}
        onChange={(event) => onChange(event.target.value as AppRole)}
        className="min-h-[44px] w-full min-w-[7.5rem] rounded-lg border border-white/10 bg-[#0b0f1e] px-2.5 py-1.5 text-xs text-white/80 outline-none transition-colors focus:border-amber-400/50 disabled:opacity-50"
      >
        {options.map((role) => (
          <option key={role} value={role}>
            {roleLabel(role)}
          </option>
        ))}
      </select>
      {error && <p className="max-w-[12rem] text-[10px] leading-snug text-rose-300">{error}</p>}
    </div>
  );
}
