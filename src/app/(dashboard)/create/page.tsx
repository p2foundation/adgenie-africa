import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { CreateWizard } from "@/components/campaign/create-wizard";
import {
  readBalance,
  readBrandKit,
  readCampaignCosts,
  readSession,
} from "@/lib/session";

export const metadata: Metadata = { title: "Create campaign" };

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ vertical?: string }>;
}) {
  const { vertical } = await searchParams;
  const [session, balance, costs, kit] = await Promise.all([
    readSession(),
    readBalance(),
    readCampaignCosts(),
    readBrandKit(),
  ]);

  if (!session) redirect("/sign-in");

  if (!costs) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-rose-400/20 bg-rose-500/[0.06] p-6">
        <h1 className="font-display text-xl font-semibold text-white">
          Pricing is offline
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/50">
          We could not read the current generation prices, so the brief cannot be
          priced honestly. Refresh in a moment.
        </p>
      </div>
    );
  }

  return (
    <CreateWizard
      userId={session.id}
      displayName={session.displayName}
      balance={balance ?? 0}
      costs={costs}
      kit={kit}
      defaultLanguage={session.language}
      defaultVertical={vertical ?? session.vertical}
    />
  );
}
