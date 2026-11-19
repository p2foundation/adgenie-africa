"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Check, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLANS, formatGhs } from "@adgenie/core";

const planFeatures: Record<string, string[]> = {
  starter: [
    "120 credits every month",
    "Product, seller & event ads",
    "Images: 1:1, 4:5, 9:16",
    "Short video (9:16)",
    "English + French",
    "Twi & Ga (beta)",
  ],
  growth: [
    "350 credits every month",
    "All verticals",
    "All sizes + multi-concept",
    "Up to 3 short videos",
    "All 4 languages",
    "Brand kit upload",
  ],
  business: [
    "1,000 credits every month",
    "Everything in Growth",
    "Venue profile + events",
    "Posting calendar",
    "Priority generation",
    "Admin dashboard",
  ],
  topup: [
    "60 credits, one time",
    "Any vertical",
    "Same-day delivery",
    "Never expires",
  ],
};

const highlighted = "growth";

export function PricingSection() {
  const plans = Object.values(PLANS);

  return (
    <section id="pricing" className="py-24 px-4">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-4 block">
            Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Priced in cedis. Mobile money in Ghana.
          </h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            Monthly plans for steady sellers, one-time top-ups when you just need a burst.
            Mobile money today, cards next.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan, i) => {
            const isHighlighted = plan.code === highlighted;
            const features = planFeatures[plan.code] ?? [];
            const monthly = plan.interval === "monthly";

            return (
              <motion.div
                key={plan.code}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.55, delay: i * 0.08 }}
                className={cn(
                  "relative glass-card rounded-2xl p-6 flex flex-col transition-transform duration-300 hover:-translate-y-1",
                  isHighlighted && "border-amber-500/30 ring-1 ring-amber-500/20 lg:-translate-y-2"
                )}
                style={
                  isHighlighted
                    ? { boxShadow: "0 0 50px rgba(251,191,36,0.15), 0 4px 24px rgba(0,0,0,0.4)" }
                    : undefined
                }
              >
                {isHighlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-400 to-orange-500 text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                      <Zap className="w-3 h-3" />
                      Most popular
                    </span>
                  </div>
                )}

                <div className="mb-5">
                  <h3 className="text-base font-semibold text-white mb-1">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-white/40 mb-4">{plan.description}</p>

                  <div className="flex items-end gap-1.5">
                    <span className="text-3xl font-bold text-white">
                      {formatGhs(plan.price_pesewas)}
                    </span>
                    {monthly && (
                      <span className="text-sm text-white/40 mb-0.5">/month</span>
                    )}
                  </div>
                  <p className="text-xs text-white/30 mt-1">
                    incl. 20% VAT · {formatGhs(plan.price_ex_vat_pesewas)} before VAT
                  </p>
                  <p className="text-xs text-amber-400 font-medium mt-1">
                    {plan.credits} credits
                  </p>
                </div>

                <ul className="flex-1 space-y-2.5 mb-6">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-white/60">
                      <Check className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/sign-up"
                  className={cn(
                    "w-full text-center text-sm font-semibold py-2.5 rounded-xl transition-all touch-target inline-block",
                    isHighlighted
                      ? "btn-primary"
                      : "glass border border-white/10 text-white/70 hover:text-white hover:border-white/20"
                  )}
                >
                  {plan.code === "topup" ? "Top up credits" : "Get started"}
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* Fine print */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center text-xs text-white/25 mt-8"
        >
          Top-up credits never expire. Monthly credits refresh each billing period. New accounts
          get 10 free credits after email or phone verification. Prices in Ghana Cedis, VAT included.
        </motion.p>
      </div>
    </section>
  );
}
