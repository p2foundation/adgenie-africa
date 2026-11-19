/**
 * Procedural ad-creative textures for the 3D showcase.
 * Everything is drawn with canvas 2D — headlines, prices and CTAs are code-drawn
 * text, never model output. That is the product's own rule and the demo follows it.
 */

import { inkOn } from "@adgenie/core";

type Ctx2D = CanvasRenderingContext2D & {
  roundRect?: (x: number, y: number, w: number, h: number, r: number) => void;
  letterSpacing?: string;
};

export type ProductShape = "bottle" | "bag" | "dress" | "plate" | "speaker" | "ring" | "phone";

export interface CreativeSpec {
  brand: string;
  headline: string[];
  product: ProductShape;
  bg: [string, string];
  accent: string;
  offer?: string;
  price: string;
  cta: string;
  tag?: string;
  /** Omitted, the frame is the house poster layout. */
  style?: Partial<CreativeStyle>;
}

export const CREATIVE_SPECS: CreativeSpec[] = [
  {
    brand: "KIRA FASHION",
    headline: ["NEW", "DROP"],
    product: "dress",
    bg: ["#4c1d95", "#170f2e"],
    accent: "#fbbf24",
    offer: "NEW",
    price: "from GH¢ 180",
    cta: "Shop on WhatsApp",
    tag: "EN",
  },
  {
    brand: "MAMA'S JOLLOF",
    headline: ["JOLLOF", "NIGHT"],
    product: "plate",
    bg: ["#b45309", "#451a03"],
    accent: "#fde68a",
    offer: "FRI 7PM",
    price: "GH¢ 45 a plate",
    cta: "Book a table",
    tag: "EN",
  },
  {
    brand: "ACCRA SOUND",
    headline: ["FRIDAY", "LIVE"],
    product: "speaker",
    bg: ["#0f766e", "#042f2e"],
    accent: "#5eead4",
    offer: "LIVE",
    price: "from GH¢ 60",
    cta: "Get tickets",
    tag: "EN",
  },
  {
    brand: "SOLE HAUZ",
    headline: ["WEEKEND", "SALE"],
    product: "bag",
    bg: ["#3730a3", "#17133f"],
    accent: "#a5b4fc",
    offer: "-30%",
    price: "GH¢ 249",
    cta: "Order on WhatsApp",
    tag: "EN",
  },
  {
    brand: "GLOW LAB",
    headline: ["GLOW", "SEASON"],
    product: "bottle",
    bg: ["#9d174d", "#3d0a24"],
    accent: "#f9a8d4",
    offer: "NEW",
    price: "GH¢ 89",
    cta: "Shop now",
    tag: "FR",
  },
  {
    brand: "ASANTE GOLD",
    headline: ["AKWABA"],
    product: "ring",
    bg: ["#78350f", "#1c1512"],
    accent: "#fbbf24",
    price: "GH¢ 320",
    cta: "DM on WhatsApp",
    tag: "TWI · BETA",
  },
  {
    brand: "MAKOLA FRESH",
    headline: ["FRESH", "DEALS"],
    product: "bag",
    bg: ["#166534", "#052e16"],
    accent: "#86efac",
    offer: "TODAY",
    price: "GH¢ 20 a bag",
    cta: "Find us",
    tag: "EN",
  },
  {
    brand: "TESHIE BEACH",
    headline: ["POOL", "PARTY"],
    product: "bottle",
    bg: ["#0e7490", "#083344"],
    accent: "#67e8f9",
    offer: "SAT 3PM",
    price: "GH¢ 30 entry",
    cta: "Join guest list",
    tag: "EN",
  },
  {
    brand: "TECHPLUG GH",
    headline: ["FLASH", "SALE"],
    product: "phone",
    bg: ["#334155", "#0f172a"],
    accent: "#94a3b8",
    offer: "-15%",
    price: "GH¢ 1,499",
    cta: "Order on WhatsApp",
    tag: "EN",
  },
];

const DEFAULT_DISPLAY_FONT = `"Space Grotesk", "Noto Sans", sans-serif`;
const DEFAULT_BODY_FONT = `"Noto Sans", sans-serif`;

