"use client";

import { motion } from "framer-motion";
import { Link2, ClipboardCheck, Wand2, Send } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Link2,
    title: "Brief it",
    description:
      "Paste a product link, drop 1–8 photos, or describe your event. Add your brand kit if you have one. Thirty seconds, no design skills.",
    color: "from-amber-400 to-orange-500",
    glow: "rgba(251, 191, 36, 0.15)",
  },
  {
    number: "02",
    icon: ClipboardCheck,
    title: "Approve the plan & price",
    description:
      "The agent shows concepts, copy angles and the exact credit cost before generating anything. No surprise billing, ever.",
    color: "from-violet-400 to-purple-600",
    glow: "rgba(139, 92, 246, 0.15)",
  },
  {
    number: "03",
    icon: Wand2,
    title: "Generate",
    description:
      "Images in 1:1, 4:5 and 9:16, a short vertical video with burned-in captions, and copy in your language. Every price and phone number is drawn by code — never invented.",
    color: "from-teal-400 to-emerald-500",
    glow: "rgba(20, 184, 166, 0.15)",
  },
  {
    number: "04",
    icon: Send,
    title: "Post & sell",
    description:
      "Download ready-to-post files with captions, hashtags and a WhatsApp click-to-chat button. You post it — you own it.",
    color: "from-rose-400 to-pink-600",
    glow: "rgba(244, 63, 94, 0.15)",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-4">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-4 block">
            How it works
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Brief → approve → <span className="gradient-text-hero">post</span>
          </h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            The agent does the work. You see the plan and the price before a single
            credit is spent.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
            >
              <div
                className="glass-card group relative h-full overflow-hidden rounded-2xl p-6 transition-transform duration-300 hover:-translate-y-1"
                style={{ boxShadow: `0 0 40px ${step.glow}, 0 4px 24px rgba(0,0,0,0.3)` }}
              >
                <div
                  aria-hidden
                  className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${step.color}`}
                />
                <span className="absolute -top-2 -right-1 select-none text-8xl font-black text-white/[0.03] transition-colors duration-300 group-hover:text-white/[0.06]">
                  {step.number}
                </span>

                <div
                  className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${step.color} shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6`}
                >
                  <step.icon className="h-5 w-5 text-white" />
                </div>

                <h3 className="mb-3 text-lg font-semibold text-white">{step.title}</h3>
                <p className="text-sm leading-relaxed text-white/55">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
