import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { LibraryView } from "@/components/library/library-view";
import { AssistantPageContext } from "@/components/assistant/page-context";
import type { AssistantContext } from "@/lib/assistant";
import { readLibrary } from "@/lib/session";

export const metadata: Metadata = { title: "Library" };

const TABS = ["all", "plans", "images", "video", "copy"] as const;
type Tab = (typeof TABS)[number];

function pageOf(value: string | undefined) {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    tab?: string;
    plansPage?: string;
    filesPage?: string;
  }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 100);
  const tab: Tab = TABS.includes(params.tab as Tab) ? (params.tab as Tab) : "all";
  const plansPage = pageOf(params.plansPage);
  const filesPage = pageOf(params.filesPage);

  const library = await readLibrary({ q, tab, plansPage, filesPage });
  // null here can only mean a dead session (the endpoint has no 404 case), and
  // notFound() would race the layout's redirect("/sign-in") in the same flight
  // stream, which Next 16 mishandles — redirect instead.
  if (!library) redirect("/sign-in");

  // Genie answers "what should I repost?" from the counts on this page plus the
  // plans currently on the bench — nothing else is looked up.
  const genie: AssistantContext = {
    screen: "library",
    library: {
      plans: library.summary.plans,
      images: library.summary.images,
      videos: library.summary.videos,
      captions: library.summary.captions,
    },
    recentCampaigns: library.plans.items.slice(0, 5).map((plan) => ({
      status: plan.status,
      title: plan.plan?.brief?.headline || plan.goal,
    })),
  };

  return (
    <>
      <AssistantPageContext value={genie} />
      <LibraryView data={library} query={q} tab={tab} />
    </>
  );
}
