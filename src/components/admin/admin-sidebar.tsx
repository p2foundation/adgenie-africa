"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { isStaffRole, roleAtLeast, type AppRole } from "@adgenie/core";
import { signOutAndReset } from "@/lib/sign-out";
import { cn } from "@/lib/utils";
import { LinkPendingIcon } from "@/components/layout/link-pending-icon";
import {
  Gauge,
  Users,
  ScrollText,
  ArrowLeft,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Sparkles,
  Megaphone,
  Wallet,
  Repeat,
} from "lucide-react";
import { RoleBadge } from "./role-badge";

function SidebarContent({
  appRole,
  displayName,
  email,
  onClose,
}: {
  appRole: AppRole;
  displayName: string | null;
  email: string | null;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  const items = [
    { href: "/admin", icon: Gauge, label: "Overview", exact: true },
    { href: "/admin/users", icon: Users, label: "Clients", exact: false },
    { href: "/admin/subscriptions", icon: Repeat, label: "Subscriptions", exact: false },
    { href: "/admin/campaigns", icon: Megaphone, label: "Campaigns", exact: false },
    { href: "/admin/kyc", icon: ShieldCheck, label: "Verification", exact: false },
    { href: "/admin/economy", icon: Wallet, label: "Money", exact: false },
    ...(roleAtLeast(appRole, "admin")
      ? [{ href: "/admin/audit", icon: ScrollText, label: "Audit log", exact: false }]
      : []),
  ];

  return (
    <div className="flex h-full flex-col px-4 py-6">
      <div className="mb-6 flex items-center gap-2.5 px-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/25">
          <Sparkles className="h-4 w-4 text-black" />
        </span>
        <span className="text-base font-bold tracking-tight">
          <span className="gradient-text-hero">AdGenie</span>
          <span className="ml-1.5 text-sm font-normal text-white/40">Africa</span>
        </span>
      </div>

      <div className="mb-8 flex items-center gap-2 rounded-xl border border-amber-400/15 bg-amber-400/[0.06] px-3 py-2">
        <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300/90">
          Control room
        </span>
      </div>

      <nav className="flex-1 space-y-1">
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium transition-all duration-200 touch-target",
                active
                  ? "border-amber-500/20 bg-amber-500/10 text-amber-300"
                  : "text-white/50 hover:bg-white/5 hover:text-white/85"
              )}
            >
              <span
                className={cn(
                  "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-amber-400 to-orange-500 transition-opacity",
                  active ? "opacity-100" : "opacity-0"
                )}
                aria-hidden="true"
              />
              <LinkPendingIcon
                active={active}
                activeClassName="text-amber-400"
                className="h-4 w-4"
              >
                <item.icon className="h-4 w-4" />
              </LinkPendingIcon>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-white/8 pt-4">
        <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-[11px] font-bold text-black">
              {(displayName?.trim() || email || "A").charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white/80">
                {displayName ?? "Staff"}
              </p>
              <p className="truncate text-[10px] text-white/35">{email}</p>
            </div>
          </div>
          <div className="mt-2">
            <RoleBadge role={appRole} />
          </div>
        </div>

        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex items-center gap-2 px-3 py-2 text-sm text-white/40 transition-colors hover:text-white/70 touch-target"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to studio
        </Link>

        <button
          onClick={signOutAndReset}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-white/40 transition-colors hover:text-white/70 touch-target"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export function AdminSidebar({
  appRole,
  displayName,
  email,
}: {
  appRole: AppRole;
  displayName: string | null;
  email: string | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const staff = isStaffRole(appRole);

  if (!staff) return null;

  return (
    <>
      <aside className="fixed left-0 top-0 z-20 hidden h-full w-64 xl:w-72 border-r border-white/8 bg-[#070a14]/85 backdrop-blur-2xl md:block">
        <SidebarContent
          appRole={appRole}
          displayName={displayName}
          email={email}
        />
      </aside>

      <button
        className="glass-card fixed left-4 top-4 z-50 rounded-xl p-2.5 touch-target md:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open admin menu"
      >
        <Menu className="h-5 w-5 text-white/70" />
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed left-0 top-0 z-50 h-full w-72 border-r border-white/8 bg-[#070a14]/95 backdrop-blur-2xl md:hidden"
            >
              <button
                className="absolute right-4 top-4 flex items-center justify-center text-white/40 hover:text-white touch-target"
                onClick={() => setMobileOpen(false)}
                aria-label="Close admin menu"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent
                appRole={appRole}
                displayName={displayName}
                email={email}
                onClose={() => setMobileOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
