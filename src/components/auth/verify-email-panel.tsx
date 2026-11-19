"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, MailWarning } from "lucide-react";
import { ApiError, api } from "@/lib/api";

type State = "checking" | "verified" | "failed" | "waiting";

export function VerifyEmailPanel({
  token,
  email,
}: {
  token: string | null;
  email: string | null;
}) {
  const [state, setState] = useState<State>(token ? "checking" : "waiting");
  const [message, setMessage] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    api<{ verified: boolean }>("/auth/verify-email", { method: "POST", body: { token } })
      .then(() => setState("verified"))
      .catch((err) => {
        setMessage(
          err instanceof ApiError ? err.message : "We could not reach the server. Try again."
        );
        setState("failed");
      });
  }, [token]);

  if (state === "checking") {
    return (
      <div className="py-6 text-center">
        <p className="text-sm text-white/60">Confirming your email…</p>
      </div>
    );
  }

  if (state === "verified") {
    return (
      <div className="py-2 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-amber-400/25 bg-amber-400/10">
          <Check className="h-6 w-6 text-amber-400" />
        </span>
        <h2 className="mb-1.5 text-xl font-bold text-white">Email confirmed</h2>
        <p className="mb-6 text-sm text-white/45">
          Your 10 free credits are in the account. No card needed to spend them.
        </p>
        <Link
          href="/dashboard"
          className="btn-primary block w-full touch-target rounded-xl py-3 text-sm font-semibold"
        >
          Go to my dashboard
        </Link>
      </div>
    );
  }

  if (state === "failed") {
    return (
      <div className="py-2 text-center">
        <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-rose-400/25 bg-rose-400/10">
          <MailWarning className="h-6 w-6 text-rose-300" />
        </span>
        <h2 className="mb-1.5 text-xl font-bold text-white">That link did not work</h2>
        <p className="mb-6 text-sm text-white/45">{message}</p>
        <Link
          href="/sign-in"
          className="block w-full touch-target rounded-xl border border-white/10 bg-white/[0.03] py-3 text-sm font-medium text-white/70 transition-all hover:border-white/20 hover:text-white"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="py-2 text-center">
      <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-amber-400/25 bg-amber-400/10">
        <MailWarning className="h-6 w-6 text-amber-400" />
      </span>
      <h2 className="mb-1.5 text-xl font-bold text-white">Confirm your email</h2>
      <p className="mb-6 text-sm text-white/45">
        {email
          ? `Open the link we sent to ${email}. Until you do, your balance stays at 0.`
          : "Open the confirmation link we sent you. Until you do, your balance stays at 0."}
      </p>
      <p className="mb-6 text-xs text-white/30">
        Email sending is not connected yet, so in development the sign-up screen hands
        you the link directly.
      </p>
      <Link
        href="/sign-in"
        className="block w-full touch-target rounded-xl border border-white/10 bg-white/[0.03] py-3 text-sm font-medium text-white/70 transition-all hover:border-white/20 hover:text-white"
      >
        Back to sign in
      </Link>
    </div>
  );
}