/**
 * The canvas always composes in a 512×910 design space and is scaled to the
 * requested size. That keeps every layout honest at thumbnail size and lets a
 * brand look change the frame, not just the colours.
 */
const DW = 512;
const DH = 910;

export type CreativeLayout = "poster" | "street" | "editorial" | "corporate";

export interface CreativeStyle {
  layout: CreativeLayout;
  /** Canvas font stacks. Resolved from the app's self-hosted font variables. */
  display: string;
  body: string;
  /** em, applied to the headline. Callers pass final casing in the strings. */
  tracking: number;
  weight: number;
}

export const BASE_STYLE: CreativeStyle = {
  layout: "poster",
  display: DEFAULT_DISPLAY_FONT,
  body: DEFAULT_BODY_FONT,
  tracking: 0,
  weight: 700,
};

function spacing(ctx: Ctx2D, em: number, px: number) {
  ctx.letterSpacing = em > 0 ? `${(em * px).toFixed(1)}px` : "0px";
}

/** Shrinks a headline until the widest line fits its column. */
function fitHeadline(
  ctx: Ctx2D,
  lines: string[],
  style: CreativeStyle,
  widthFor: (index: number) => number,
  base: number,
  min = 44
): number {
  let fit = Infinity;
  spacing(ctx, style.tracking, base);
  lines.forEach((line, index) => {
    ctx.font = `${style.weight} ${base}px ${style.display}`;
    const measured = ctx.measureText(line).width;
    fit = Math.min(fit, (widthFor(index) / Math.max(1, measured)) * base);
  });
  spacing(ctx, 0, base);
  return Math.max(min, Math.floor(fit));
}

/** Two-stop background gradient, steeper for the louder layouts. */
function paintBackground(ctx: Ctx2D, spec: CreativeSpec, skew = 0.4) {
  const [c0, c1] = spec.bg;
  const bg = ctx.createLinearGradient(0, 0, DW * skew, DH);
  bg.addColorStop(0, c0);
  bg.addColorStop(1, c1);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, DW, DH);

  const glow = ctx.createRadialGradient(
    DW * 0.78,
    DH * 0.16,
    20,
    DW * 0.78,
    DH * 0.16,
    DW * 0.9
  );
  glow.addColorStop(0, "rgba(255,255,255,0.16)");
  glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, DW, DH);
}

