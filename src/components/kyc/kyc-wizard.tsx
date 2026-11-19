"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  GHANA_REGIONS,
  KYC_BUSINESS_TYPES,
  KYC_BUSINESS_TYPE_LABELS,
  KYC_DECLARATION_TEXT,
  KYC_MOMO_NETWORKS,
  KYC_MOMO_NETWORK_LABELS,
  KYC_STEPS,
  countryName,
  kycFieldLabel,
  kycStepProgress,
  normaliseGhanaCardPin,
  normaliseGhanaPhone,
  type KycBusinessType,
  type KycDocumentKind,
  type KycMomoNetwork,
  type KycPayoutMethod,
  type KycStepKey,
} from "@adgenie/core";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock,
  Loader2,
  Lock,
  Send,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import {
  ApiError,
  api,
  kycMissingFrom,
  type KycDocumentMeta,
  type KycFieldValues,
  type KycView,
} from "@/lib/api";
import { formErrorClass, fieldClass, labelClass } from "@/components/auth/fields";
import { CountrySelect } from "@/components/ui/country-select";
import { cn } from "@/lib/utils";
import { DocumentUpload } from "./document-upload";

/** Which wizard step owns each field, so a server rejection can jump you there. */
const FIELD_TO_STEP: Record<string, number> = Object.fromEntries(
  KYC_STEPS.flatMap((step) => {
    const keys: Record<KycStepKey, string[]> = {
      identity: ["legal_name", "country", "ghana_card_pin", "date_of_birth", "identity_document"],
      business: [
        "business_type",
        "business_name",
        "registration_number",
        "business_document",
        "tax_id",
        "region",
        "city",
        "address",
        "sector",
        "website_url",
      ],
      payout: [
        "phone_e164",
        "whatsapp_e164",
        "payout_method",
        "payout_network",
        "payout_number",
        "payout_account_name",
        "bank_name",
      ],
      review: ["declaration"],
    };
    return keys[step.key].map((field) => [field, step.id]);
  })
);

