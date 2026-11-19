import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { RevalidateOnRestore } from "@/components/layout/revalidate-on-restore";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { StudioBackdrop } from "@/components/layout/studio-backdrop";
import { PushSync } from "@/components/notifications/push-sync";
import { AssistantProvider } from "@/components/assistant/assistant-provider";
import { AssistantDock } from "@/components/assistant/assistant-dock";
import { readBalance, readSession } from "@/lib/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readSession();
  if (!session) redirect("/sign-in");
  if (!session.emailVerifiedAt) redirect("/verify-email");

  const balance = await readBalance();
  const sidebarCollapsed =
    (await cookies()).get("adgenie_sidebar")?.value === "collapsed";

  return (
    // Carries the sidebar state as a CSS-variable scope, so the persisted
    // width applies from the first paint without any pre-paint script.
    <div
      id="app-shell"
      data-sidebar={sidebarCollapsed ? "collapsed" : "expanded"}
      className="relative min-h-screen flex"
    >
      {/* Liquid-gold studio environment, shared with the auth pages. */}
      <StudioBackdrop />
      <RevalidateOnRestore />
      <PushSync />

      <DashboardSidebar
        balance={balance}
        appRole={session.appRole}
        initialCollapsed={sidebarCollapsed}
      />

      <div className="app-main flex-1 min-w-0 flex flex-col relative z-10">
        <DashboardHeader
          displayName={session.displayName}
          email={session.email}
          appRole={session.appRole}
        />
        <AssistantProvider>
          <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
          <AssistantDock />
        </AssistantProvider>
      </div>
    </div>
  );
}
