"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Sparkles, Menu, X } from "lucide-react";

const navLinks = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#showcase", label: "Showcase" },
  { href: "#verticals", label: "Who it's for" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Track actual height of the mobile menu panel for smooth expand/collapse
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuHeight, setMenuHeight] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Measure menu height whenever it opens so the CSS transition has a target
  useEffect(() => {
    if (menuOpen && menuRef.current) {
      setMenuHeight(menuRef.current.scrollHeight);
    } else {
      setMenuHeight(0);
    }
  }, [menuOpen]);

  return (
    // Replaces <motion.nav initial={{ y:-20, opacity:0 }} animate={{ y:0, opacity:1 }}>
    // Using Tailwind's animate-slide-down utility (defined in globals.css) for the
    // mount animation, which does not require framer-motion.
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        "animate-nav-slide-in", // one-shot slide-in defined below
        menuOpen
          ? "bg-[#070a12]/95 backdrop-blur-xl border-b border-white/5 py-3"
          : scrolled
            ? "glass border-b border-white/5 py-3"
            : "bg-transparent py-5"
      )}
    >
      <div className="mx-auto max-w-6xl px-4 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="group relative flex items-center gap-2 before:absolute before:-inset-y-2 before:-inset-x-1 before:content-['']"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg group-hover:shadow-amber-500/30 transition-shadow">
            <Sparkles className="w-4 h-4 text-black" />
          </div>
          <span className="font-bold text-lg tracking-tight">
            <span className="gradient-text">AdGenie</span>
            <span className="text-white/60 ml-1 font-normal text-sm">Africa</span>
          </span>
        </Link>

        {/* Desktop links */}
        <ul className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="relative inline-flex items-center text-sm text-white/60 transition-colors duration-200 before:absolute before:-inset-y-3 before:-inset-x-2.5 before:content-[''] hover:text-amber-400"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/sign-in"
            className="text-sm text-white/60 hover:text-white transition-colors px-3 py-2 touch-target flex items-center"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="btn-primary text-sm px-4 py-2 rounded-lg touch-target flex items-center"
          >
            Get started free
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="md:hidden touch-target flex items-center justify-center text-white/60 hover:text-white"
          aria-label="Toggle menu"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu — smooth height + opacity transition, no framer-motion */}
      <div
        style={{ height: menuHeight }}
        className="md:hidden overflow-hidden transition-[height,opacity] duration-200 ease-in-out"
        aria-hidden={!menuOpen}
      >
        {/*
          An explicit dark scrim, not .glass: the compiled .glass rule ships
          background/border/shadow but no backdrop-filter, so its 4% white
          panel gave the links nothing to sit on over the bright hero demo card.
        */}
        <div ref={menuRef} className="border-t border-white/5 bg-[#070a12]/95 backdrop-blur-xl">
          <div className="px-4 py-4 space-y-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block text-white/70 hover:text-amber-400 transition-colors py-2 text-sm touch-target"
              >
                {link.label}
              </a>
            ))}
            <hr className="border-white/10" />
            <Link
              href="/sign-in"
              className="block text-white/60 hover:text-white py-2 text-sm touch-target"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="block btn-primary text-center text-sm px-4 py-3 rounded-lg touch-target"
            >
              Get started free
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
