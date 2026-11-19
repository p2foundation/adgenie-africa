import { type Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  KYC_BUSINESS_TYPE_LABELS,
  KYC_MOMO_NETWORK_LABELS,
  countryName,
  kycFieldLabel,
  roleAtLeast,
  type KycBusinessType,
  type KycMomoNetwork,
} from "@adgenie/core";
import { DecisionForm, DocumentPreview } from "@/components/admin/kyc-review";
import { StatusPill } from "@/components/admin/kyc-status-pill";
import { formatDateTime } from "@/lib/format";
import { readKycRecord, readSession } from "@/lib/session";

export const metadata: Metadata = { title: "Verification file" };

function Claim({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-[11px] uppercase tracking-wide text-white/35">{label}</dt>
      <dd className={value ? "min-w-0 break-words text-right text-sm text-white/85" : "text-right text-sm text-white/25"}>
        {value || "not answered"}
      </dd>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass-card rounded-2xl p-5">
      <h2 className="mb-2 font-display text-sm font-semibold text-white/80">{title}</h2>
      <dl className="divide-y divide-white/5">{children}</dl>
    </section>
  );
}

export default async function KycRecordPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const [{ userId }, session] = await Promise.all([params, readSession()]);
  if (!session) redirect("/sign-in");

  const record = await readKycRecord(userId);
  if (!record) notFound();

  const f = record.fields;
  const businessType = f.business_type ? KYC_BUSINESS_TYPE_LABELS[f.business_type as KycBusinessType] : null;
  const network = f.payout_network ? KYC_MOMO_NETWORK_LABELS[f.payout_network as KycMomoNetwork] : null;

  return (
    <div className="shell-wide space-y-6">
      <div className="animate-in">
        <Link
          href="/admin/kyc"
          className="inline-flex min-h-[44px] items-center gap-1.5 px-1 text-xs text-white/40 transition-colors hover:text-amber-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Verification queue
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-400">
              {record.account.email ?? "no email"}
            </p>
            <h1 className="font-display text-3xl font-bold leading-[1.05] tracking-tight text-white">
              {f.legal_name ?? record.account.displayName ?? "Unnamed creator"}
            </h1>
          </div>
          <StatusPill status={record.status} />
        </div>
        {record.rejectionReason ? (
          <p className="mt-3 rounded-xl border border-rose-400/20 bg-rose-500/[0.06] px-4 py-3 text-xs leading-relaxed text-rose-100/80">
            Last reason sent back: {record.rejectionReason}
          </p>
        ) : null}
      </div>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          <Group title="Who they say they are">
            <Claim label={kycFieldLabel("legal_name")} value={f.legal_name} />
            <Claim label={kycFieldLabel("country")} value={countryName(f.country)} />
            <Claim label={kycFieldLabel("ghana_card_pin")} value={f.ghana_card_pin} />
            <Claim label={kycFieldLabel("date_of_birth")} value={f.date_of_birth} />
            <Claim label={kycFieldLabel("tax_id")} value={f.tax_id} />
          </Group>

          <Group title="The business">
            <Claim label={kycFieldLabel("business_type")} value={businessType} />
            <Claim label={kycFieldLabel("business_name")} value={f.business_name} />
            <Claim label={kycFieldLabel("registration_number")} value={f.registration_number} />
            <Claim label={kycFieldLabel("region")} value={f.region} />
            <Claim label={kycFieldLabel("city")} value={f.city} />
            <Claim label="Where they trade" value={f.address} />
            <Claim label={kycFieldLabel("sector")} value={f.sector} />
            <Claim label={kycFieldLabel("website_url")} value={f.website_url} />
          </Group>

          <Group title="Where the money lands">
            <Claim label={kycFieldLabel("payout_method")} value={f.payout_method === "momo" ? "Mobile money" : f.payout_method === "bank" ? "Bank transfer" : null} />
            <Claim label={kycFieldLabel("payout_network")} value={network} />
            <Claim label={kycFieldLabel("bank_name")} value={f.bank_name} />
            <Claim label={kycFieldLabel("payout_number")} value={f.payout_number} />
            <Claim label={kycFieldLabel("payout_account_name")} value={f.payout_account_name} />
            <Claim label={kycFieldLabel("phone_e164")} value={f.phone_e164} />
            <Claim label={kycFieldLabel("whatsapp_e164")} value={f.whatsapp_e164} />
          </Group>

          <Group title="Declaration">
            <Claim
              label="Accepted"
              value={
                f.declaration_accepted && f.declaration_version
                  ? `version ${f.declaration_version}`
                  : null
              }
            />
          </Group>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <section className="glass-card rounded-2xl p-4">
            <h2 className="mb-3 font-display text-sm font-semibold text-white/80">Evidence</h2>
            <div className="space-y-3">
              {record.documentRecords.length > 0
                ? record.documentRecords.map((doc) => (
                    <DocumentPreview key={doc.kind} userId={userId} document={doc} />
                  ))
                : null}
              {record.documentRecords.some((doc) => doc.kind === "identity_document") ? null : (
                <p className="text-[11px] text-white/35">No identity document on file.</p>
              )}
              {record.documentRecords.some((doc) => doc.kind === "business_document") ? null : (
                <p className="text-[11px] text-white/35">No business document on file.</p>
              )}
            </div>
          </section>

          <section className="glass-card rounded-2xl p-4">
            <h2 className="mb-3 font-display text-sm font-semibold text-white/80">Decision</h2>
            <DecisionForm
              userId={userId}
              status={record.status}
              canDecide={roleAtLeast(session.appRole, "admin")}
            />
            <dl className="mt-4 space-y-1 text-[10px] text-white/30">
              {record.submittedAt ? (
                <div className="flex justify-between gap-3">
                  <dt>Sent</dt>
                  <dd>{formatDateTime(record.submittedAt)}</dd>
                </div>
              ) : null}
              {record.reviewedAt ? (
                <div className="flex justify-between gap-3">
                  <dt>Decided</dt>
                  <dd>{formatDateTime(record.reviewedAt)}</dd>
                </div>
              ) : null}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
