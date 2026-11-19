import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { type AppRole } from "@adgenie/core";
import { AccountMenu } from "./account-menu";
import { LinkPendingIcon } from "./link-pending-icon";
import { NotificationBell } from "@/components/notifications/notification-bell";

export function DashboardHeader({
  displayName,
  email,
  appRole,
}: {
  displayName: string | null;
  email: string | null;
  appRole: AppRole;
}) {

  return (
    <header className="sticky top-0 z-30 border-b border-white/8 bg-[#060810]/90 px-4 pb-3 pt-[calc(0.75rem_+_env(safe-area-inset-top))] backdrop-blur-xl md:px-6 lg:px-8">
      <div className="shell-wide flex items-center gap-3">
        {/* Left spacer for the mobile menu button */}
        <div className="w-10 md:hidden" />

        <p className="hidden sm:block text-sm text-white/40">
          <span className="text-white/70 font-medium">Your studio</span>
          <span className="mx-2 text-white/15">/</span>
          Plan it. Price it. Post it.
        </p>

        <div className="flex items-center gap-3 ml-auto">
          {/* Quick create */}
          <Link
            href="/create"
            className="btn-primary inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold touch-target"
          >
            <LinkPendingIcon
              className="h-4 w-4"
              spinnerClassName="text-black/80"
            >
              <PlusCircle className="h-4 w-4" />
            </LinkPendingIcon>
            <span className="hidden sm:inline">New campaign</span>
          </Link>

          {/* Notifications */}
          <NotificationBell />

          {/* Avatar → account menu (settings, credits, sign out) */}
          <AccountMenu displayName={displayName} email={email} appRole={appRole} />
        </div>
      </div>
    </header>
  );
}
