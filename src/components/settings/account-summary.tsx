import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  CreditCard,
  KeyRound,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import type { BillingSubscription, Profile } from "@/lib/api";

const ROLE_LABEL: Record<string, string> = {
  user: "Client account",
  manager: "Manager",
  admin: "Admin",
  super_admin: "Super admin",
  root: "Root",
};

export function AccountSummary({
  profile,
  balance,
  planLabel,
  subscription,
}: {
  profile: Profile;
  balance: number | null;
  planLabel: string;
  subscription: BillingSubscription | null;
}) {
  const initial = (profile.displayName?.trim() || profile.email || "A")
    .charAt(0)
    .toUpperCase();

  const planHint = subscription
    ? subscription.status === "active"
      ? `Renews ${formatDate(subscription.currentPeriodEnd)}`
      : subscription.status.replace("_", " ")
    : "No monthly plan — top up when you need to.";

  return (
    <section
      id="account"
      aria-labelledby="account-title"
      className="glass-card relative scroll-mt-[calc(208px_+_env(safe-area-inset-top))] overflow-hidden rounded-2xl lg:scroll-mt-24"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />
      <div className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl" aria-hidden="true" />

      <div className="relative space-y-5 p-5 md:p-6">
        <div className="flex flex-wrap items-start gap-4">
          <div className="relative shrink-0">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 font-display text-2xl font-bold text-black shadow-lg shadow-amber-500/25 ring-2 ring-white/10">
              {initial}
            </span>
            {profile.emailVerifiedAt && (
              <span className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#080b16] bg-teal-400 text-black">
                <BadgeCheck className="h-3.5 w-3.5" />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-400/70">
              Account
            </p>
            <h2
              id="account-title"
              className="mt-1 truncate font-display text-xl font-semibold text-white md:text-2xl"
            >
              {profile.displayName || "Your studio"}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-white/50">
              <span className="truncate">{profile.email}</span>
              {profile.phone && (
                <>
                  <span className="h-1 w-1 rounded-full bg-white/20" />
                  <span>{profile.phone}</span>
                </>
              )}
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <span>{ROLE_LABEL[profile.appRole] ?? profile.appRole}</span>
              <span className="h-1 w-1 rounded-full bg-white/20" />
              <span>Since {formatDate(profile.createdAt)}</span>
            </div>
          </div>

          <div className="flex w-full gap-2 sm:w-auto">
            <Link
              href="/credits"
              className="btn-primary inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold touch-target sm:flex-none"
            >
              <Zap className="h-4 w-4" />
              Top up
            </Link>
            <a
              href="#security"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white/65 transition-colors hover:border-white/25 hover:text-white touch-target sm:flex-none"
            >
              <KeyRound className="h-4 w-4" />
              Password
            </a>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="relative overflow-hidden rounded-xl border border-amber-400/15 bg-gradient-to-br from-amber-500/[0.08] to-transparent p-4">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-amber-300/60">
                <Zap className="h-3 w-3" />
                Credits ready
              </p>
              <Link
                href="/credits"
                className="-m-2 flex h-11 w-11 items-center justify-center rounded-lg text-amber-300/50 transition-colors hover:bg-white/5 hover:text-amber-200"
                aria-label="Open credits"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <p className="mt-1.5 font-display text-3xl font-bold leading-none tabular-nums text-white">
              {balance ?? "—"}
            </p>
            <p className="mt-1.5 text-[11px] text-white/50">
              Free and paid credits, ready to spend.
            </p>
          </div>

          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
            <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-white/50">
              <CreditCard className="h-3 w-3" />
              Current plan
            </p>
            <p className="mt-2 font-display text-lg font-semibold leading-tight text-white/90">
              {planLabel}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/50">
              {planHint}
            </p>
          </div>

          <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
            <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-white/50">
              <ShieldCheck className="h-3 w-3" />
              Sign-in
            </p>
            <p className="mt-2 font-display text-lg font-semibold leading-tight text-white/90">
              Email &amp; password
            </p>
            <p className="mt-1 text-xs leading-relaxed text-white/50">
              {profile.emailVerifiedAt
                ? "Email verified. Session protected by an HttpOnly cookie."
                : "Email verification is still pending."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
