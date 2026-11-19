import Link from "next/link";
import { Check, Sparkles } from "lucide-react";
import { HeroShader } from "@/components/landing/hero-shader";

export function AuthShell({
  eyebrow,
  heading,
  sub,
  points,
  children,
}: {
  eyebrow: string;
  heading: [string, string];
  sub: string;
  points: string[];
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <HeroShader className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(7,6,15,0.58)_0%,rgba(7,6,15,0.34)_45%,rgba(7,6,15,0.66)_100%)]" />

      <Link
        href="/"
        className="absolute left-5 top-5 z-20 flex min-h-[44px] items-center gap-2 sm:left-8"
        aria-label="AdGenie Africa home"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg">
          <Sparkles className="h-4 w-4 text-black" />
        </span>
        <span className="text-lg font-bold tracking-tight">
          <span className="gradient-text-hero">AdGenie</span>
          <span className="ml-1 text-sm font-normal text-white/60">Africa</span>
        </span>
      </Link>

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl items-center gap-14 px-4 pb-12 pt-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pt-20">
        <section className="hidden lg:block">
          <span className="mb-4 block text-xs font-semibold uppercase tracking-widest text-amber-400">
            {eyebrow}
          </span>
          <h1 className="mb-5 text-4xl font-bold leading-[1.08] text-white xl:text-5xl">
            {heading[0]}
            <br />
            <span className="gradient-text-hero">{heading[1]}</span>
          </h1>
          <p className="mb-8 max-w-md text-white/50">{sub}</p>
          <ul className="max-w-md space-y-3.5">
            {points.map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm text-white/70">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-amber-400/25 bg-amber-400/10">
                  <Check className="h-3 w-3 text-amber-400" />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </section>

        <div className="mx-auto w-full max-w-md">
          <div className="glass-card rounded-3xl p-6 sm:p-7">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}
