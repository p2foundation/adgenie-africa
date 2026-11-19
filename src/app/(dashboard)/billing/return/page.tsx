import { Metadata } from "next";
import { redirect } from "next/navigation";
import { PaymentReturn } from "@/components/payments/payment-return";
import { readSession } from "@/lib/session";

export const metadata: Metadata = { title: "Payment status" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function BillingReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const session = await readSession();
  if (!session) redirect("/sign-in");

  const { payment } = await searchParams;
  if (!payment || !UUID.test(payment)) redirect("/credits");

  return (
    <div className="mx-auto w-full max-w-2xl py-6">
      <PaymentReturn paymentId={payment} />
    </div>
  );
}
