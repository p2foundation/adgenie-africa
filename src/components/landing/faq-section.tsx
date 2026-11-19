"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const faqs = [
  {
    q: "What is a credit?",
    a: "One credit is one unit of work: an image costs 2, a short video 10, a piece of copy 1. You see the exact cost of a campaign plan before you approve it, and a failed generation is refunded automatically.",
  },
  {
    q: "What does it cost to start?",
    a: "Nothing — verifying your email or phone gets you 10 free credits. After that, plans start at GH¢169 a month (120 credits) and a one-time top-up of 60 credits is GH¢84. Prices include VAT.",
  },
  {
    q: "How do I pay?",
    a: "Mobile money — MTN, Telecel or AT wallets — charged in Ghana Cedis, with card payments being switched on next. No subscription is required and top-ups never expire.",
  },
  {
    q: "Does AdGenie post the ads for me?",
    a: "Not yet. Version 1 hands you ready-to-post files — the right sizes for feed, story and status, plus captions and a WhatsApp click-to-chat link. You post them wherever you sell. Direct posting is planned once platform approvals are done.",
  },
  {
    q: "Can I trust the Twi and Ga copy?",
    a: "Both languages are in beta. Nothing ships in them without passing a native-speaker review gate, and the app shows a review notice on every Twi or Ga output so you can check before posting.",
  },
  {
    q: "Who owns the ads and my photos?",
    a: "You do. Your photos are used only for your campaigns, photos of people require attested consent, and you can export or delete everything on request.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 px-4">
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="mb-12 text-center"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-4 block">
            FAQ
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            Straight answers
          </h2>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <motion.div
                key={f.q}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ duration: 0.45, delay: i * 0.05 }}
                className={cn(
                  "glass-card overflow-hidden rounded-2xl transition-colors",
                  isOpen && "border-amber-500/25"
                )}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left touch-target"
                >
                  <span className="text-sm font-semibold text-white sm:text-base">
                    {f.q}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-amber-400 transition-transform duration-300",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "grid transition-all duration-300 ease-out",
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="px-6 pb-6 text-sm leading-relaxed text-white/55">
                      {f.a}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
