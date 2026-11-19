import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Mail,
  MapPin,
  MessageCircle,
  Sparkles,
  Wand2,
} from "lucide-react";
import { legalPages, mailLink, site, whatsappLink } from "@/lib/site";

const productLinks = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#showcase", label: "Showcase" },
  { href: "/#verticals", label: "Who it's for" },
  { href: "/#languages", label: "Languages" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

export function LandingFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-white/5 px-4 pb-10 pt-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="orb orb-gold -left-40 bottom-0 h-[420px] w-[420px] opacity-50" />
        <div className="orb orb-teal -right-32 top-0 h-[360px] w-[360px] opacity-40" />
      </div>

      {/* Oversized wordmark, decoration only */}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-6 left-1/2 -translate-x-1/2 select-none whitespace-nowrap font-display text-[clamp(4rem,16vw,13rem)] font-black leading-none tracking-tight text-white/[0.025]"
      >
        AdGenie Africa
      </span>

      <div className="relative mx-auto max-w-6xl">
        <div className="flex flex-col gap-8 border-b border-white/5 pb-10 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href="/" className="group inline-flex min-h-[44px] items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/20 transition-shadow group-hover:shadow-amber-500/40">
                <Sparkles className="h-4 w-4 text-black" />
              </span>
              <span className="text-xl font-bold tracking-tight">
                <span className="gradient-text">AdGenie</span>
                <span className="ml-1 text-sm font-normal text-white/50">Africa</span>
              </span>
            </Link>
            <p className="mt-4 max-w-md text-lg leading-relaxed text-white/55">
              Brief it. Generate it. Post it. Campaigns that look like your shop,
              not a template — priced before you approve, delivered on WhatsApp.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["GHS pricing", "Mobile money", "WhatsApp-first", "Built in Accra"].map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-white/50"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
            <Link
              href="/sign-up"
              className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold touch-target"
            >
              <Wand2 className="h-4 w-4" />
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href={whatsappLink("Hi AdGenie, I'd like to know more.")}
              target="_blank"
              rel="noopener noreferrer"
              className="glass inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-6 py-3.5 text-sm font-medium text-white/80 transition-colors hover:border-white/30 hover:text-white touch-target"
            >
              <MessageCircle className="h-4 w-4 text-[#25d366]" />
              Chat with us
            </a>
          </div>
        </div>

        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/30">
              Talk to a person
            </h2>
            <ul className="mt-5 space-y-4">
              <li>
                <a
                  href={whatsappLink("Hi AdGenie, I need help with a campaign.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex min-h-[44px] items-start gap-3"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#25d366]/25 bg-[#25d366]/10">
                    <MessageCircle className="h-4 w-4 text-[#25d366]" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-white/80 group-hover:text-white">
                      WhatsApp
                    </span>
                    <span className="mt-0.5 block text-xs text-white/40">
                      Fastest — we answer in the app you already use
                    </span>
                  </span>
                </a>
              </li>
              <li>
                <a href={mailLink("AdGenie enquiry")} className="group flex min-h-[44px] items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                    <Mail className="h-4 w-4 text-white/60" />
                  </span>
                  <span>
                    <span className="block break-all text-sm font-medium text-white/80 group-hover:text-white">
                      {site.email}
                    </span>
                    <span className="mt-0.5 block text-xs text-white/40">
                      Billing, privacy requests and partnerships
                    </span>
                  </span>
                </a>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                  <MapPin className="h-4 w-4 text-white/60" />
                </span>
                <span>
                  <span className="block text-sm font-medium text-white/80">{site.location}</span>
                  <span className="mt-0.5 block text-xs text-white/40">
                    Monday to Saturday, 9:00–18:00 GMT
                  </span>
                </span>
              </li>
            </ul>
          </div>

          <nav aria-label="Product">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/30">
              Product
            </h2>
            <ul className="mt-4 space-y-1">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="group inline-flex min-h-[44px] min-w-[44px] items-center gap-1 text-sm text-white/50 transition-colors hover:text-white"
                  >
                    {link.label}
                    <ArrowUpRight className="h-3 w-3 text-white/0 transition-colors group-hover:text-amber-400" />
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/sign-up"
                  className="inline-flex min-h-[44px] items-center text-sm font-medium text-amber-300/90 transition-colors hover:text-amber-200"
                >
                  Sign up free
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="Legal">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/30">
              Trust &amp; legal
            </h2>
            <ul className="mt-4 space-y-1">
              {legalPages.map((page) => (
                <li key={page.href}>
                  <Link
                    href={page.href}
                    className="group inline-flex min-h-[44px] min-w-[44px] items-center gap-1 text-sm text-white/50 transition-colors hover:text-white"
                  >
                    {page.title}
                    <ArrowUpRight className="h-3 w-3 text-white/0 transition-colors group-hover:text-amber-400" />
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-5 max-w-[15rem] text-xs leading-relaxed text-white/30">
              Every image we make for you carries an AI label. Prices, phone numbers
              and calls to action are drawn by code, never by the model.
            </p>
          </nav>
        </div>

        <div className="flex flex-col gap-4 border-t border-white/5 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/30">
            <span className="inline-flex items-center gap-1.5 text-white/25">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
              Made in Accra, Ghana
            </span>
            {legalPages.map((page) => (
              <Link
                key={page.href}
                href={page.href}
                className="inline-flex touch-target items-center transition-colors hover:text-white/70"
              >
                {page.label}
              </Link>
            ))}
            <a
              href="#top"
              className="inline-flex touch-target items-center transition-colors hover:text-white/70"
            >
              Back to top
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
