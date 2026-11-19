import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronDown,
  ListTree,
  Mail,
  MessageCircle,
  Sparkles,
} from "lucide-react";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LegalToc } from "@/components/legal/legal-toc";
import { legalPages, mailLink, site, whatsappLink } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { LegalBlock, LegalDoc } from "@/content/legal";

function LegalHeader({ current }: { current: LegalDoc["slug"] }) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-[#060810]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex min-h-[44px] items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
            <Sparkles className="h-4 w-4 text-black" />
          </span>
          <span className="text-base font-bold tracking-tight">
            <span className="gradient-text">AdGenie</span>
            <span className="ml-1 text-xs font-normal text-white/50">Africa</span>
          </span>
        </Link>

        <nav aria-label="Legal pages" className="hidden items-center gap-1 md:flex">
          {legalPages.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              aria-current={current === page.href.slice(1) ? "page" : undefined}
              className={cn(
                "inline-flex min-h-[44px] items-center rounded-full px-3.5 py-2 text-sm transition-colors",
                current === page.href.slice(1)
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:text-white"
              )}
            >
              {page.title}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="hidden min-h-[44px] items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white sm:inline-flex"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
          <Link
            href="/sign-up"
            className="btn-primary rounded-full px-4 py-2 text-sm font-semibold touch-target"
          >
            Get started
          </Link>
        </div>
      </div>

      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-3 md:hidden">
        {legalPages.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            aria-current={current === page.href.slice(1) ? "page" : undefined}
            className={cn(
              "shrink-0 inline-flex touch-target items-center justify-center rounded-full border px-3 py-1.5 text-xs transition-colors",
              current === page.href.slice(1)
                ? "border-amber-400/50 bg-amber-400/10 text-amber-200"
                : "border-white/10 text-white/50"
            )}
          >
            {page.title}
          </Link>
        ))}
      </div>
    </header>
  );
}

