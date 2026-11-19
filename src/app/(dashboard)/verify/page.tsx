import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { KycWizard } from "@/components/kyc/kyc-wizard";
import { readKyc, readSession } from "@/lib/session";

export const metadata: Metadata = { title: "Verify identity" };

export default async function VerifyPage() {
  const [session, kyc] = await Promise.all([readSession(), readKyc()]);

  if (!session) redirect("/sign-in");

  // 401 on /kyc with a live session means the verification service is not
  // answering; a redirect would look like a logged-out app.
  if (!kyc) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-rose-400/20 bg-rose-500/[0.06] p-6">
        <h1 className="font-display text-xl font-semibold text-white">
          Verification is offline
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/50">
          We could not read your verification record, so we cannot show what is still
          needed. Nothing you have already sent is lost. Refresh in a moment.
        </p>
      </div>
    );
  }

  return <KycWizard initial={kyc} />;
}
