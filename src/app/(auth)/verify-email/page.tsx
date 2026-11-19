import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { VerifyEmailPanel } from "@/components/auth/verify-email-panel";
import { readSession } from "@/lib/session";

export const metadata: Metadata = { title: "Confirm your email" };

const points = [
  "Confirmation proves the address is yours before any free credits are issued.",
  "The grant is decided by the database, so nobody can hand out credits by hand.",
  "A link stops working after a day — you can always start again.",
];

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const session = await readSession();

  return (
    <AuthShell
      eyebrow="One step left"
      heading={["Confirm your email.", "Then start selling."]}
      sub="Your account exists and your first campaign can be queued as soon as the address is confirmed."
      points={points}
    >
      <VerifyEmailPanel token={token ?? null} email={session?.email ?? null} />
    </AuthShell>
  );
}
