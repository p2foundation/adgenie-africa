"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { isStaffRole, type AppRole } from "@adgenie/core";
import { signOutAndReset } from "@/lib/sign-out";
import { cn } from "@/lib/utils";
import { LinkPendingIcon } from "./link-pending-icon";
import {
  Sparkles,
  LayoutDashboard,
  PlusCircle,
  CalendarDays,
  Library,
  CreditCard,
  Settings,
  Menu,
  X,
  LogOut,
  Zap,
  ShieldCheck,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/create", icon: PlusCircle, label: "Create campaign" },
  { href: "/calendar", icon: CalendarDays, label: "Calendar" },
  { href: "/library", icon: Library, label: "Library" },
  { href: "/credits", icon: CreditCard, label: "Credits" },
  { href: "/verify", icon: ShieldCheck, label: "Verify identity" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

function SidebarContent({
  onClose,
  balance,
  appRole,
  collapsed = false,
  onToggle,
}: {
  onClose?: () => void;
  balance: number | null;
  appRole: AppRole;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full py-6 px-4">
      {/* Logo lockup + collapse toggle (desktop only) */}
      <div
        className={cn(
          "flex mb-8 px-2",
          collapsed ? "flex-col items-center gap-2" : "items-center justify-between"
        )}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5"
          onClick={onClose}
          title={collapsed ? "AdGenie Africa" : undefined}
        >
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25 shrink-0">
            <Sparkles className="w-4 h-4 text-black" />
          </span>
          {!collapsed && (
            <span className="font-bold text-base tracking-tight whitespace-nowrap">
              <span className="gradient-text-hero">AdGenie</span>
              <span className="text-white/40 ml-1.5 font-normal text-sm">Africa</span>
            </span>
          )}
        </Link>
        {onToggle && (
          <button
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="rounded-lg p-2 text-white/35 hover:text-white/80 hover:bg-white/5 transition-colors touch-target"
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              title={collapsed ? item.label : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 touch-target",
                collapsed ? "justify-center px-0" : "px-3 py-2.5",
                isActive
                  ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                  : "text-white/50 hover:text-white/85 hover:bg-white/5 border border-transparent"
              )}
            >
              {/* Active rail */}
              <span
                className={cn(
                  "absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-gradient-to-b from-amber-400 to-orange-500 transition-opacity",
                  isActive ? "opacity-100" : "opacity-0"
                )}
              />
              <LinkPendingIcon
                active={isActive}
                activeClassName="text-amber-400"
                className="h-4 w-4"
              >
                <item.icon className="h-4 w-4" />
              </LinkPendingIcon>
              {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
              {!collapsed && item.href === "/create" && !isActive && (
                <span className="ml-auto text-[11px] text-amber-300 font-bold bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md uppercase tracking-wide">
                  New
                </span>
              )}
              {collapsed && item.href === "/create" && !isActive && (
                <span
                  className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400"
                  aria-hidden="true"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="space-y-3 pt-4 border-t border-white/8">
        {/* Staff shortcut — only rendered for manager and above */}
        {isStaffRole(appRole) && (
          <Link
            href="/admin"
            onClick={onClose}
            title={collapsed ? "Control room" : undefined}
            className={cn(
              "group flex items-center rounded-xl border border-amber-400/20 bg-gradient-to-r from-amber-500/[0.08] to-transparent text-sm font-medium text-amber-200/90 transition-colors hover:border-amber-400/40 hover:text-amber-200 touch-target",
              collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-3 py-2.5"
            )}
          >
            <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
            {!collapsed && (
              <>
                <span className="whitespace-nowrap">Control room</span>
                <span className="ml-auto text-[9px] font-bold uppercase tracking-[0.14em] text-amber-400/60">
                  Staff
                </span>
              </>
            )}
          </Link>
        )}

        {/* Credit balance — the number that matters most */}
        {collapsed ? (
          <div className="glass rounded-xl py-3 text-center relative overflow-hidden" title="Credits">
            <div
              className="absolute -right-6 -top-8 w-24 h-24 rounded-full bg-amber-500/10 blur-2xl"
              aria-hidden="true"
            />
            <Zap className="w-4 h-4 text-amber-400 mx-auto" />
            <p className="font-display text-lg font-bold text-white leading-none mt-1.5 tabular-nums">
              {balance ?? "—"}
            </p>
          </div>
        ) : (
          <div className="glass rounded-xl px-4 py-3.5 relative overflow-hidden">
            <div className="absolute -right-6 -top-8 w-24 h-24 rounded-full bg-amber-500/10 blur-2xl" aria-hidden="true" />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-white/35 mb-1 flex items-center gap-1.5">
                  <Zap className="w-3 h-3 text-amber-400" />
                  Credits
                </p>
                <p className="font-display text-2xl font-bold text-white leading-none">
                  {balance ?? "—"}
                </p>
              </div>
              <Link
                href="/credits"
                className="text-xs text-amber-300 hover:text-amber-200 font-semibold"
              >
                Top up →
              </Link>
            </div>
          </div>
        )}

        <button
          onClick={signOutAndReset}
          title={collapsed ? "Sign out" : undefined}
          className={cn(
            "flex items-center text-sm text-white/40 hover:text-white/70 transition-colors w-full touch-target",
            collapsed ? "justify-center px-0 py-2" : "gap-2 px-3 py-2"
          )}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span className="whitespace-nowrap">Sign out</span>}
        </button>
      </div>
    </div>
  );
}

export function DashboardSidebar({
  balance,
  appRole,
  initialCollapsed = false,
}: {
  balance: number | null;
  appRole: AppRole;
  initialCollapsed?: boolean;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userCollapsed, setUserCollapsed] = useState(initialCollapsed);
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  // Pages with their own side rail (settings' scrollspy) get the full
  // content width back automatically; leave and the user's choice returns.
  const collapsed = userCollapsed || pathname.startsWith("/settings");

  useEffect(() => {
    // The layout wrapper is the CSS-variable scope; flip it in step with
    // the effective state (user preference OR an auto-collapse page).
    const shell = document.getElementById("app-shell");
    if (shell) shell.dataset.sidebar = collapsed ? "collapsed" : "expanded";
    return () => {
      delete shell?.dataset.sidebar;
    };
  }, [collapsed]);

  function toggleCollapsed() {
    const next = !userCollapsed;
    setUserCollapsed(next);
    document.cookie = `adgenie_sidebar=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
  }

  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="app-sidebar hidden md:block fixed top-0 left-0 h-full glass-card border-r border-white/8 z-20 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <SidebarContent
          balance={balance}
          appRole={appRole}
          collapsed={collapsed}
          onToggle={toggleCollapsed}
        />
      </aside>

      {/* Mobile toggle */}
      <button
        className="md:hidden fixed top-[calc(1rem_+_env(safe-area-inset-top))] left-[calc(1rem_+_env(safe-area-inset-left))] z-50 glass-card p-2.5 rounded-xl touch-target"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-white/70" />
      </button>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={reduceMotion ? false : { x: "-100%" }}
              animate={{ x: 0 }}
              exit={reduceMotion ? undefined : { x: "-100%" }}
              transition={reduceMotion ? { duration: 0 } : { type: "spring", damping: 28, stiffness: 300 }}
              className="md:hidden fixed top-0 left-0 h-full w-72 glass-card border-r border-white/8 z-50 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
            >
              <button
                className="absolute top-4 right-4 text-white/40 hover:text-white touch-target flex items-center justify-center"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
              <SidebarContent onClose={() => setMobileOpen(false)} balance={balance} appRole={appRole} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
