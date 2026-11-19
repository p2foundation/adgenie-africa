import { redirect } from "next/navigation";
import { isStaffRole } from "@adgenie/core";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { RevalidateOnRestore } from "@/components/layout/revalidate-on-restore";
import { StudioBackdrop } from "@/components/layout/studio-backdrop";
import { PushSync } from "@/components/notifications/push-sync";
import { readSession } from "@/lib/session";

export const metadata = {
  title: { default: "Control room", template: "%s · AdGenie Control room" },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readSession();
  if (!session) redirect("/sign-in");
  if (!session.emailVerifiedAt) redirect("/verify-email");
  // Server-side gate. The API refuses staff routes anyway; this keeps a plain
  // creator from ever seeing the shell, even for a moment.
  if (!isStaffRole(session.appRole)) redirect("/dashboard");

  return (
    <div className="relative flex min-h-screen">
      <StudioBackdrop />
      <RevalidateOnRestore />
      <PushSync />
      <AdminSidebar
        appRole={session.appRole}
        displayName={session.displayName}
        email={session.email}
      />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col md:pl-64 xl:pl-72">
        <AdminHeader
          appRole={session.appRole}
          displayName={session.displayName}
          email={session.email}
        />
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