function Block({ block }: { block: LegalBlock }) {
  if (block.kind === "list") {
    return (
      <ul className="mt-4 space-y-2.5">
        {block.items.map((item) => (
          <li key={item} className="flex gap-3 text-[15px] leading-7 text-white/60 sm:text-base sm:leading-8">
            <span className="mt-[0.7rem] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400/70" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  if (block.kind === "note") {
    return (
      <aside className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-4 sm:p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300">
          {block.title}
        </p>
        <p className="mt-2 text-sm leading-6 text-amber-50/70">{block.text}</p>
      </aside>
    );
  }

  return (
    <p className="mt-4 text-[15px] leading-7 text-white/60 sm:text-base sm:leading-8">
      {block.text}
    </p>
  );
}

export function LegalPage({ doc }: { doc: LegalDoc }) {
  // doc.title carries the heading's punctuation ("Privacy policy,"), so the
  // clean label from the shared list is what goes in a subject line.
  const pageName = legalPages.find((page) => page.href.slice(1) === doc.slug)?.title ?? doc.title;

  return (
    <main className="relative min-h-screen overflow-x-clip bg-[#060810]">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-amber-400 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black"
      >
        Skip to content
      </a>

      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="orb orb-gold -left-48 top-0 h-[520px] w-[520px] opacity-50" />
        <div className="orb orb-purple -right-40 top-1/3 h-[420px] w-[420px] opacity-40" />
      </div>

      <div className="relative z-10">
        <LegalHeader current={doc.slug} />

        <article id="content">
          <header className="relative overflow-hidden px-4 pb-10 pt-14 sm:pt-20">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-[360px] bg-[radial-gradient(ellipse_60%_60%_at_50%_-20%,rgba(251,191,36,0.12),transparent_70%)]"
            />
            <div className="relative mx-auto max-w-6xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-amber-300">
                Legal · {doc.eyebrow}
              </span>
              <h1 className="mt-5 max-w-3xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl">
                {doc.title} <span className="gradient-text-hero">{doc.highlight}</span>
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-white/55 sm:text-lg">
                {doc.intro}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-2 text-[11px] text-white/40">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Last updated {doc.updated}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
                  <ListTree className="h-3.5 w-3.5" />
                  {doc.sections.length} sections
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
                  Written in plain English
                </span>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-6xl px-4">
            <ul className="grid gap-3 sm:grid-cols-3">
              {doc.summary.map((item, index) => (
                <li
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300/80">
                    <span className="tabular-nums text-white/25">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {item.label}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/60">{item.text}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="mx-auto max-w-6xl px-4 pb-20 pt-12">
            <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-16">
              <aside className="hidden lg:block">
                <div className="sticky top-24">
                  <LegalToc
                    items={doc.sections.map((section) => ({ id: section.id, title: section.title }))}
                  />
                  <p className="mt-6 border-t border-white/5 pt-4 text-[11px] leading-relaxed text-white/25">
                    A person reads every message sent to {site.email}.
                  </p>
                </div>
              </aside>

              <div>
                <details className="group mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:hidden">
                  <summary className="flex min-h-[44px] cursor-pointer list-none items-center justify-between text-sm font-medium text-white/70 [&::-webkit-details-marker]:hidden">
                    <span className="inline-flex items-center gap-2">
                      <ListTree className="h-4 w-4 text-amber-400" />
                      On this page · {doc.sections.length} sections
                    </span>
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
                  </summary>
                  <ol className="mt-4 grid gap-1.5">
                    {doc.sections.map((section, index) => (
                      <li key={section.id}>
                        <a
                          href={`#${section.id}`}
                          className="flex min-h-[44px] items-center gap-3 text-sm text-white/50 hover:text-white"
                        >
                          <span className="text-[10px] tabular-nums text-white/25">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          {section.title}
                        </a>
                      </li>
                    ))}
                  </ol>
                </details>

                <div className="space-y-12">
                  {doc.sections.map((section, index) => (
                    <section
                      key={section.id}
                      id={section.id}
                      aria-labelledby={`${section.id}-title`}
                      /* Stacks on the root's 88px scroll-padding; this only covers
                         the extra height of the header's phone chip row. */
                      className="scroll-mt-8 lg:scroll-mt-0"
                    >
                      <div className="flex items-baseline gap-3">
                        <span className="text-xs font-semibold tabular-nums text-amber-400/60">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <h2
                          id={`${section.id}-title`}
                          className="font-display text-2xl font-bold tracking-tight text-white sm:text-[1.6rem]"
                        >
                          {section.title}
                        </h2>
                      </div>
                      {section.blocks.map((block, blockIndex) => (
                        <Block key={blockIndex} block={block} />
                      ))}
                    </section>
                  ))}
                </div>

                <section className="mt-14 rounded-3xl border border-white/10 bg-[radial-gradient(120%_140%_at_0%_0%,rgba(251,191,36,0.10),rgba(6,8,16,0.4))] p-6 sm:p-8">
                  <h2 className="font-display text-xl font-semibold text-white sm:text-2xl">
                    Questions about this page?
                  </h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-white/55">
                    Write to us and a person answers — no ticket robot. For privacy
                    requests, say “privacy request” in the subject so it reaches the
                    right inbox.
                  </p>
                  <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                    <a
                      href={mailLink(`${pageName} — question`)}
                      className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold touch-target"
                    >
                      <Mail className="h-4 w-4" />
                      Email us
                    </a>
                    <a
                      href={whatsappLink(`Hi AdGenie, I have a question about the ${pageName}.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="glass inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-medium text-white/80 transition-colors hover:border-white/30 hover:text-white touch-target"
                    >
                      <MessageCircle className="h-4 w-4 text-[#25d366]" />
                      WhatsApp
                    </a>
                  </div>
                </section>

                <nav
                  aria-label="Other policies"
                  className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-white/5 pt-6 text-sm"
                >
                  {legalPages
                    .filter((page) => page.href.slice(1) !== doc.slug)
                    .map((page) => (
                      <Link
                        key={page.href}
                        href={page.href}
                        className="inline-flex min-h-[44px] items-center gap-1 text-white/50 transition-colors hover:text-white"
                      >
                        {page.title}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    ))}
                </nav>
              </div>
            </div>
          </div>
        </article>

        <LandingFooter />
      </div>
    </main>
  );
}
