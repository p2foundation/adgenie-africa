"use client";

import { HeroShader } from "@/components/landing/hero-shader";

/**
 * Ambient environment behind every authenticated page. Same liquid-gold
 * shader as the hero and auth screens, at a lower key, so signing in feels
 * like stepping into the studio rather than onto a different website.
 * The CSS gradient sits under the canvas as the no-WebGL fallback.
 */
export function StudioBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="shader-fallback absolute inset-0" />
      <HeroShader className="absolute inset-0 opacity-60" />
      {/* Scrims: top for the header, bottom so content always reads. */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,8,16,0.55)_0%,rgba(6,8,16,0.25)_35%,rgba(6,8,16,0.55)_100%)]" />
      <div className="noise-bg absolute inset-0" />
    </div>
  );
}
