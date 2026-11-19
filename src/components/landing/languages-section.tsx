"use client";

import { motion } from "framer-motion";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Twi and Ga are beta: we show the languages and their extended letters, but no
 * machine-written sample ad copy — that ships only after native-speaker review
 * (5 reviewers, 4/5 on 80% of items). EN and FR samples are final.
 */

const languages = [
  {
    code: "en",
    name: "English",
    status: "Live",
    sample: "Weekend sale — 30% off everything. Order on WhatsApp before Monday.",
    note: "Default language for every vertical.",
    live: true,
  },
  {
    code: "fr",
    name: "Français",
    status: "Live",
    sample: "Solde du week-end — 30% sur tout. Commandez sur WhatsApp avant lundi.",
    note: "For francophone corridors: Côte d'Ivoire, Togo, Burkina.",
    live: true,
  },
  {
    code: "tw",
    name: "Twi",
    status: "Beta",
    glyphs: "a e ɛ i o ɔ u ŋ",
    note: "Every line is reviewed by native speakers before you post — you will see the review notice in the app.",
    live: false,
  },
  {
    code: "gaa",
    name: "Ga",
    status: "Beta",
    glyphs: "a e ɛ i o ɔ ŋ",
    note: "Accra's own language. Same native-speaker review gate as Twi before anything ships.",
    live: false,
  },
];

export function LanguagesSection() {
  return (
    <section id="languages" className="relative py-24 px-4 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_50%_60%_at_80%_20%,rgba(139,92,246,0.07),transparent_70%)]" />

      <div className="relative mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="mb-14 text-center"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-4 block">
            Languages
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Speak to your customer{" "}
            <span className="gradient-text-hero">in their language</span>
          </h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            The same ad, written natively — not translated word by word.
          </p>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {languages.map((lang, i) => (
            <motion.div
              key={lang.code}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.55, delay: i * 0.08 }}
              className="glass-card relative flex flex-col overflow-hidden rounded-2xl p-6"
            >
              <span
                aria-hidden
                className="font-display pointer-events-none absolute -bottom-8 -right-2 select-none text-8xl font-bold text-white/[0.035]"
              >
                {lang.code === "tw" || lang.code === "gaa"
                  ? "ɔ"
                  : lang.code === "fr"
                    ? "é"
                    : "a"}
              </span>

              <div className="relative flex flex-1 flex-col">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">{lang.name}</h3>
                <span
                  className={cn(
                    "relative rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
                    lang.live
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-300"
                  )}
                >
                  {lang.live && (
                    <span
                      aria-hidden
                      className="absolute -left-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-emerald-400 animate-pulse"
                    />
                  )}
                  {lang.status}
                </span>
              </div>

              {lang.sample ? (
                <p className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed text-white/75">
                  &ldquo;{lang.sample}&rdquo;
                </p>
              ) : (
                <p className="mb-4 rounded-xl border border-amber-500/15 bg-amber-500/5 p-4 font-display text-lg font-semibold leading-relaxed tracking-[0.16em] text-amber-200/90">
                  {lang.glyphs}
                </p>
              )}

              <p className="mt-auto text-xs leading-relaxed text-white/45">{lang.note}</p>

              <p className="mt-4 flex items-center gap-1.5 text-[11px] font-medium text-white/40">
                {lang.live ? (
                  <>
                    <BadgeCheck className="h-3.5 w-3.5 text-emerald-400/70" />
                    Production-ready today
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5 text-amber-400/70" />
                    Native-speaker review gate
                  </>
                )}
              </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