const AUTOSAVE_MS = 900;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function savedClock(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/** Local, honest checks before a value is sent — the server still has the last word. */
function localError(field: string, raw: string): string | null {
  const value = raw.trim();
  if (value === "") return null;
  switch (field) {
    case "ghana_card_pin":
      return normaliseGhanaCardPin(value)
        ? null
        : "A Ghana Card PIN reads GHA-123456789-0.";
    case "phone_e164":
    case "whatsapp_e164":
      return normaliseGhanaPhone(value)
        ? null
        : "Use a Ghana number: 024 123 4567 or +233 24 123 4567.";
    case "tax_id":
      return normaliseGhanaCardPin(value.toUpperCase()) || /^[0-9]{7,13}$/.test(value.replace(/\s/g, ""))
        ? null
        : "Your card PIN (GHA-123456789-0) or a 7-13 digit GRA number.";
    case "date_of_birth":
      return /^\d{4}-\d{2}-\d{2}$/.test(value) ? null : "Date of birth must be YYYY-MM-DD.";
    case "payout_number":
      return /^[+0-9\s-]{7,20}$/.test(value) ? null : "Digits only, or a +233 number.";
    case "website_url":
      return /^https?:\/\/.+\..+/.test(value) ? null : "Include http:// or https://.";
    default:
      return null;
  }
}

export function KycWizard({ initial }: { initial: KycView }) {
  const router = useRouter();
  const [view, setView] = useState<KycView>(initial);
  const [values, setValues] = useState<KycFieldValues>(initial.fields);
  const [step, setStep] = useState(() => Math.min(4, Math.max(1, initial.currentStep)));
  const [dirty, setDirty] = useState<Set<string>>(() => new Set());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [stillNeeded, setStillNeeded] = useState<string[]>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | null>(null);
  const editable = view.editable;

  const documentsPresent = useMemo(
    () => ({
      identity_document: view.documents.some((doc) => doc.kind === "identity_document"),
      business_document: view.documents.some((doc) => doc.kind === "business_document"),
    }),
    [view.documents]
  );

  // Predicts what kyc_submit() will say, so the rail can show what is still open.
  // A frozen submission is closed to the client: a field added after it was
  // submitted must not read as something they still owe.
  const steps = useMemo(() => {
    const states = kycStepProgress(values, documentsPresent);
    return view.editable
      ? states
      : states.map((state) => ({ ...state, missing: [], complete: true }));
  }, [values, documentsPresent, view.editable]);
  const readyCount = steps.filter((state) => state.complete).length;
  const stepGaps = stillNeeded.filter((field) => FIELD_TO_STEP[field] === step);

  const set = useCallback((patch: Partial<KycFieldValues>) => {
    setDirty((previous) => {
      const next = new Set(previous);
      for (const key of Object.keys(patch)) next.add(key);
      return next;
    });
    setValues((previous) => ({ ...previous, ...patch }));
  }, []);

  const check = useCallback((field: string, raw: string) => {
    const message = localError(field, raw);
    setFieldErrors((previous) => {
      if (message) return { ...previous, [field]: message };
      if (!(field in previous)) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  }, []);

  /** Ship only what changed and what looks sendable; a half-typed PIN is not worth a 400. */
  const flush = useCallback(
    async (extra: { step?: number } = {}) => {
      const payload: Record<string, unknown> = {};
      if (extra.step !== undefined) payload.step = extra.step;
      for (const key of dirty) {
        if (fieldErrors[key]) continue;
        payload[key] = values[key as keyof KycFieldValues] ?? null;
      }
      if (Object.keys(payload).length === 0) return true;

      setSaving(true);
      setBanner(null);
      try {
        const next = await api<KycView>("/kyc", { method: "PATCH", body: payload });
        const sent = new Set(Object.keys(payload));
        const fields = next.fields as unknown as Record<string, unknown>;
        setView(next);
        setValues((previous) => {
          const merged: Record<string, unknown> = { ...previous };
          for (const key of sent) {
            // A saved key comes back normalised (canonical PIN, +233 number); unsent keys are still being typed.
            if (key in fields) merged[key] = fields[key];
          }
          return merged as unknown as KycFieldValues;
        });
        setDirty((previous) => {
          const next = new Set(previous);
          for (const key of sent) next.delete(key);
          return next;
        });
        setSavedAt(savedClock(new Date()));
        return true;
      } catch (err) {
        setBanner(
          err instanceof ApiError
            ? err.message
            : "We could not save that. Your typing is safe on this screen — try again."
        );
        return false;
      } finally {
        setSaving(false);
      }
    },
    [dirty, fieldErrors, values]
  );

  // Save-and-continue means never losing keystrokes: pause a moment and it is stored.
  useEffect(() => {
    if (!editable || dirty.size === 0) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), AUTOSAVE_MS);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [dirty, values, fieldErrors, editable, flush]);

  const goTo = useCallback(
    (target: number) => {
      setStillNeeded([]);
      setBanner(null);
      setStep(target);
      // A frozen profile cannot hold a step pointer, so reading the answers back
      // must not send a write the API would refuse.
      if (editable) void flush({ step: target });
      if (cardRef.current) {
        cardRef.current.scrollIntoView({
          behavior: prefersReducedMotion() ? "auto" : "smooth",
          block: "start",
        });
      }
    },
    [editable, flush]
  );

  const submit = useCallback(async () => {
    setBanner(null);
    setStillNeeded([]);
    const saved = await flush({ step: 4 });
    if (!saved) return;
    try {
      setView(await api<KycView>("/kyc/submit", { method: "POST" }));
      setSavedAt(null);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        const missing = kycMissingFrom(err);
        setStillNeeded(missing);
        setBanner(err.message);
        const first = missing.map((field) => FIELD_TO_STEP[field]).find(Boolean);
        if (first) setStep(first);
        return;
      }
      setBanner(err instanceof ApiError ? err.message : "Submission failed. Try again.");
    }
  }, [flush, router]);

  const doc = (kind: KycDocumentKind) => view.documents.find((item) => item.kind === kind) ?? null;

  return (
    <div className="shell-wide space-y-8">
      <header className="animate-in">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-400">
          Verify identity
        </p>
        <h1 className="font-display text-3xl font-bold leading-[1.05] tracking-tight text-white md:text-[2.6rem]">
          Four questions, then we can<br />
          <span className="gradient-text-hero glow-text-gold">pay you with confidence.</span>
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/50 md:text-base">
          AdGenie pays out to mobile money and bank accounts, so we check who the account
          belongs to. Answer what you can and leave — everything you type is saved as you go.
        </p>
      </header>

      <StatusBanner view={view} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-5">
          <Stepper steps={steps} step={step} onStep={goTo} />

          <section
            ref={cardRef}
            className="glass-card scroll-mt-24 rounded-2xl p-5 md:p-7 lg:scroll-mt-2"
          >
            {banner ? <p className={formErrorClass}>{banner}</p> : null}

            {step === 1 ? (
              <StepIdentity
                values={values}
                fieldErrors={fieldErrors}
                editable={editable}
                set={set}
                check={check}
                document={doc("identity_document")}
                onSaved={setView}
              />
            ) : null}
            {step === 2 ? (
              <StepBusiness
                values={values}
                fieldErrors={fieldErrors}
                editable={editable}
                set={set}
                check={check}
                document={doc("business_document")}
                onSaved={setView}
              />
            ) : null}
            {step === 3 ? (
              <StepPayout
                values={values}
                fieldErrors={fieldErrors}
                editable={editable}
                set={set}
                check={check}
              />
            ) : null}
            {step === 4 ? (
              <StepReview
                values={values}
                view={view}
                editable={editable}
                set={set}
              />
            ) : null}

            <div className="mt-7 flex items-center justify-between gap-3 border-t border-white/5 pt-5">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => goTo(step - 1)}
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-white/45 transition-colors hover:text-white/80 touch-target"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
              ) : (
                <span />
              )}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => goTo(step + 1)}
                  disabled={!editable}
                  className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 touch-target"
                >
                  {editable ? "Save and continue" : "Continue"}
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void submit()}
                  disabled={!editable || saving}
                  className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 touch-target"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send for review
                    </>
                  )}
                </button>
              )}
            </div>

            {editable && stepGaps.length > 0 ? (
              <p className="mt-4 text-[11px] leading-relaxed text-white/35">
                Still needed here: {stepGaps.map(kycFieldLabel).join(", ")}.
              </p>
            ) : null}
          </section>
        </div>

        <aside className="h-fit rounded-2xl border border-white/8 bg-[#080b16]/80 p-4 backdrop-blur-xl lg:sticky lg:top-24">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/35">
              Progress
            </p>
            <SaveChip saving={saving} savedAt={savedAt} editable={editable} />
          </div>
          <p className="mt-2 font-display text-2xl font-bold text-white">
            {readyCount}
            <span className="text-white/35"> / 4 ready</span>
          </p>
          <div className="mt-3 h-0.5 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-[width] duration-150"
              style={{ width: `${(readyCount / 4) * 100}%` }}
            />
          </div>

          <ol className="mt-4 space-y-1.5">
            {steps.map((state) => (
              <li key={state.id}>
                <button
                  type="button"
                  onClick={() => goTo(state.id)}
                  className={cn(
                    "touch-target flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors",
                    state.id === step ? "bg-white/[0.05]" : "hover:bg-white/[0.03]"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                      state.complete
                        ? "bg-teal-400/20 text-teal-300"
                        : "bg-white/5 text-white/40"
                    )}
                  >
                    {state.complete ? <Check className="h-3 w-3" strokeWidth={3} /> : state.id}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-medium text-white/75">
                      {state.title}
                    </span>
                    {!state.complete ? (
                      <span className="block truncate text-[11px] text-white/30">
                        {state.missing.length} still open
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <div className="mt-5 flex items-start gap-3 rounded-xl border border-teal-400/20 bg-teal-500/[0.07] px-4 py-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" />
            <p className="text-xs leading-relaxed text-teal-100/70">
              Your card number and photos go to one reviewer checking a payout. They are not
              shared with any AI model, and no advertiser ever sees them.
            </p>
          </div>

          <dl className="mt-4 space-y-1.5 text-[11px] text-white/35">
            {view.submittedAt ? (
              <div className="flex items-center gap-2">
                <Clock className="h-3 w-3" />
                <dt>{view.status === "rejected" ? "Last sent" : "Sent for review"}</dt>
                <dd className="ml-auto text-white/50">{view.submittedAt.slice(0, 10)}</dd>
              </div>
            ) : null}
            {view.verifiedAt ? (
              <div className="flex items-center gap-2">
                <Check className="h-3 w-3" />
                <dt>Verified</dt>
                <dd className="ml-auto text-white/50">{view.verifiedAt.slice(0, 10)}</dd>
              </div>
            ) : null}
          </dl>
        </aside>
      </div>
    </div>
  );
}

function SaveChip({
  saving,
  savedAt,
  editable,
}: {
  saving: boolean;
  savedAt: string | null;
  editable: boolean;
}) {
  if (!editable) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-white/40">
      {saving ? (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          Saving
        </>
      ) : savedAt ? (
        <>
          <Check className="h-3 w-3 text-teal-300" />
          Saved {savedAt}
        </>
      ) : (
        <>
          <Lock className="h-3 w-3" />
          Autosaves
        </>
      )}
    </span>
  );
}

function StatusBanner({ view }: { view: KycView }) {
  if (view.status === "under_review") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-500/[0.07] px-5 py-4">
        <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
        <div>
          <p className="text-sm font-semibold text-white">A reviewer has your file</p>
          <p className="mt-1 text-xs leading-relaxed text-white/50">
            Sent {view.submittedAt?.slice(0, 10) ?? "just now"}. Nothing can change while it is
            with them — we will tell you as soon as it is decided.
          </p>
        </div>
      </div>
    );
  }
  if (view.status === "verified") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-teal-400/25 bg-teal-500/[0.07] px-5 py-4">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-300" />
        <div>
          <p className="text-sm font-semibold text-white">This account is verified</p>
          <p className="mt-1 text-xs leading-relaxed text-white/50">
            Checked {view.verifiedAt?.slice(0, 10) ?? "recently"}. Contact support if you need
            your identity or payout details changed — editing them here would no longer describe
            the person who was checked.
          </p>
        </div>
      </div>
    );
  }
  if (view.status === "rejected") {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-rose-400/25 bg-rose-500/[0.07] px-5 py-4">
        <X className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
        <div>
          <p className="text-sm font-semibold text-white">A reviewer sent this back</p>
          <p className="mt-1 text-xs leading-relaxed text-white/50">
            {view.rejectionReason ?? "Something did not match."} Fix it and send it again.
          </p>
        </div>
      </div>
    );
  }
  return null;
}

