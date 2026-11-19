"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { ApiError, api, tokenFromVerificationUrl, type SignUpResult } from "@/lib/api";
import { fieldClass, formErrorClass, labelClass } from "@/components/auth/fields";

export function SignUpForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);

    const form = new FormData(event.currentTarget);
    const text = (name: string) => String(form.get(name) ?? "").trim();

    try {
      const result = await api<SignUpResult>("/auth/sign-up", {
        method: "POST",
        body: {
          firstName: text("firstName"),
          lastName: text("lastName"),
          email: text("email"),
          phone: text("phone") || undefined,
          password: String(form.get("password") ?? ""),
          consent: form.get("consent") === "on",
        },
      });
      // In development there is no email provider yet, so the API returns the
      // verification link and we follow it immediately.
      const token = tokenFromVerificationUrl(result.devVerificationUrl);
      router.push(
        token ? `/verify-email?token=${encodeURIComponent(token)}` : "/verify-email"
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create your account. Try again.");
      setPending(false);
    }
  }

  return (
    <>
      <h2 className="mb-1 text-center text-xl font-bold text-white lg:text-left">
        Create your account
      </h2>
      <p className="mb-5 text-center text-sm text-white/40 lg:text-left">
        Start with 10 free credits — no card needed
      </p>

      {error && (
        <p className={formErrorClass} role="alert">
          {error}
        </p>
      )}

      {/* Names share a row from the narrowest phone up: the whole form has to fit
          on one screen, because the next step is the profile, not a scroll. */}
      <form className="grid grid-cols-2 gap-3.5" onSubmit={onSubmit}>
        <div>
          <label htmlFor="firstName" className={labelClass}>
            First name
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            autoComplete="given-name"
            placeholder="Kofi"
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="lastName" className={labelClass}>
            Last name
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            required
            autoComplete="family-name"
            placeholder="Mensah"
            className={fieldClass}
          />
        </div>
        <div className="col-span-2">
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
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="phone" className={labelClass}>
            WhatsApp / phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+233 24 000 0000"
            className={fieldClass}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <label htmlFor="password" className={labelClass}>
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className={fieldClass}
          />
        </div>

        {/* The policy version is stamped by the API when it writes consent_log,
            so the client never carries or displays it. */}
        <label className="flex min-h-[44px] cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-white/45 col-span-2">
          <input
            type="checkbox"
            name="consent"
            required
            className="mt-0.5 h-4 w-4 shrink-0 accent-amber-400"
          />
          <span>
            I agree to the{" "}
            <Link href="/terms" className="text-amber-400 hover:underline">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-amber-400 hover:underline">
              privacy policy
            </Link>
            , and I confirm I have the right to use the photos I upload.
          </span>
        </label>

        <button
          type="submit"
          disabled={pending}
          className="btn-primary w-full touch-target rounded-xl py-3 text-sm font-semibold disabled:opacity-60 col-span-2"
        >
          {pending ? "Creating account…" : "Create free account"}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 lg:justify-start">
        {["No card needed", "Mobile money", "Cancel anytime"].map((p) => (
          <span key={p} className="flex items-center gap-1.5 text-[11px] text-white/40">
            <Check className="h-3 w-3 text-amber-400" />
            {p}
          </span>
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-white/30">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="relative text-amber-400 transition-colors before:absolute before:-inset-y-3.5 before:-inset-x-1 before:content-[''] hover:text-amber-300"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