/** The green hand-off pill every vertical ends on. */
function drawWhatsAppCta(
  ctx: Ctx2D,
  spec: CreativeSpec,
  style: CreativeStyle,
  y: number,
  radius = 37
) {
  const body = style.body;
  ctx.font = `700 30px ${body}`;
  const cw = ctx.measureText(spec.cta).width + 120;
  const cx = (DW - cw) / 2;
  shadow(ctx, "rgba(37,211,102,0.35)", 26, 8);
  ctx.fillStyle = "#25d366";
  ctx.beginPath();
  rr(ctx, cx, y, cw, 74, radius);
  ctx.fill();
  noShadow(ctx);
  ctx.fillStyle = "#0b3d24";
  ctx.font = `700 40px ${body}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("☎", cx + 28, y + 38);
  ctx.fillStyle = "#06130b";
  ctx.font = `700 30px ${body}`;
  ctx.fillText(spec.cta, cx + 82, y + 38);
}

function drawFooterMeta(ctx: Ctx2D, style: CreativeStyle, ratio = "9:16") {
  ctx.font = `500 19px ${style.body}`;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.textAlign = "left";
  ctx.fillText("adgenie — prices & text drawn by code", 44, DH - 46);
  ctx.textAlign = "right";
  ctx.fillText(ratio, DW - 44, DH - 46);
}

function rr(ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number) {
  if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

/** Soft shadow helper */
function shadow(ctx: Ctx2D, color: string, blur: number, offsetY = 0) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetY = offsetY;
}
function noShadow(ctx: Ctx2D) {
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

function drawProduct(
  ctx: Ctx2D,
  spec: CreativeSpec,
  style: CreativeStyle,
  cx: number,
  cy: number,
  s: number
) {
  const FONT_DISPLAY = style.display;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.lineWidth = 6;
  ctx.strokeStyle = "rgba(255,255,255,0.25)";

  if (spec.product === "bottle") {
    shadow(ctx, "rgba(0,0,0,0.45)", 30, 10);
    ctx.fillStyle = spec.accent;
    ctx.beginPath();
    rr(ctx, -55, -70, 110, 200, 26);
    ctx.fill();
    ctx.fillRect(-24, -130, 48, 62);
    noShadow(ctx);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.beginPath();
    rr(ctx, -55, -10, 110, 62, 8);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.font = `700 34px ${FONT_DISPLAY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(spec.brand[0] ?? "A", 0, 22);
  }

  if (spec.product === "bag") {
    shadow(ctx, "rgba(0,0,0,0.45)", 30, 10);
    ctx.fillStyle = spec.accent;
    ctx.beginPath();
    ctx.moveTo(-70, -60);
    ctx.quadraticCurveTo(-80, 110, -60, 118);
    ctx.lineTo(60, 118);
    ctx.quadraticCurveTo(80, 110, 70, -60);
    ctx.closePath();
    ctx.fill();
    noShadow(ctx);
    ctx.strokeStyle = spec.accent;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(-32, -58, 34, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(32, -58, 34, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    rr(ctx, -46, 20, 92, 56, 10);
    ctx.fill();
  }

  if (spec.product === "dress") {
    shadow(ctx, "rgba(0,0,0,0.45)", 30, 10);
    ctx.fillStyle = spec.accent;
    ctx.beginPath();
    ctx.moveTo(-30, -120);
    ctx.lineTo(30, -120);
    ctx.lineTo(40, -40);
    ctx.bezierCurveTo(95, 30, 110, 110, 85, 122);
    ctx.lineTo(-85, 122);
    ctx.bezierCurveTo(-110, 110, -95, 30, -40, -40);
    ctx.closePath();
    ctx.fill();
    noShadow(ctx);
    ctx.strokeStyle = spec.accent;
    ctx.lineWidth = 9;
    ctx.beginPath();
    ctx.moveTo(-26, -120);
    ctx.lineTo(-8, -148);
    ctx.lineTo(8, -148);
    ctx.lineTo(26, -120);
    ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(0, 30, 34, 44, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (spec.product === "plate") {
    shadow(ctx, "rgba(0,0,0,0.45)", 30, 10);
    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.arc(0, 0, 108, 0, Math.PI * 2);
    ctx.fill();
    noShadow(ctx);
    ctx.fillStyle = spec.accent;
    ctx.beginPath();
    ctx.arc(0, 0, 82, 0, Math.PI * 2);
    ctx.fill();
    // jollof grains
    ctx.fillStyle = "rgba(120,53,15,0.85)";
    for (let i = 0; i < 26; i++) {
      const a = i * 2.4;
      const rad = 14 + (i % 7) * 9;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * rad, Math.sin(a) * rad, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#16a34a";
    ctx.beginPath();
    ctx.arc(-38, -30, 13, 0, Math.PI * 2);
    ctx.arc(40, -18, 11, 0, Math.PI * 2);
    ctx.fill();
  }

  if (spec.product === "speaker") {
    shadow(ctx, "rgba(0,0,0,0.45)", 30, 10);
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    rr(ctx, -85, -110, 170, 220, 22);
    ctx.fill();
    noShadow(ctx);
    ctx.strokeStyle = spec.accent;
    ctx.lineWidth = 5;
    ctx.beginPath();
    rr(ctx, -85, -110, 170, 220, 22);
    ctx.stroke();
    for (const [y, r] of [
      [-40, 42],
      [55, 28],
    ] as const) {
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.arc(0, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = spec.accent;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = spec.accent;
      ctx.beginPath();
      ctx.arc(0, y, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (spec.product === "ring") {
    shadow(ctx, "rgba(0,0,0,0.45)", 30, 10);
    ctx.strokeStyle = spec.accent;
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.arc(0, 30, 70, 0, Math.PI * 2);
    ctx.stroke();
    noShadow(ctx);
    ctx.fillStyle = spec.accent;
    ctx.save();
    ctx.translate(0, -52);
    ctx.rotate(Math.PI / 4);
    shadow(ctx, "rgba(255,255,255,0.35)", 24, 0);
    ctx.fillRect(-26, -26, 52, 52);
    noShadow(ctx);
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(-26, -26, 52, 12);
    ctx.restore();
  }

  if (spec.product === "phone") {
    shadow(ctx, "rgba(0,0,0,0.45)", 30, 10);
    ctx.fillStyle = "#0b1220";
    ctx.beginPath();
    rr(ctx, -62, -120, 124, 240, 24);
    ctx.fill();
    noShadow(ctx);
    ctx.strokeStyle = spec.accent;
    ctx.lineWidth = 5;
    ctx.beginPath();
    rr(ctx, -62, -120, 124, 240, 24);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    ctx.beginPath();
    rr(ctx, -48, -104, 96, 176, 12);
    ctx.fill();
    ctx.fillStyle = spec.accent;
    ctx.font = `700 26px ${FONT_DISPLAY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("4G", 0, 8);
    ctx.beginPath();
    ctx.arc(0, 82, 15, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** Draw one creative. The layout comes from the brand look; all four compose
 *  in the same 512×910 design space and scale to whatever box the caller asks
 *  for, so a thumbnail keeps the same hierarchy as the full frame. */
export function drawCreative(spec: CreativeSpec, w = 512, h = 910): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d") as Ctx2D | null;
  if (!ctx) return canvas;
  ctx.setTransform(w / DW, 0, 0, h / DH, 0, 0);

  const style: CreativeStyle = { ...BASE_STYLE, ...spec.style };
  switch (style.layout) {
    case "street":
      drawStreet(ctx, spec, style);
      break;
    case "editorial":
      drawEditorial(ctx, spec, style);
      break;
    case "corporate":
      drawCorporate(ctx, spec, style);
      break;
    default:
      drawPoster(ctx, spec, style);
  }
  return canvas;
}

function drawPoster(ctx: Ctx2D, spec: CreativeSpec, style: CreativeStyle) {
  const w = DW;
  const h = DH;
  const FONT_BODY = style.body;
  const FONT_DISPLAY = style.display;

  paintBackground(ctx, spec, 0.4);

  // Thin inner border — reads as a printed card edge
  ctx.strokeStyle = "rgba(255,255,255,0.28)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  rr(ctx, 16, 16, w - 32, h - 32, 34);
  ctx.stroke();

  // Brand row
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.beginPath();
  ctx.arc(58, 74, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.font = `700 26px ${FONT_BODY}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = "6px";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillText(spec.brand, 82, 75);
  ctx.letterSpacing = "0px";
  if (spec.tag) {
    ctx.font = `600 20px ${FONT_BODY}`;
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.fillText(spec.tag, w - 44, 75);
  }

  // Headline. The offer sticker owns the top-right band, so line 1 is measured
  // against a narrower box and the whole block shrinks to clear it.
  const single = spec.headline.length === 1;
  let size = single ? 118 : spec.headline[0]!.length > 6 ? 92 : 104;

  let offerW = 0;
  if (spec.offer) {
    ctx.font = `700 28px ${FONT_DISPLAY}`;
    offerW = Math.max(112, ctx.measureText(spec.offer).width + 40);
  }

  size = fitHeadline(
    ctx,
    spec.headline,
    style,
    (index) => (index === 0 && spec.offer ? w - 88 - offerW - 18 : w - 88),
    size,
    52
  );

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `${style.weight} ${size}px ${FONT_DISPLAY}`;
  spacing(ctx, style.tracking, size);
  let y = single ? 250 : 210;
  for (const line of spec.headline) {
    shadow(ctx, "rgba(0,0,0,0.35)", 14, 4);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(line, 44, y);
    noShadow(ctx);
    y += size * 1.04;
  }
  spacing(ctx, 0, size);

  // Offer sticker: sized to its own text so long offers never overflow the pill.
  if (spec.offer) {
    const ow = offerW;
    ctx.save();
    ctx.translate(w - 44 - ow / 2, 156);
    ctx.rotate(0.16);
    shadow(ctx, "rgba(0,0,0,0.4)", 18, 6);
    ctx.fillStyle = spec.accent;
    ctx.beginPath();
    rr(ctx, -ow / 2, -28, ow, 56, 28);
    ctx.fill();
    noShadow(ctx);
    ctx.fillStyle = "#0b0a1a";
    ctx.font = `700 28px ${FONT_DISPLAY}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(spec.offer, 0, 2);
    ctx.restore();
  }

  // Price pill
  const priceY = single ? 300 : y + 2;
  ctx.font = `700 34px ${FONT_BODY}`;
  const pw = ctx.measureText(spec.price).width + 56;
  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.beginPath();
  rr(ctx, 44, priceY, pw, 62, 31);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(spec.price, 72, priceY + 33);

  // Product silhouette
  drawProduct(ctx, spec, style, w / 2, priceY + 225, spec.product === "plate" ? 0.92 : 0.95);

  drawWhatsAppCta(ctx, spec, style, h - 128);

  // Footer meta
  drawFooterMeta(ctx, style);
}

/**
 * Street: a flyer taped to a wall. Bands, tape, hard shadows, nothing inside
 * a tidy frame. Carries the bold-poster looks where the offer must land first.
 */
function drawStreet(ctx: Ctx2D, spec: CreativeSpec, style: CreativeStyle) {
  const FONT_DISPLAY = style.display;
  const FONT_BODY = style.body;

  paintBackground(ctx, spec, 0.15);

  ctx.save();
  ctx.globalAlpha = 0.13;
  ctx.fillStyle = spec.accent;
  for (let i = 0; i < 3; i++) {
    ctx.save();
    ctx.translate(DW / 2, DH * (0.3 + i * 0.24));
    ctx.rotate(-0.34);
    ctx.fillRect(-DW, -12 - i * 3, DW * 2, 22 + i * 7);
    ctx.restore();
  }
  ctx.restore();

  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 10;
  ctx.beginPath();
  rr(ctx, 20, 20, DW - 40, DH - 40, 6);
  ctx.stroke();

  // Brand on a strip of tape
  ctx.font = `700 24px ${FONT_BODY}`;
  const brandW = ctx.measureText(spec.brand).width + 44;
  ctx.save();
  ctx.translate(48 + brandW / 2, 92);
  ctx.rotate(-0.035);
  ctx.fillStyle = spec.accent;
  ctx.fillRect(-brandW / 2, -23, brandW, 46);
  ctx.fillStyle = inkOn(spec.accent);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = "3px";
  ctx.fillText(spec.brand, 0, 1);
  ctx.letterSpacing = "0px";
  ctx.restore();

  if (spec.tag) {
    ctx.font = `600 20px ${FONT_BODY}`;
    ctx.textAlign = "right";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText(spec.tag, DW - 52, 92);
  }

  // Headline with a hard offset, the way a screen-printed flyer sits
  const single = spec.headline.length === 1;
  let size = single ? 138 : spec.headline[0]!.length > 6 ? 104 : 122;
  size = fitHeadline(ctx, spec.headline, style, () => DW - 100, size, 58);

  ctx.font = `${style.weight} ${size}px ${FONT_DISPLAY}`;
  spacing(ctx, style.tracking, size);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  let y = single ? 306 : 262;
  for (const line of spec.headline) {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillText(line, 52, y + 6);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(line, 46, y);
    y += size * 1.0;
  }
  spacing(ctx, 0, size);

  // Offer sticker, white keyline so it survives any background
  if (spec.offer) {
    ctx.font = `700 30px ${FONT_DISPLAY}`;
    const ow = Math.max(124, ctx.measureText(spec.offer).width + 48);
    ctx.save();
    ctx.translate(DW - 56 - ow / 2, 190);
    ctx.rotate(0.14);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    rr(ctx, -ow / 2 - 7, -35, ow + 14, 70, 10);
    ctx.fill();
    ctx.fillStyle = spec.accent;
    ctx.beginPath();
    rr(ctx, -ow / 2, -28, ow, 56, 7);
    ctx.fill();
    ctx.fillStyle = inkOn(spec.accent);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(spec.offer, 0, 2);
    ctx.restore();
  }

  // Price on a taped band
  const priceY = single ? 380 : y + 22;
  ctx.font = `700 36px ${FONT_BODY}`;
  const pw = ctx.measureText(spec.price).width + 64;
  ctx.save();
  ctx.translate(46 + pw / 2, priceY);
  ctx.rotate(-0.03);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-pw / 2, -33, pw, 66);
  ctx.fillStyle = "#0b0a1a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(spec.price, 0, 1);
  ctx.restore();

  drawProduct(ctx, spec, style, DW / 2, priceY + 206, spec.product === "plate" ? 0.9 : 0.94);

  const ctaY = DH - 132;
  ctx.font = `700 30px ${FONT_BODY}`;
  const cw = ctx.measureText(spec.cta).width + 118;
  const cx = (DW - cw) / 2;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(cx + 9, ctaY + 9, cw, 74);
  ctx.fillStyle = "#25d366";
  ctx.fillRect(cx, ctaY, cw, 74);
  ctx.fillStyle = "#06130b";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(spec.cta, cx + 40, ctaY + 38);

  drawFooterMeta(ctx, style);
}

/**
 * Editorial: space, hairlines and one serif statement. Nothing rotates,
 * nothing shouts, the price sits in the type instead of a pill.
 */
function drawEditorial(ctx: Ctx2D, spec: CreativeSpec, style: CreativeStyle) {
  const FONT_DISPLAY = style.display;
  const FONT_BODY = style.body;

  paintBackground(ctx, spec, 0.85);

  ctx.strokeStyle = "rgba(255,255,255,0.34)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  rr(ctx, 30, 30, DW - 60, DH - 60, 0);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.14)";
  ctx.beginPath();
  rr(ctx, 40, 40, DW - 80, DH - 80, 0);
  ctx.stroke();

  ctx.font = `600 21px ${FONT_BODY}`;
  ctx.letterSpacing = "9px";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.82)";
  ctx.fillText(spec.brand, DW / 2, 104);
  ctx.letterSpacing = "0px";

  const ruleHalf = Math.min(120, Math.max(40, ctx.measureText(spec.brand).width / 2 + 40));
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1;
  for (const sign of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(DW / 2 + sign * (ruleHalf + 18), 104);
    ctx.lineTo(DW / 2 + sign * (ruleHalf + 92), 104);
    ctx.stroke();
  }

  if (spec.tag) {
    ctx.font = `500 18px ${FONT_BODY}`;
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.fillText(spec.tag, DW / 2, 142);
  }

  const single = spec.headline.length === 1;
  let size = single ? 84 : 72;
  size = fitHeadline(ctx, spec.headline, style, () => DW - 150, size, 40);

  ctx.font = `${style.weight} ${size}px ${FONT_DISPLAY}`;
  spacing(ctx, style.tracking, size);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  let y = single ? 300 : 286;
  for (const line of spec.headline) {
    ctx.fillText(line, DW / 2, y);
    y += size * 1.14;
  }
  spacing(ctx, 0, size);

  ctx.strokeStyle = spec.accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(DW / 2 - 70, y + 4);
  ctx.lineTo(DW / 2 + 70, y + 4);
  ctx.stroke();

  if (spec.offer) {
    ctx.font = `600 22px ${FONT_BODY}`;
    ctx.letterSpacing = "6px";
    ctx.fillStyle = spec.accent;
    ctx.fillText(spec.offer.toUpperCase(), DW / 2, y + 46);
    ctx.letterSpacing = "0px";
  }

  ctx.font = `500 17px ${FONT_BODY}`;
  ctx.letterSpacing = "5px";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText("PRICE", DW / 2, y + 92);
  ctx.letterSpacing = "0px";
  ctx.font = `600 44px ${FONT_DISPLAY}`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(spec.price, DW / 2, y + 138);

  drawProduct(ctx, spec, style, DW / 2, DH - 300, spec.product === "plate" ? 0.98 : 1.02);

  // The hand-off is a text link, not a button
  ctx.font = `600 27px ${FONT_BODY}`;
  ctx.letterSpacing = "2px";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillText(spec.cta, DW / 2, DH - 122);
  const linkW = ctx.measureText(spec.cta).width;
  ctx.letterSpacing = "0px";
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(DW / 2 - linkW / 2, DH - 100);
  ctx.lineTo(DW / 2 + linkW / 2, DH - 100);
  ctx.stroke();

  drawFooterMeta(ctx, style);
}

/**
 * Corporate: a grid, a header band, one promise. Proof-first layouts for
 * company accounts, where a sticker would cost trust rather than buy it.
 */
function drawCorporate(ctx: Ctx2D, spec: CreativeSpec, style: CreativeStyle) {
  const FONT_DISPLAY = style.display;
  const FONT_BODY = style.body;

  paintBackground(ctx, spec, 0.6);

  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  for (let x = 64; x < DW; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, DH);
    ctx.stroke();
  }
  for (let y = 64; y < DH; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(DW, y);
    ctx.stroke();
  }

  // Header band with a logo block
  ctx.fillStyle = "rgba(5,8,16,0.42)";
  ctx.fillRect(0, 0, DW, 128);
  ctx.fillStyle = spec.accent;
  ctx.fillRect(44, 40, 48, 48);
  ctx.font = `700 26px ${FONT_BODY}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = inkOn(spec.accent);
  ctx.fillText(spec.brand.charAt(0), 68, 65);

  ctx.textAlign = "left";
  ctx.font = `600 24px ${FONT_BODY}`;
  ctx.letterSpacing = "3px";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillText(spec.brand, 108, 58);
  ctx.letterSpacing = "0px";
  ctx.font = `500 17px ${FONT_BODY}`;
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText(spec.tag ?? "ESTABLISHED", 108, 84);

  ctx.strokeStyle = spec.accent;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(44, 128);
  ctx.lineTo(44 + 128, 128);
  ctx.stroke();

  const single = spec.headline.length === 1;
  let size = single ? 76 : 66;
  size = fitHeadline(ctx, spec.headline, style, () => DW - 96, size, 40);

  ctx.font = `${style.weight} ${size}px ${FONT_DISPLAY}`;
  spacing(ctx, style.tracking, size);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  let y = 232;
  for (const line of spec.headline) {
    ctx.fillText(line, 44, y);
    y += size * 1.12;
  }
  spacing(ctx, 0, size);

  // Price in a ruled block, not a pill
  const priceY = y + 14;
  ctx.font = `700 32px ${FONT_BODY}`;
  const pw = ctx.measureText(spec.price).width + 74;
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  rr(ctx, 44, priceY, pw, 60, 10);
  ctx.fill();
  ctx.fillStyle = spec.accent;
  ctx.fillRect(44, priceY, 6, 60);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(spec.price, 74, priceY + 31);

  if (spec.offer) {
    ctx.font = `600 20px ${FONT_BODY}`;
    ctx.letterSpacing = "4px";
    ctx.fillStyle = spec.accent;
    ctx.fillText(spec.offer.toUpperCase(), 44, priceY + 92);
    ctx.letterSpacing = "0px";
  }

  drawProduct(ctx, spec, style, DW * 0.6, priceY + 262, spec.product === "plate" ? 0.86 : 0.9);

  const ctaY = DH - 132;
  ctx.font = `700 30px ${FONT_BODY}`;
  const cw = ctx.measureText(spec.cta).width + 132;
  ctx.fillStyle = "#25d366";
  ctx.beginPath();
  rr(ctx, 44, ctaY, cw, 74, 12);
  ctx.fill();
  ctx.fillStyle = "#06130b";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(spec.cta, 84, ctaY + 38);
  ctx.font = `700 34px ${FONT_BODY}`;
  ctx.fillText("→", 44 + cw - 56, ctaY + 38);

  drawFooterMeta(ctx, style);
}

/** Card back: dark panel with the wordmark and a dot grid. */
export function drawCardBack(w = 512, h = 910): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d") as Ctx2D | null;
  if (!ctx) return canvas;

  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#141126");
  bg.addColorStop(1, "#0a0818");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(251,191,36,0.35)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  rr(ctx, 16, 16, w - 32, h - 32, 34);
  ctx.stroke();

  ctx.fillStyle = "rgba(251,191,36,0.22)";
  for (let gy = 90; gy < h - 60; gy += 56) {
    for (let gx = 60; gx < w - 40; gx += 56) {
      ctx.beginPath();
      ctx.arc(gx, gy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = "10px";
  ctx.font = `700 44px ${DEFAULT_DISPLAY_FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fillText("ADGENIE", w / 2, h / 2 - 20);
  ctx.letterSpacing = "0px";
  ctx.font = `500 22px ${DEFAULT_BODY_FONT}`;
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillText("your campaign, to go", w / 2, h / 2 + 34);

  return canvas;
}
