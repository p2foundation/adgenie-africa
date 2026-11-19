"use client";

import { useEffect, useRef } from "react";
import { CREATIVE_SPECS, drawCreative } from "@/components/landing/creative-canvas";

const FORMATS = [
  { label: "1:1", sub: "Feed", width: 132, height: 132, spec: CREATIVE_SPECS[3] },
  { label: "4:5", sub: "Portrait", width: 132, height: 165, spec: CREATIVE_SPECS[1] },
  { label: "9:16", sub: "Story / Reel", width: 108, height: 192, spec: CREATIVE_SPECS[0] },
];

/**
 * The dashboard's empty state, drawn rather than photographed: three mini
 * creatives in the real output aspect ratios, all text code-drawn per the
 * product rule. Costs three small canvases — no image payload at all.
 */
export function FormatPreviewStrip() {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    wrap.querySelectorAll("canvas").forEach((c) => c.remove());

    for (const f of FORMATS) {
      const canvas = drawCreative(f.spec, f.width, f.height);
      canvas.style.width = "100%";
      canvas.style.height = "auto";
      canvas.style.display = "block";
      const slot = wrap.querySelector(`[data-format="${f.label}"]`);
      slot?.prepend(canvas);
    }
  }, []);

  return (
    <div ref={wrapRef} className="flex items-end justify-center gap-4 sm:gap-6">
      {FORMATS.map((f) => (
        <div key={f.label} className="flex flex-col items-center gap-2">
          <div
            data-format={f.label}
            className="rounded-xl overflow-hidden border border-white/10 shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
            style={{ width: f.width }}
          />
          <div className="text-center">
            <p className="text-xs font-bold text-white/70">{f.label}</p>
            <p className="text-[10px] uppercase tracking-widest text-white/30">{f.sub}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
