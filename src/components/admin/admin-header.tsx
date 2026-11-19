import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { type AppRole } from "@adgenie/core";
import { AccountMenu } from "@/components/layout/account-menu";
import { LinkPendingIcon } from "@/components/layout/link-pending-icon";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { RoleBadge } from "./role-badge";

export function AdminHeader({
  appRole,
  displayName,
  email,
}: {
  appRole: AppRole;
  displayName: string | null;
  email: string | null;
}) {

  return (
    <header className="sticky top-0 z-30 border-b border-white/8 bg-[#060810]/90 px-4 py-3 backdrop-blur-xl md:px-6 lg:px-8">
      <div className="shell-wide flex items-center gap-3">
        <div className="w-10 md:hidden" />

        <p className="hidden text-sm text-white/40 sm:block">
          <span className="font-medium text-white/70">Control room</span>
          <span className="mx-2 text-white/15">/</span>
          Staff view
        </p>

        <div className="ml-auto flex items-center gap-3">
          <RoleBadge role={appRole} className="hidden sm:inline-flex" />
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white/60 transition-colors hover:border-amber-400/30 hover:text-amber-300 touch-target"
          >
            Studio
            <LinkPendingIcon className="h-3.5 w-3.5">
              <ArrowUpRight className="h-3.5 w-3.5" />
            </LinkPendingIcon>
          </Link>
          <NotificationBell />
          <AccountMenu displayName={displayName} email={email} appRole={appRole} />
        </div>
      </div>
    </header>
  );
}
