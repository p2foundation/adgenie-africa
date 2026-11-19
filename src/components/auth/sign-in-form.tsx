"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, api, type SignInResult } from "@/lib/api";
import { fieldClass, formErrorClass, labelClass } from "@/components/auth/fields";

export function SignInForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    try {
      await api<SignInResult>("/auth/sign-in", {
        method: "POST",
        body: {
          email: String(form.get("email") ?? "").trim(),
          password: String(form.get("password") ?? ""),
        },
      });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign you in. Try again.");
      setPending(false);
    }
  }

  return (
    <>
      <h2 className="mb-1 text-center text-xl font-bold text-white lg:text-left">Sign in</h2>
      <p className="mb-6 text-center text-sm text-white/40 lg:text-left">
        Use the email you signed up with
      </p>

      {error && (
        <p className={formErrorClass} role="alert">
          {error}
        </p>
      )}

      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className={fieldClass}
          />
        </div>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="inline-flex min-h-[44px] items-center px-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="btn-primary w-full touch-target rounded-xl py-3 text-sm font-semibold disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="relative my-5">
        <hr className="border-white/10" />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0a0818] px-3 text-xs text-white/25">
          or
        </span>
      </div>

      <button
        type="button"
        disabled
        title="Waiting on a Ghana SMS gateway"
        className="w-full touch-target rounded-xl border border-white/10 bg-white/[0.03] py-3 text-sm font-medium text-white/35"
      >
        Continue with phone OTP — coming soon
      </button>

      <p className="mt-5 text-center text-xs text-white/30">
        Don&apos;t have an account?{" "}
        <Link
          href="/sign-up"
          className="relative text-amber-400 transition-colors before:absolute before:-inset-y-3.5 before:-inset-x-1 before:content-[''] hover:text-amber-300"
        >
          Sign up free
        </Link>
      </p>
    </>
  );
}
