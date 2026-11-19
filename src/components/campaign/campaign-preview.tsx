"use client";

import { useEffect, useRef, useState } from "react";
import {
  drawCreative,
  type CreativeSpec,
  type ProductShape,
} from "@/components/landing/creative-canvas";
import {
  canvasFontFor,
  caseFor,
  ctaFor,
  mixHex,
  primeFace,
  type StudioLook,
} from "@/lib/studio";

type Vertical = "seller" | "company" | "fashion" | "spot";

const LOOKS: Record<
  Vertical,
  { product: ProductShape; bg: [string, string]; accent: string }
> = {
  seller: {
    product: "bag",
    bg: ["#3730a3", "#17133f"],
    accent: "#a5b4fc",
  },
  company: {
    product: "phone",
    bg: ["#0f766e", "#042f2e"],
    accent: "#5eead4",
  },
  fashion: {
    product: "dress",
    bg: ["#4c1d95", "#170f2e"],
    accent: "#fbbf24",
  },
  spot: {
    product: "speaker",
    bg: ["#b45309", "#451a03"],
    accent: "#fde68a",
  },
};

const LANGUAGE_TAG: Record<string, string> = {
  en: "EN",
  fr: "FR",
  tw: "TWI · BETA",
  gaa: "GA · BETA",
};

function headlineLines(headline: string, casing: "upper" | "title"): string[] {
  const words = headline.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [caseFor("Your ad", casing)];
  if (words.length === 1) return [caseFor(words[0]!, casing)];
  const half = Math.ceil(words.length / 2);
  return [
    caseFor(words.slice(0, half).join(" "), casing),
    caseFor(words.slice(half).join(" "), casing),
  ];
}

/**
 * Live direction preview drawn with canvas 2D. It is a layout preview, not a
 * generated asset: the agent replaces the silhouette with the user's photo.
 */
export function CampaignPreview({
  vertical,
  businessName,
  headline,
  priceLabel,
  offerLabel,
  language,
  primary,
  secondary,
  cta,
  look = null,
}: {
  vertical: Vertical;
  businessName: string;
  headline: string;
  priceLabel: string;
  offerLabel: string;
  language: string;
  primary?: string;
  secondary?: string;
  cta?: string;
  look?: StudioLook | null;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const ctaCopy = cta ?? ctaFor(vertical);
  const face = look?.face ?? "grotesk";
  const weight = look?.headlineWeight ?? 700;
  const layout = look?.layout ?? "poster";
  const casing = look?.casing ?? "upper";
  const tracking = look?.tracking ?? 0;
  const [readyFace, setReadyFace] = useState<string | null>(null);
  const faceKey = `${face}:${weight}`;
  const fontReady = readyFace === faceKey;

  useEffect(() => {
    let alive = true;
    void primeFace(face, weight).then(() => {
      if (alive) setReadyFace(`${face}:${weight}`);
    });
    return () => {
      alive = false;
    };
  }, [face, weight]);

  useEffect(() => {
    const lookBg = LOOKS[vertical];
    const brand = (businessName.trim() || "Your business").slice(0, 24);
    const spec: CreativeSpec = {
      brand: caseFor(brand, casing),
      headline: headlineLines(headline, casing),
      product: lookBg.product,
      bg: primary || secondary
        ? [
            mixHex(lookBg.bg[0], secondary ?? lookBg.bg[1], 0.5),
            mixHex(lookBg.bg[1], secondary ?? lookBg.bg[1], 0.22),
          ]
        : lookBg.bg,
      accent: primary ? mixHex(lookBg.accent, primary, 0.68) : lookBg.accent,
      offer: offerLabel.trim()
        ? caseFor(offerLabel.trim().slice(0, 12), casing)
        : undefined,
      price:
        priceLabel.trim() ||
        (vertical === "company" ? "Request a quote" : "Ask on WhatsApp"),
      cta: ctaCopy,
      tag: LANGUAGE_TAG[language] ?? "EN",
      style: {
        layout,
        display: canvasFontFor(face),
        body: canvasFontFor("humanist"),
        tracking,
        weight,
      },
    };

    const canvas = drawCreative(spec, 512, 910);
    canvas.style.width = "100%";
    canvas.style.height = "auto";
    canvas.style.display = "block";
    canvas.setAttribute("role", "img");
    canvas.setAttribute(
      "aria-label",
      `Direction preview: ${spec.headline.join(" ")}, ${spec.cta}`
    );

    hostRef.current?.replaceChildren(canvas);
  }, [
    vertical,
    businessName,
    headline,
    priceLabel,
    offerLabel,
    language,
    primary,
    secondary,
    ctaCopy,
    layout,
    casing,
    tracking,
    face,
    weight,
    fontReady,
  ]);

  return (
    <div
      ref={hostRef}
      className="overflow-hidden rounded-2xl border border-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
    />
  );
}