function Stepper({
  steps,
  step,
  onStep,
}: {
  steps: ReturnType<typeof kycStepProgress>;
  step: number;
  onStep: (id: number) => void;
}) {
  return (
    <ol className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {steps.map((state) => {
        const active = state.id === step;
        return (
          <li key={state.id}>
            <button
              type="button"
              onClick={() => onStep(state.id)}
              aria-current={active ? "step" : undefined}
              className={cn(
                "w-full rounded-xl border px-3 py-2.5 text-left transition-all touch-target",
                active
                  ? "border-amber-400/40 bg-amber-500/10"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20"
              )}
            >
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                    state.complete
                      ? "bg-teal-400/20 text-teal-300"
                      : active
                        ? "bg-amber-400 text-black"
                        : "bg-white/5 text-white/40"
                  )}
                >
                  {state.complete ? <Check className="h-3 w-3" strokeWidth={3} /> : state.id}
                </span>
                <span className="min-w-0 truncate text-xs font-medium text-white/70">
                  {state.title}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
      {error ? (
        <span className="mt-2 block text-[11px] text-rose-300/80">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-[11px] leading-relaxed text-white/30">{hint}</span>
      ) : null}
    </label>
  );
}

function StepHeading({ kicker, title, note }: { kicker: string; title: string; note?: string }) {
  return (
    <div className="mb-6">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-white/35">
        {kicker}
      </p>
      <h2 className="font-display text-xl font-bold text-white">{title}</h2>
      {note ? <p className="mt-2 text-xs leading-relaxed text-white/45">{note}</p> : null}
    </div>
  );
}

type StepProps = {
  values: KycFieldValues;
  fieldErrors: Record<string, string>;
  editable: boolean;
  set: (patch: Partial<KycFieldValues>) => void;
  check: (field: string, raw: string) => void;
};

function StepIdentity({
  values,
  fieldErrors,
  editable,
  set,
  check,
  document,
  onSaved,
}: StepProps & {
  document: KycDocumentMeta | null;
  onSaved: (view: KycView) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-7">
      <StepHeading
        kicker="Step 1 of 4"
        title="Who you are"
        note="Exactly as printed on your Ghana Card. The number is the one the National Identification Authority gave you."
      />

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Full name on the card">
          <input
            className={fieldClass}
            value={(values.legal_name as string | null) ?? ""}
            disabled={!editable}
            placeholder="Ama Serwaa Mensah"
            autoComplete="name"
            onChange={(event) => set({ legal_name: event.target.value })}
            onBlur={(event) => set({ legal_name: event.target.value.trim() })}
          />
        </Field>

        <Field
          label="Country"
          hint="Where you are based. Sets the currency prices are shown in; you are still charged in cedis."
        >
          <CountrySelect
            value={(values.country as string | null) ?? null}
            disabled={!editable}
            placeholder="Choose a country"
            onChange={(code) => set({ country: code })}
          />
        </Field>

        <Field
          label="Ghana Card number"
          hint="We accept it spaced, dashed or plain — it is stored as GHA-123456789-0."
          error={fieldErrors.ghana_card_pin}
        >
          <input
            className={cn(fieldClass, fieldErrors.ghana_card_pin && "border-rose-400/35")}
            value={(values.ghana_card_pin as string | null) ?? ""}
            disabled={!editable}
            placeholder="GHA-123456789-0"
            inputMode="text"
            onChange={(event) => {
              set({ ghana_card_pin: event.target.value });
              check("ghana_card_pin", event.target.value);
            }}
            onBlur={(event) => {
              const pin = normaliseGhanaCardPin(event.target.value);
              if (pin) set({ ghana_card_pin: pin });
            }}
          />
        </Field>

        <Field
          label="Date of birth"
          hint="You must be 18 or older for this to be a real agreement."
          error={fieldErrors.date_of_birth}
        >
          <input
            type="date"
            max={today}
            className={cn(fieldClass, fieldErrors.date_of_birth && "border-rose-400/35")}
            value={(values.date_of_birth as string | null) ?? ""}
            disabled={!editable}
            onChange={(event) => {
              set({ date_of_birth: event.target.value });
              check("date_of_birth", event.target.value);
            }}
          />
        </Field>

        <div className="md:col-span-2">
          <DocumentUpload
            kind="identity_document"
            document={document}
            disabled={!editable}
            onSaved={onSaved}
          />
        </div>
      </div>
    </div>
  );
}

function StepBusiness({
  values,
  fieldErrors,
  editable,
  set,
  check,
  document,
  onSaved,
}: StepProps & {
  document: KycDocumentMeta | null;
  onSaved: (view: KycView) => void;
}) {
  const businessType = (values.business_type ?? null) as KycBusinessType | null;
  const registered = businessType !== null && businessType !== "individual";

  return (
    <div className="space-y-7">
      <StepHeading
        kicker="Step 2 of 4"
        title="The business"
        note="Most people here trade informally. Choose “Just me” and there is nothing else to upload."
      />

      <div>
        <span className={labelClass}>What are you running?</span>
        <div className="grid gap-2 md:grid-cols-2">
          {KYC_BUSINESS_TYPES.map((type) => {
            const selected = businessType === type;
            return (
              <button
                key={type}
                type="button"
                aria-pressed={selected}
                disabled={!editable}
                onClick={() => set({ business_type: type })}
                className={cn(
                  "group relative rounded-2xl border p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50",
                  selected
                    ? "border-amber-400/50 bg-amber-500/10 shadow-[0_8px_30px_rgba(245,158,11,0.12)]"
                    : "border-white/8 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                )}
              >
                <span className="block text-sm font-medium text-white/85">
                  {KYC_BUSINESS_TYPE_LABELS[type]}
                </span>
                {selected ? (
                  <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-black">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="TIN or Ghana Card number" error={fieldErrors.tax_id}>
          <input
            className={cn(fieldClass, fieldErrors.tax_id && "border-rose-400/35")}
            value={(values.tax_id as string | null) ?? ""}
            disabled={!editable}
            placeholder="GHA-123456789-0 or 1234567"
            onChange={(event) => {
              set({ tax_id: event.target.value });
              check("tax_id", event.target.value);
            }}
            onBlur={(event) => {
              const pin = normaliseGhanaCardPin(event.target.value);
              if (pin) set({ tax_id: pin });
            }}
          />
          <span className="mt-1.5 block text-[11px] leading-relaxed text-white/30">
            Since April 2021 your Ghana Card PIN is also your TIN as an individual.
          </span>
        </Field>

        <Field label="Region">
          <span className="relative block">
            <select
              className={cn(fieldClass, "appearance-none pr-10 [&>option]:bg-[#0a0d1c]")}
              value={(values.region as string | null) ?? ""}
              disabled={!editable}
              onChange={(event) => set({ region: event.target.value })}
            >
              <option value="">Choose a region</option>
              {GHANA_REGIONS.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </span>
        </Field>

        <Field label="City or town">
          <input
            className={fieldClass}
            value={(values.city as string | null) ?? ""}
            disabled={!editable}
            placeholder="Kumasi"
            onChange={(event) => set({ city: event.target.value })}
            onBlur={(event) => set({ city: event.target.value.trim() })}
          />
        </Field>

        <Field label="Where you trade" hint="Optional — a landmark or area is enough.">
          <input
            className={fieldClass}
            value={(values.address as string | null) ?? ""}
            disabled={!editable}
            placeholder="Adum, near the fabric block"
            onChange={(event) => set({ address: event.target.value })}
          />
        </Field>
      </div>

      {registered ? (
        <div className="space-y-5 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Business name">
              <input
                className={fieldClass}
                value={(values.business_name as string | null) ?? ""}
                disabled={!editable}
                placeholder="Ama Fabrics"
                onChange={(event) => set({ business_name: event.target.value })}
                onBlur={(event) => set({ business_name: event.target.value.trim() })}
              />
            </Field>
            <Field label="ORC registration number" hint="From your certificate of registration.">
              <input
                className={fieldClass}
                value={(values.registration_number as string | null) ?? ""}
                disabled={!editable}
                placeholder="BN 1042/2024"
                onChange={(event) => set({ registration_number: event.target.value })}
              />
            </Field>
            <Field label="What you sell" hint="Optional — helps us pick better templates.">
              <input
                className={fieldClass}
                value={(values.sector as string | null) ?? ""}
                disabled={!editable}
                placeholder="Fabrics and clothing"
                onChange={(event) => set({ sector: event.target.value })}
              />
            </Field>
            <Field label="Website" hint="Optional." error={fieldErrors.website_url}>
              <input
                className={cn(fieldClass, fieldErrors.website_url && "border-rose-400/35")}
                value={(values.website_url as string | null) ?? ""}
                disabled={!editable}
                placeholder="https://…"
                onChange={(event) => {
                  set({ website_url: event.target.value });
                  check("website_url", event.target.value);
                }}
              />
            </Field>
          </div>
          <DocumentUpload
            kind="business_document"
            document={document}
            disabled={!editable}
            onSaved={onSaved}
          />
        </div>
      ) : (
        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-white/30">
          <Upload className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Nothing to upload when it is just you — your Ghana Card and its number are the whole
          check.
        </p>
      )}
    </div>
  );
}

const PAYOUT_METHOD_LABELS: Record<KycPayoutMethod, string> = {
  momo: "Mobile money",
  bank: "Bank transfer",
};

function StepPayout({ values, fieldErrors, editable, set, check }: StepProps) {
  const method = (values.payout_method ?? null) as KycPayoutMethod | null;
  const numberField = method === "bank" ? "Bank account number" : "Mobile money number";

  return (
    <div className="space-y-7">
      <StepHeading
        kicker="Step 3 of 4"
        title="Where the money lands"
        note="This is where earnings and any refund go. Save it half-finished if you need to check a number — nothing is lost."
      />

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Phone number" error={fieldErrors.phone_e164}>
          <input
            className={cn(fieldClass, fieldErrors.phone_e164 && "border-rose-400/35")}
            value={(values.phone_e164 as string | null) ?? ""}
            disabled={!editable}
            placeholder="024 123 4567"
            inputMode="tel"
            onChange={(event) => {
              set({ phone_e164: event.target.value });
              check("phone_e164", event.target.value);
            }}
            onBlur={(event) => {
              const e164 = normaliseGhanaPhone(event.target.value);
              if (e164) set({ phone_e164: e164 });
            }}
          />
        </Field>
        <Field label="WhatsApp number" error={fieldErrors.whatsapp_e164} hint="Campaign files are sent to you here.">
          <input
            className={cn(fieldClass, fieldErrors.whatsapp_e164 && "border-rose-400/35")}
            value={(values.whatsapp_e164 as string | null) ?? ""}
            disabled={!editable}
            placeholder="024 123 4567"
            inputMode="tel"
            onChange={(event) => {
              set({ whatsapp_e164: event.target.value });
              check("whatsapp_e164", event.target.value);
            }}
            onBlur={(event) => {
              const e164 = normaliseGhanaPhone(event.target.value);
              if (e164) set({ whatsapp_e164: e164 });
            }}
          />
        </Field>
      </div>

      <div>
        <span className={labelClass}>How should we pay you?</span>
        <div className="grid gap-2 md:grid-cols-2">
          {(
            [
              { value: "momo", title: PAYOUT_METHOD_LABELS.momo, note: "MTN MoMo, Telecel Cash or AT Money" },
              { value: "bank", title: PAYOUT_METHOD_LABELS.bank, note: "Any Ghana bank account in your name" },
            ] as const
          ).map((option) => {
            const selected = method === option.value;
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                disabled={!editable}
                onClick={() => set({ payout_method: option.value as KycPayoutMethod })}
                className={cn(
                  "relative rounded-2xl border p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50",
                  selected
                    ? "border-amber-400/50 bg-amber-500/10 shadow-[0_8px_30px_rgba(245,158,11,0.12)]"
                    : "border-white/8 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                )}
              >
                <span className="block text-sm font-medium text-white/85">{option.title}</span>
                <span className="mt-1 block text-[11px] text-white/40">{option.note}</span>
                {selected ? (
                  <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-black">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {method === "momo" ? (
        <div>
          <span className={labelClass}>Network</span>
          <div className="flex flex-wrap gap-2">
            {KYC_MOMO_NETWORKS.map((network) => {
              const selected = (values.payout_network ?? null) === network;
              return (
                <button
                  key={network}
                  type="button"
                  aria-pressed={selected}
                  disabled={!editable}
                  onClick={() => set({ payout_network: network as KycMomoNetwork })}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all touch-target disabled:cursor-not-allowed disabled:opacity-50",
                    selected
                      ? "border-amber-400/50 bg-amber-500/10 text-amber-200"
                      : "border-white/10 bg-white/[0.02] text-white/60 hover:border-white/20"
                  )}
                >
                  {KYC_MOMO_NETWORK_LABELS[network]}
                  {selected ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {method ? (
        <div className="grid gap-5 md:grid-cols-2">
          <Field label={numberField} error={fieldErrors.payout_number}>
            <input
              className={cn(fieldClass, fieldErrors.payout_number && "border-rose-400/35")}
              value={(values.payout_number as string | null) ?? ""}
              disabled={!editable}
              placeholder={method === "bank" ? "1234567890" : "024 123 4567"}
              inputMode="tel"
              onChange={(event) => {
                set({ payout_number: event.target.value });
                check("payout_number", event.target.value);
              }}
              onBlur={(event) => {
                if (method === "momo") {
                  const e164 = normaliseGhanaPhone(event.target.value);
                  if (e164) set({ payout_number: e164 });
                }
              }}
            />
          </Field>
          <Field label="Account holder name" hint="The name the wallet or account is registered under.">
            <input
              className={fieldClass}
              value={(values.payout_account_name as string | null) ?? ""}
              disabled={!editable}
              placeholder="Ama Serwaa Mensah"
              onChange={(event) => set({ payout_account_name: event.target.value })}
              onBlur={(event) => set({ payout_account_name: event.target.value.trim() })}
            />
          </Field>
          {method === "bank" ? (
            <Field label="Bank">
              <input
                className={fieldClass}
                value={(values.bank_name as string | null) ?? ""}
                disabled={!editable}
                placeholder="Ecobank Ghana"
                onChange={(event) => set({ bank_name: event.target.value })}
                onBlur={(event) => set({ bank_name: event.target.value.trim() })}
              />
            </Field>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function StepReview({
  values,
  view,
  editable,
  set,
}: {
  values: KycFieldValues;
  view: KycView;
  editable: boolean;
  set: (patch: Partial<KycFieldValues>) => void;
}) {
  const accepted = Boolean(values.declaration_accepted);

  const rows: Array<[string, string | null]> = [
    ["Name", (values.legal_name as string | null) ?? null],
    ["Country", countryName(values.country as string | null)],
    ["Ghana Card", (values.ghana_card_pin as string | null) ?? null],
    ["Date of birth", (values.date_of_birth as string | null) ?? null],
    [
      "Business",
      (values.business_name as string | null) ??
        KYC_BUSINESS_TYPE_LABELS[values.business_type as KycBusinessType] ??
        null,
    ],
    ["Location", [(values.region as string | null) ?? null, (values.city as string | null) ?? null].filter(Boolean).join(", ") || null],
    ["Phone", (values.phone_e164 as string | null) ?? null],
    ["WhatsApp", (values.whatsapp_e164 as string | null) ?? null],
    [
      "Payout",
      [
        values.payout_method ? PAYOUT_METHOD_LABELS[values.payout_method as KycPayoutMethod] : null,
        values.payout_network
          ? KYC_MOMO_NETWORK_LABELS[values.payout_network as KycMomoNetwork]
          : (values.bank_name as string | null) ?? null,
        (values.payout_number as string | null) ?? null,
      ]
        .filter(Boolean)
        .join(" · ") || null,
    ],
    [
      "Evidence",
      view.documents.length > 0
        ? `${view.documents.length} file${view.documents.length === 1 ? "" : "s"} uploaded`
        : null,
    ],
  ];

  return (
    <div className="space-y-7">
      <StepHeading
        kicker="Step 4 of 4"
        title="Check it, then send"
        note="A reviewer compares these answers with your photos. Anything that does not match comes back to you with a reason."
      />

      <dl className="divide-y divide-white/5 rounded-2xl border border-white/8 bg-white/[0.02]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 px-4 py-2.5">
            <dt className="text-[11px] uppercase tracking-wide text-white/35">{label}</dt>
            <dd
              className={cn(
                "min-w-0 truncate text-right text-xs",
                value ? "text-white/80" : "text-rose-300/70"
              )}
            >
              {value ?? "not answered"}
            </dd>
          </div>
        ))}
      </dl>

      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
        <button
          type="button"
          role="checkbox"
          aria-checked={accepted}
          disabled={!editable}
          onClick={() =>
            set({
              declaration_accepted: !accepted,
              declaration_version: accepted ? null : view.declaration.version,
            })
          }
          className="flex w-full items-start gap-3 text-left disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span
            className={cn(
              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
              accepted ? "border-amber-400/60 bg-amber-400 text-black" : "border-white/15 bg-white/[0.03]"
            )}
          >
            {accepted ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
          </span>
          <span>
            <span className="block text-sm leading-relaxed text-white/80">{KYC_DECLARATION_TEXT}</span>
            <span className="mt-2 block text-[11px] text-white/30">
              Declaration version {view.declaration.version}
              {view.declaration.acceptedAt
                ? ` · accepted ${view.declaration.acceptedAt.slice(0, 10)}`
                : ""}
            </span>
          </span>
        </button>
      </div>

      <p className="text-[11px] leading-relaxed text-white/30">
        Sending hands your file to a reviewer and locks these answers until they decide. You can
        leave and come back at any point before that.
      </p>
    </div>
  );
}
