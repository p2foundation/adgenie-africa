"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { whatsappLink } from "@/lib/site";

export function FinalCta() {
  return (
    <section className="px-4 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.7 }}
        className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] border border-amber-500/20 px-6 py-16 text-center sm:px-12 sm:py-20"
        style={{
          background:
            "radial-gradient(120% 140% at 50% 0%, rgba(251,191,36,0.16) 0%, rgba(124,58,237,0.10) 45%, rgba(6,8,16,0.9) 100%)",
          boxShadow: "0 0 80px rgba(251,191,36,0.10), 0 30px 60px rgba(0,0,0,0.45)",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(251,191,36,0.18),transparent_60%)]" />

        <h2 className="relative font-display text-3xl font-bold leading-tight text-white sm:text-5xl">
          Your next customer
          <br />
          <span className="gradient-text-hero glow-text-gold">is already scrolling.</span>
        </h2>
        <p className="relative mx-auto mt-5 max-w-xl text-white/55 sm:text-lg">
          Give them something worth stopping for. Ten free credits, no card needed,
          first ad in minutes.
        </p>

        <div className="relative mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/sign-up"
            className="btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-sm font-semibold touch-target"
          >
            Start creating — free
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href={whatsappLink("Hi AdGenie, I'd like to know more.")}
            target="_blank"
            rel="noopener noreferrer"
            className="glass inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 px-8 py-4 text-sm font-medium text-white/75 transition-all hover:border-white/30 hover:text-white touch-target"
          >
            <MessageCircle className="h-4 w-4 text-[#25d366]" />
            Talk to us on WhatsApp
          </a>
        </div>
      </motion.div>
    </section>
  );
}
