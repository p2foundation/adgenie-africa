"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  MonitorSmartphone,
  ShieldCheck,
} from "lucide-react";
import { fieldClass, formErrorClass, labelClass } from "@/components/auth/fields";
import { ApiError, api } from "@/lib/api";
import { signOutAndReset } from "@/lib/sign-out";
import { cn } from "@/lib/utils";

export function PasswordForm({ email }: { email: string | null }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const mismatch = confirm.length > 0 && next !== confirm;
  const same = next.length > 0 && current.length > 0 && next === current;
  const valid =
    current.length > 0 && next.length >= 8 && next === confirm && !same;

  async function signOut() {
    setSigningOut(true);
    await signOutAndReset();
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!valid) return;

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      await api<{ updated: true }>("/account/password", {
        method: "POST",
        body: { current_password: current, new_password: next },
      });
      setCurrent("");
      setNext("");
      setConfirm("");
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not change your password.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      id="security"
      className="glass-card scroll-mt-[calc(208px_+_env(safe-area-inset-top))] overflow-hidden rounded-2xl lg:scroll-mt-24"
      aria-labelledby="security-title"
    >
      <div className="flex items-center gap-3 border-b border-white/6 px-5 py-4 md:px-6">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-500/10 text-teal-300">
          <ShieldCheck className="h-4 w-4" />
        </span>
        <div>
          <h2 id="security-title" className="font-display text-sm font-semibold text-white">
            Sign-in &amp; security
          </h2>
          <p className="mt-0.5 text-[11px] text-white/50">
            Your password and this device&apos;s session.
          </p>
        </div>
      </div>

      <form onSubmit={save} className="space-y-4 p-5 md:p-6">
        {error && <p className={formErrorClass}>{error}</p>}
        {saved && (
          <p className="flex items-start gap-2 rounded-xl border border-teal-400/20 bg-teal-500/[0.07] px-4 py-3 text-xs leading-relaxed text-teal-100/80">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Password updated. This session stays signed in; other devices keep
            theirs until it expires.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <SecretInput
              id="current-password"
              label="Current password"
              value={current}
              onChange={setCurrent}
              autoComplete="current-password"
            />
          </div>
          <SecretInput
            id="new-password"
            label="New password"
            value={next}
            onChange={setNext}
            autoComplete="new-password"
          />
          <SecretInput
            id="confirm-password"
            label="Repeat new password"
            value={confirm}
            onChange={setConfirm}
            autoComplete="new-password"
            invalid={mismatch}
          />
        </div>

        <div className="min-h-[16px] text-xs leading-relaxed text-white/45">
          {mismatch ? (
            <span className="text-rose-300/80">The two new passwords do not match.</span>
          ) : same ? (
            <span className="text-rose-300/80">Pick a password you have not used here.</span>
          ) : (
            "At least 8 characters. Use a phrase only you know."
          )}
        </div>

        <div className="flex justify-end border-t border-white/6 pt-4">
          <button
            type="submit"
            disabled={saving || !valid}
            className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white/75 transition-colors hover:border-teal-400/30 hover:text-teal-100 disabled:cursor-not-allowed disabled:opacity-40 touch-target"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            Update password
          </button>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-3 border-t border-white/6 px-5 py-4 md:px-6">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/[0.03] text-white/50">
          <MonitorSmartphone className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-white/70">This device</p>
          <p className="truncate text-[11px] text-white/50">
            {email ?? "Signed in"} · active now
          </p>
        </div>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="ml-auto inline-flex items-center gap-2 rounded-xl border border-white/10 px-3.5 py-2 text-xs font-medium text-white/50 transition-colors hover:border-rose-400/25 hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-50 touch-target"
        >
          {signingOut ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <LogOut className="h-3.5 w-3.5" />
          )}
          Sign out
        </button>
      </div>
    </section>
  );
}

function SecretInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
  invalid,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  invalid?: boolean;
}) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          maxLength={200}
          required
          className={cn(fieldClass, "pr-11", invalid && "border-rose-400/40")}
        />
        <button
          type="button"
          onClick={() => setShow((visible) => !visible)}
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-white/50 transition-colors hover:text-white/65 touch-target"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
