"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ShoppingBag, Building2, Camera, MapPin, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const verticals = [
  {
    id: "seller",
    icon: ShoppingBag,
    label: "Sellers & shops",
    tagline: "Turn any product into a WhatsApp-ready ad",
    description:
      "Drop a product URL or up to 8 photos. AdGenie pulls the name, price and description, writes the copy, makes the image and a short vertical video, and puts your WhatsApp number in the call-to-action.",
    outputs: ["Product images", "6–15 s video", "Caption + hashtags", "WhatsApp CTA"],
    accent: "text-amber-300",
    chip: "border-amber-500/25 bg-amber-500/10 text-amber-300",
    iconBg: "from-amber-400 to-orange-500",
  },
  {
    id: "company",
    icon: Building2,
    label: "Companies",
    tagline: "Full campaign packs with your brand kit",
    description:
      "Upload your logo, set brand colours and tone. AdGenie creates a multi-concept campaign pack with different angles, sizes and a posting-calendar suggestion.",
    outputs: ["3 campaign concepts", "Brand kit applied", "Posting calendar", "Multi-size delivery"],
    accent: "text-violet-300",
    chip: "border-violet-500/25 bg-violet-500/10 text-violet-300",
    iconBg: "from-violet-400 to-purple-600",
  },
  {
    id: "fashion",
    icon: Camera,
    label: "Models & fashion",
    tagline: "Lookbooks and collection launches",
    description:
      "Upload your own photos — consent is recorded. Get lookbook ads, collection launch posts, portfolio promos and a video reel from stills, styled for Instagram and TikTok.",
    outputs: ["Lookbook ads", "Launch posts", "Portfolio cards", "Reels from stills"],
    accent: "text-rose-300",
    chip: "border-rose-500/25 bg-rose-500/10 text-rose-300",
    iconBg: "from-rose-400 to-pink-600",
  },
  {
    id: "spot",
    icon: MapPin,
    label: "Spots & events",
    tagline: "Fill your venue this weekend",
    description:
      "Create a reusable venue profile with location, hours and WhatsApp. Add events and get flyers, happy-hour cards, menu highlights and this-weekend posts — all text drawn by code.",
    outputs: ["Event flyers", "Weekend posts", "Menu videos", "Directions + booking CTA"],
    accent: "text-teal-300",
    chip: "border-teal-500/25 bg-teal-500/10 text-teal-300",
    iconBg: "from-teal-400 to-emerald-500",
  },
];

function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-ny * 7).toFixed(2)}deg) rotateY(${(nx * 9).toFixed(2)}deg) translateY(-3px)`;
    el.style.setProperty("--mx", `${((nx + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${((ny + 0.5) * 100).toFixed(1)}%`);
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0)";
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={cn(
        "tilt-card glass-card group relative h-full overflow-hidden rounded-2xl p-6",
        className
      )}
    >
      {children}
    </div>
  );
}

export function VerticalsSection() {
  return (
    <section id="verticals" className="py-24 px-4">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="mb-14 text-center"
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-400 mb-4 block">
            Who it&apos;s for
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">
            Built for every business <span className="gradient-text-hero">on the street</span>
          </h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            Each audience has its own template pack, prompts and outputs.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          {verticals.map((v, i) => (
            <motion.div
              key={v.id}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
            >
              <TiltCard>
                <div className="tilt-glare pointer-events-none absolute inset-0" />

                <div className="mb-5 flex items-start justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${v.iconBg} shadow-lg`}
                  >
                    <v.icon className="h-5 w-5 text-white" />
                  </div>
                  <Link
                    href="/sign-up"
                    aria-label={`Get started for ${v.label}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-white/40 transition-all hover:border-amber-400/40 hover:text-amber-300 touch-target"
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>

                <h3 className="mb-1 text-xl font-semibold text-white">{v.label}</h3>
                <p className={cn("mb-4 text-sm font-medium", v.accent)}>{v.tagline}</p>
                <p className="mb-6 text-sm leading-relaxed text-white/55">{v.description}</p>

                {/* The three shapes every campaign ships in, tinted with this
                    vertical's own accent — a promise, not decoration */}
                <div className="mb-5 flex items-end gap-2.5">
                  {[
                    { shape: "aspect-square w-10", label: "1:1" },
                    { shape: "aspect-[4/5] w-10", label: "4:5" },
                    { shape: "aspect-[9/16] w-8", label: "9:16" },
                  ].map((size) => (
                    <div key={size.label} className="flex flex-col items-center gap-1.5">
                      <span
                        className={cn(
                          "relative overflow-hidden rounded-lg border border-white/15 bg-gradient-to-br opacity-80 transition-opacity duration-300 group-hover:opacity-100",
                          size.shape,
                          v.iconBg
                        )}
                      >
                        <span className="absolute left-1.5 top-1.5 h-1 w-2.5 rounded-full bg-white/50" />
                        <span className="absolute inset-x-1.5 bottom-1.5 h-0.5 rounded-full bg-white/35" />
                      </span>
                      <span className="text-[9px] font-medium text-white/35">{size.label}</span>
                    </div>
                  ))}
                  <span className="ml-1 pb-5 text-[10px] font-medium text-white/30">
                    every size, one brief
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {v.outputs.map((output) => (
                    <span
                      key={output}
                      className={cn("rounded-lg border px-3 py-1.5 text-xs font-medium", v.chip)}
                    >
                      {output}
                    </span>
                  ))}
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
