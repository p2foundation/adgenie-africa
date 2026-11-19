"use client";

import { useEffect, useRef, useState } from "react";
import type * as ThreeNS from "three";
import { Pause, Play, RotateCcw } from "lucide-react";
import type { SpinAudience, SpinMode, SpinProduct } from "@/lib/api";
import {
  PRODUCT_LABEL,
  SPIN_MODE_LABEL,
  mixHex,
  rgba,
  shadeHex,
} from "@/lib/studio";
import { cn } from "@/lib/utils";

type Three = typeof import("three");
type Junk = { dispose: () => void };

interface Figure {
  group: ThreeNS.Group;
  junk: Junk[];
}

interface Palette {
  primary: string;
  secondary: string;
  outfit: string;
  trim: string;
  skin: string;
  hair: string;
}

const HAIR = "#221812";

const AUDIENCE_LABEL: Record<SpinAudience, string> = {
  women: "Women",
  men: "Men",
  kids: "Kids",
};

const SHOWCASE: SpinProduct[] = ["product", "packaging"];

function isShowcase(product: SpinProduct) {
  return SHOWCASE.includes(product);
}

/**
 * Procedural 360° turntable — no model downloads, no provider calls.
 * three.js is imported inside the effect, so it stays out of the page bundle
 * until a Spin tab is actually opened. Drag to turn; auto-spin pauses when the
 * stage is offscreen, the tab is hidden, or the visitor prefers reduced motion.
 */
export function SpinStage({
  audience,
  product,
  mode = "mannequin",
  primary,
  secondary,
  speed = 0.5,
  className,
}: {
  audience: SpinAudience;
  product: SpinProduct;
  /** Fashion presentation: virtual model, headless mannequin or digital kit. */
  mode?: SpinMode;
  primary: string;
  secondary: string;
  speed?: number;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const [spinning, setSpinning] = useState(true);
  const [touched, setTouched] = useState(false);
  const [glSupported] = useState(() => {
    if (typeof document === "undefined") return false;
    try {
      const probe = document.createElement("canvas");
      return Boolean(probe.getContext("webgl2") || probe.getContext("webgl"));
    } catch {
      return false;
    }
  });

  const spinningRef = useRef(true);
  const speedRef = useRef(speed);
  const variantRef = useRef({ audience, product, mode });
  const activateRef = useRef<
    ((a: SpinAudience, p: SpinProduct, m: SpinMode) => void) | null
  >(null);

  useEffect(() => {
    spinningRef.current = spinning;
  }, [spinning]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    variantRef.current = { audience, product, mode };
    activateRef.current?.(audience, product, mode);
  }, [audience, product, mode]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas || failed) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const T = await import("three");
      if (disposed) return;

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduceMotion) setSpinning(false);

      const renderer = new T.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = T.SRGBColorSpace;
      renderer.toneMapping = T.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.setClearAlpha(0);

      const scene = new T.Scene();
      const camera = new T.PerspectiveCamera(30, 1, 0.1, 40);
      camera.position.set(0, 1.4, 3.9);

      // A tiny procedural softbox environment. Physical fabric sheen and the
      // glass/metal showcase need something to reflect; this keeps the studio
      // look without downloading an HDR or an addon.
      const envJunk: Junk[] = [];
      try {
        const pmrem = new T.PMREMGenerator(renderer);
        const envScene = new T.Scene();
        envScene.background = new T.Color(0x0b0d15);
        const softbox = (x: number, y: number, z: number, w: number, h: number, tone: number) => {
          const material = new T.MeshBasicMaterial({ color: tone, side: T.DoubleSide });
          const geometry = new T.PlaneGeometry(w, h);
          const panel = new T.Mesh(geometry, material);
          panel.position.set(x, y, z);
          panel.lookAt(0, 0.9, 0);
          envScene.add(panel);
          envJunk.push(material, geometry);
        };
        softbox(0, 3.4, 1.6, 3.2, 1.5, 0xffffff);
        softbox(-3.2, 1.9, 1.2, 1.4, 2.6, 0xfff1d6);
        softbox(3.4, 1.5, -0.8, 1.2, 2.4, 0xdfe7ff);
        const target = pmrem.fromScene(envScene, 0.06);
        scene.environment = target.texture;
        envJunk.push(target, pmrem);
      } catch {
        // Environment is a nicety; lights alone still render the stage.
      }

      const turntable = new T.Group();
      turntable.rotation.y = 0.5;
      scene.add(turntable);

      const palette: Palette = {
        primary,
        secondary,
        outfit: mixHex(primary, secondary, 0.34),
        trim: primary,
        skin: "#B98365",
        hair: HAIR,
      };

      const fabric = fabricTexture(T);
      const junk: Junk[] = [fabric, ...envJunk];

      scene.add(new T.HemisphereLight(0xffffff, 0x0a0a14, 0.72));

      const key = new T.DirectionalLight(0xfff4e6, 2.7);
      key.position.set(3.2, 4.6, 3.4);
      scene.add(key);

      const rim = new T.DirectionalLight(hex(secondary), 3.1);
      rim.position.set(-4, 2.6, -3.2);
      scene.add(rim);

      const fill = new T.PointLight(hex(primary), 1.6, 9, 2);
      fill.position.set(0.4, 1.6, 3);
      scene.add(fill);

      const top = new T.PointLight(0xffffff, 0.9, 7, 2);
      top.position.set(0, 3.6, 0.8);
      scene.add(top);

      // A single matte studio floor grounds the object. No shadow maps: the
      // soft contact gradient below is cheaper and stays smooth on mobile.
      const floorMat = new T.MeshStandardMaterial({
        color: 0x0a0c14,
        roughness: 0.42,
        metalness: 0.35,
        transparent: true,
        opacity: 0.9,
      });
      const floorGeo = new T.CircleGeometry(2.6, 64);
      junk.push(floorMat, floorGeo);
      const floor = new T.Mesh(floorGeo, floorMat);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -0.002;
      scene.add(floor);

      const shadowTex = shadowTexture(T);
      junk.push(shadowTex);
      const shadowMat = new T.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.9,
      });
      const shadowGeo = new T.PlaneGeometry(3.2, 3.2);
      junk.push(shadowMat, shadowGeo);
      const shadow = new T.Mesh(shadowGeo, shadowMat);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = 0.001;
      scene.add(shadow);

      // A soft cyclorama behind the figure. The turntable turns, the camera and
      // this halo stay put, which gives the frame depth without an HDR.
      const backTex = radialTexture(T, secondary);
      junk.push(backTex);
      const backMat = new T.MeshBasicMaterial({
        map: backTex,
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
        toneMapped: false,
        opacity: 0.5,
      });
      const backGeo = new T.PlaneGeometry(7, 4.2);
      junk.push(backMat, backGeo);
      const backdrop = new T.Mesh(backGeo, backMat);
      backdrop.position.set(0, 1.8, -3.1);
      scene.add(backdrop);

      // Floor glow — additive disc, no shadows needed.
      const glowTex = radialTexture(T, primary);
      junk.push(glowTex);
      const glowMat = new T.MeshBasicMaterial({
        map: glowTex,
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
        toneMapped: false,
        opacity: 0.55,
      });
      const glowGeo = new T.CircleGeometry(2.2, 48);
      junk.push(glowMat, glowGeo);
      const glow = new T.Mesh(glowGeo, glowMat);
      glow.rotation.x = -Math.PI / 2;
      glow.position.y = 0.004;
      scene.add(glow);

      // Dust motes around the turntable.
      const count = window.matchMedia("(max-width: 768px)").matches ? 70 : 130;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = 1.1 + Math.random() * 1.2;
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = 0.15 + Math.random() * 1.9;
        positions[i * 3 + 2] = Math.sin(angle) * radius;
      }
      const dustGeo = new T.BufferGeometry();
      dustGeo.setAttribute("position", new T.BufferAttribute(positions, 3));
      const dustMat = new T.PointsMaterial({
        color: hex(primary),
        size: 0.018,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: T.AdditiveBlending,
      });
      junk.push(dustGeo, dustMat);
      const dust = new T.Points(dustGeo, dustMat);
      scene.add(dust);

      const variants = new Map<string, Figure>();
      for (const a of ["women", "men", "kids"] as const) {
        for (const m of ["model", "mannequin", "kit"] as const) {
          // A child is never modelled. The kids audience gets the mannequin
          // and the kit; the model variant is not even built.
          const built =
            m === "model" && a !== "kids"
              ? buildModel(T, a, palette, fabric)
              : m === "mannequin" || (m === "model" && a === "kids")
                ? buildMannequin(T, a, palette, fabric)
                : buildFashionKit(T, a, palette, fabric);
          built.group.visible = false;
          turntable.add(built.group);
          variants.set(`${a}:outfit:${m}`, built);
          junk.push(...built.junk);
        }
        const doll = buildDoll(T, a, palette, fabric);
        doll.group.visible = false;
        turntable.add(doll.group);
        variants.set(`${a}:doll`, doll);
        junk.push(...doll.junk);
      }
      for (const p of ["product", "packaging"] as const) {
        const fig = buildShowcase(T, p, palette, fabric);
        fig.group.visible = false;
        turntable.add(fig.group);
        variants.set(`showcase:${p}`, fig);
        junk.push(...fig.junk);
      }

      const state = {
        rot: 0.5,
        vel: 0,
        dragging: false,
        lastX: 0,
        lastY: 0,
        camY: 1.4,
        camYTarget: 1.4,
        lookY: 0.92,
        lookTarget: 0.92,
        interactive: false,
      };

      let activeKey = "";
      let activeGroup: ThreeNS.Group | null = null;

      const activate = (a: SpinAudience, p: SpinProduct, m: SpinMode) => {
        const key = isShowcase(p)
          ? `showcase:${p}`
          : p === "outfit"
            ? `${a}:outfit:${m}`
            : `${a}:${p}`;
        if (key === activeKey) return;
        activeKey = key;
        for (const [k, fig] of variants) fig.group.visible = k === key;
        activeGroup = variants.get(key)?.group ?? null;
        if (activeGroup) {
          activeGroup.scale.setScalar(0.94);
          state.rot = 0.5;
        }
        // Product and packaging sit near the pedestal; lower the gaze so they
        // fill the frame instead of floating in the bottom third. A full-length
        // figure looks best at chest height.
        state.lookTarget = isShowcase(p) ? 0.58 : p === "outfit" ? 1.0 : 0.92;
      };
      activateRef.current = activate;
      activate(variantRef.current.audience, variantRef.current.product, variantRef.current.mode);

      const resize = () => {
        const w = wrap.clientWidth;
        const h = wrap.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w, h, false);
        const aspect = w / h;
        camera.aspect = aspect;
        // Pull back on tall/narrow frames so the whole figure stays in shot.
        const fit = aspect < 1 ? 1 + (1 - aspect) * 0.55 : 1;
        camera.position.z = 3.9 * fit;
        camera.updateProjectionMatrix();
        // Paint even when the animation loop is gated off (hidden tab, mount
        // below the fold) so the stage never opens as a blank rectangle.
        renderer.render(scene, camera);
      };
      resize();
      const ro = new ResizeObserver(resize);
      ro.observe(wrap);

      let raf = 0;
      let running = false;
      let visible = true;
      let last = 0;

      const tick = (now: number) => {
        const dt = Math.min((now - (last || now)) / 1000, 0.05);
        last = now;

        if (!state.dragging && spinningRef.current) {
          state.rot += (reduceMotion ? 0 : speedRef.current) * dt;
        }
        if (!state.dragging) {
          state.rot += state.vel;
          state.vel *= 0.94;
        }
        turntable.rotation.y = state.rot;

        state.camY += (state.camYTarget - state.camY) * 0.12;
        state.lookY += (state.lookTarget - state.lookY) * 0.12;
        camera.position.y = state.camY;
        camera.lookAt(0, state.lookY, 0);

        if (activeGroup && activeGroup.scale.x < 1) {
          const next = Math.min(1, activeGroup.scale.x + dt * 2.2);
          activeGroup.scale.setScalar(next);
        }

        dust.rotation.y += dt * 0.06;
        glowMat.opacity = 0.5 + Math.sin(now / 1600) * 0.05;

        renderer.render(scene, camera);
        raf = requestAnimationFrame(tick);
      };

      const start = () => {
        if (!running && visible && !document.hidden && !disposed) {
          running = true;
          last = 0;
          raf = requestAnimationFrame(tick);
        }
      };
      const stop = () => {
        running = false;
        cancelAnimationFrame(raf);
      };

      const io = new IntersectionObserver(
        (entries) => {
          visible = entries[0]?.isIntersecting ?? true;
          if (visible) start();
          else stop();
        },
        { rootMargin: "100px" }
      );
      io.observe(wrap);

      const onVisibility = () => {
        if (document.hidden) stop();
        else start();
      };
      document.addEventListener("visibilitychange", onVisibility);

      const onDown = (event: PointerEvent) => {
        state.dragging = true;
        state.lastX = event.clientX;
        state.lastY = event.clientY;
        state.vel = 0;
        state.interactive = true;
        canvas.setPointerCapture(event.pointerId);
        setTouched(true);
      };
      const onMove = (event: PointerEvent) => {
        if (!state.dragging) return;
        const dx = event.clientX - state.lastX;
        const dy = event.clientY - state.lastY;
        state.lastX = event.clientX;
        state.lastY = event.clientY;
        state.rot += dx * 0.0085;
        state.vel = dx * 0.0018;
        state.camYTarget = Math.max(0.95, Math.min(1.95, state.camYTarget + dy * 0.004));
        if (reduceMotion) renderer.render(scene, camera);
      };
      const onUp = (event: PointerEvent) => {
        state.dragging = false;
        try {
          canvas.releasePointerCapture(event.pointerId);
        } catch {
          /* already released */
        }
      };

      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
      canvas.addEventListener("pointercancel", onUp);

      const onContextLost = (event: Event) => {
        event.preventDefault();
        stop();
        setFailed(true);
      };
      canvas.addEventListener("webglcontextlost", onContextLost);

      start();

      cleanup = () => {
        disposed = true;
        stop();
        io.disconnect();
        ro.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
        canvas.removeEventListener("pointerdown", onDown);
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerup", onUp);
        canvas.removeEventListener("pointercancel", onUp);
        canvas.removeEventListener("webglcontextlost", onContextLost);
        activateRef.current = null;
        for (const item of junk) item.dispose();
        scene.clear();
        renderer.dispose();
      };
    })().catch((error) => {
      console.error("Spin stage failed to start", error);
      setFailed(true);
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
    // Colour changes rebuild the studio; audience/product switches just swap figures.
  }, [primary, secondary, failed]);

  const reset = () => {
    activateRef.current?.(audience, product, mode);
  };

  if (failed || !glSupported) {
    return (
      <SpinFallback
        audience={audience}
        product={product}
        mode={mode}
        primary={primary}
        secondary={secondary}
        className={className}
      />
    );
  }

  return (
    <div
      ref={wrapRef}
      className={cn(
        "relative isolate overflow-hidden rounded-2xl border border-white/8",
        className
      )}
      style={{
        background: `radial-gradient(120% 90% at 50% 18%, ${rgba(secondary, 0.28)} 0%, #070811 58%, #05060c 100%)`,
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background: `radial-gradient(60% 45% at 50% 88%, ${rgba(primary, 0.18)} 0%, transparent 70%)`,
        }}
      />
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Interactive 360 degree view: ${
          isShowcase(product)
            ? PRODUCT_LABEL[product].toLowerCase()
            : product === "outfit"
              ? `${AUDIENCE_LABEL[audience].toLowerCase()} outfit on a ${SPIN_MODE_LABEL[
                  mode
                ].toLowerCase()}`
              : `${AUDIENCE_LABEL[audience].toLowerCase()} ${PRODUCT_LABEL[
                  product
                ].toLowerCase()}`
        } on a rotating turntable. Drag to turn.`}
        className="relative h-full w-full touch-pan-y cursor-grab active:cursor-grabbing"
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/70 backdrop-blur-md">
          <RotateCcw className="h-3 w-3 text-amber-300" />
          360°
        </span>
        <button
          type="button"
          onClick={() => setSpinning((value) => !value)}
          aria-label={spinning ? "Pause rotation" : "Resume rotation"}
          className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-black/40 text-white/70 backdrop-blur-md transition-colors hover:border-white/25 hover:text-white"
        >
          {spinning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
        </button>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3">
        <span className="rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[10px] font-medium text-white/65 backdrop-blur-md">
          {isShowcase(product)
            ? PRODUCT_LABEL[product]
            : product === "outfit"
              ? `${AUDIENCE_LABEL[audience]} · ${SPIN_MODE_LABEL[mode]}`
              : `${AUDIENCE_LABEL[audience]} · ${PRODUCT_LABEL[product]}`}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-[10px] text-white/45 backdrop-blur-md transition-opacity",
            touched ? "opacity-0" : "opacity-100"
          )}
        >
          <RotateCcw className="h-3 w-3" />
          Drag to turn
        </span>
      </div>

      <button
        type="button"
        onClick={reset}
        className="absolute bottom-3 left-1/2 hidden -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[10px] text-white/40 backdrop-blur-md hover:text-white/70"
        style={{ display: touched ? "inline-flex" : "none" }}
      >
        Reset angle
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

function hex(value: string) {
  return Number.parseInt(value.replace("#", ""), 16);
}

function fabricTexture(T: Three) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, size, size);
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = "#ffffff";
    for (let i = 0; i < size; i += 3) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();
    }
    ctx.strokeStyle = "#000000";
    for (let i = 0; i < size; i += 3) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }
  }
  const texture = new T.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}

function radialTexture(T: Three, color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(128, 128, 4, 128, 128, 128);
    gradient.addColorStop(0, rgba(color, 0.55));
    gradient.addColorStop(0.45, rgba(color, 0.16));
    gradient.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
  }
  return new T.CanvasTexture(canvas);
}

/** Press soft vertical pleats into a lathed skirt, deepest at the hem. */
function pleat(
  geometry: ThreeNS.BufferGeometry,
  count: number,
  depth: number,
  fromY: number,
  toY: number
) {
  const position = geometry.getAttribute("position") as ThreeNS.BufferAttribute;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const angle = Math.atan2(z, x);
    const radius = Math.hypot(x, z);
    if (!radius) continue;
    const rise = Math.max(0, Math.min(1, (y - fromY) / Math.max(0.001, toY - fromY)));
    const factor = 1 + Math.cos(angle * count) * depth * (1 - rise);
    position.setX(i, (x / radius) * radius * factor);
    position.setZ(i, (z / radius) * radius * factor);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
}

function shadowTexture(T: Three) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    const gradient = ctx.createRadialGradient(128, 128, 8, 128, 128, 126);
    gradient.addColorStop(0, "rgba(0,0,0,0.72)");
    gradient.addColorStop(0.42, "rgba(0,0,0,0.32)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
  }
  return new T.CanvasTexture(canvas);
}

/* ------------------------------------------------------------------ */
/* The atelier: mannequin, virtual model, digital fashion kit          */
/* ------------------------------------------------------------------ */

interface AtelierMats {
  cloth: ThreeNS.MeshPhysicalMaterial;
  trim: ThreeNS.MeshPhysicalMaterial;
  skin: ThreeNS.MeshStandardMaterial;
  hair: ThreeNS.MeshStandardMaterial;
  shoe: ThreeNS.MeshPhysicalMaterial;
  ivory: ThreeNS.MeshStandardMaterial;
  brass: ThreeNS.MeshStandardMaterial;
  lips: ThreeNS.MeshStandardMaterial;
  glint: ThreeNS.MeshBasicMaterial;
}

function atelierMats(
  T: Three,
  palette: Palette,
  fabric: ThreeNS.Texture,
  junk: Junk[]
): AtelierMats {
  const physical = (options: ThreeNS.MeshPhysicalMaterialParameters) => {
    const material = new T.MeshPhysicalMaterial(options);
    junk.push(material);
    return material;
  };
  const standard = (options: ThreeNS.MeshStandardMaterialParameters) => {
    const material = new T.MeshStandardMaterial(options);
    junk.push(material);
    return material;
  };
  // Real cloth catches light along the weave. A low bump scale at this size is
  // invisible; a little roughness variation and sheen is what separates it from
  // painted plastic.
  const cloth = (weight: number) =>
    physical({
      color: hex(mixHex(palette.outfit, palette.secondary, 0.18)),
      roughness: 0.82,
      metalness: 0.02,
      bumpMap: fabric,
      bumpScale: 0.02,
      sheen: weight,
      sheenRoughness: 0.58,
      sheenColor: new T.Color(hex(shadeHex(palette.outfit, 0.4))),
      side: T.DoubleSide,
    });

  return {
    cloth: cloth(0.85),
    trim: physical({
      color: hex(palette.trim),
      roughness: 0.62,
      metalness: 0.06,
      bumpMap: fabric,
      bumpScale: 0.012,
      sheen: 0.55,
      sheenRoughness: 0.5,
      sheenColor: new T.Color(hex(shadeHex(palette.trim, 0.42))),
      side: T.DoubleSide,
    }),
    skin: standard({
      color: hex(palette.skin),
      roughness: 0.52,
      metalness: 0,
    }),
    hair: standard({ color: hex(palette.hair), roughness: 0.62, metalness: 0.02 }),
    shoe: physical({
      color: 0x111119,
      roughness: 0.32,
      metalness: 0.18,
      clearcoat: 0.7,
      clearcoatRoughness: 0.25,
    }),
    // Retail mannequins are warm plaster, not skin. That is the whole trick:
    // a headless form reads as a considered display, a painted face reads toy.
    ivory: standard({ color: 0xe8dece, roughness: 0.48, metalness: 0.02 }),
    brass: physical({
      color: hex(shadeHex(palette.trim, 0.18)),
      roughness: 0.28,
      metalness: 0.72,
      clearcoat: 0.5,
    }),
    lips: standard({ color: 0x9c5a55, roughness: 0.55 }),
    glint: new T.MeshBasicMaterial({ color: 0xffffff }),
  };
}

/** Adult retail proportions, feet at y=0 and shoulder at 1.48. */
function buildBody(
  T: Three,
  audience: SpinAudience,
  mats: AtelierMats,
  geo: <G extends ThreeNS.BufferGeometry>(geometry: G) => G,
  kind: "model" | "mannequin"
) {
  const group = new T.Group();
  const female = audience === "women";
  const shoulderX = female ? 0.185 : 0.2;
  const legX = female ? 0.085 : 0.095;
  const skin = kind === "mannequin" ? mats.ivory : mats.skin;

  // Torso under the garment. It exists so a neckline, sleeve or hem never
  // shows a hole; the garment itself does the visual work.
  const torso = new T.Mesh(
    geo(
      new T.LatheGeometry(
        [
          new T.Vector2(0.155, 0.9),
          new T.Vector2(0.145, 1.02),
          new T.Vector2(0.128, 1.1),
          new T.Vector2(0.155, 1.28),
          new T.Vector2(0.175, 1.4),
          new T.Vector2(0.12, 1.47),
          new T.Vector2(0.055, 1.52),
        ],
        32
      )
    ),
    skin
  );
  group.add(torso);

  // A dress form has no limbs at all — the garment hangs on a torso and the
  // sleeves stay empty, which is how boutiques actually shoot. Menswear keeps
  // a headless full-body form so trousers and shoes have something to sit on.
  // No knee, elbow or ankle balls in either: hinges are what read as a doll.
  const dressForm = kind === "mannequin" && audience !== "men";
  const legs = kind === "model" || audience === "men";
  const arms = kind === "model";

  for (const side of [-1, 1]) {
    if (legs) {
      const thigh = new T.Mesh(geo(new T.CapsuleGeometry(0.075, 0.34, 8, 16)), skin);
      thigh.position.set(legX * side, 0.72, 0);
      thigh.rotation.z = side * -0.015;
      group.add(thigh);

      const calf = new T.Mesh(geo(new T.CapsuleGeometry(0.054, 0.28, 8, 16)), skin);
      calf.position.set(legX * side, 0.31, 0.008);
      group.add(calf);

      // Heel pump for women, loafer for men; kids get a sensible shoe.
      const shoe = new T.Mesh(geo(new T.SphereGeometry(0.078, 18, 14)), mats.shoe);
      shoe.position.set(legX * side, audience === "kids" ? 0.05 : 0.055, 0.05);
      shoe.scale.set(audience === "kids" ? 1.0 : 0.72, 0.3, 1.8);
      group.add(shoe);

      if (female) {
        const heel = new T.Mesh(geo(new T.CylinderGeometry(0.011, 0.015, 0.075, 10)), mats.shoe);
        heel.position.set(legX * side, 0.038, -0.045);
        group.add(heel);
      }

      if (audience === "kids") {
        const sock = new T.Mesh(geo(new T.CylinderGeometry(0.055, 0.055, 0.085, 16)), mats.trim);
        sock.position.set(legX * side, 0.13, 0.012);
        group.add(sock);
      }
    }

    if (arms) {
      // A relaxed arm hangs clear of the hip, not inside the skirt. The chain
      // is shoulder → upper → fore → hand with no elbow ball, tilted a few
      // degrees so the silhouette is not a straight rod.
      const shoulder = new T.Mesh(geo(new T.SphereGeometry(0.05, 16, 12)), skin);
      shoulder.position.set((shoulderX + 0.005) * side, 1.415, 0);
      group.add(shoulder);

      const upper = new T.Mesh(geo(new T.CapsuleGeometry(0.042, 0.24, 8, 14)), skin);
      upper.position.set((shoulderX + 0.031) * side, 1.28, 0.005);
      upper.rotation.z = side * 0.05;
      group.add(upper);

      const fore = new T.Mesh(geo(new T.CapsuleGeometry(0.034, 0.2, 8, 14)), skin);
      fore.position.set((shoulderX + 0.043) * side, 1.075, 0.042);
      fore.rotation.x = -0.24;
      fore.rotation.z = side * -0.04;
      group.add(fore);

      const hand = new T.Mesh(geo(new T.SphereGeometry(0.04, 14, 12)), skin);
      hand.position.set((shoulderX + 0.051) * side, 0.955, 0.104);
      hand.scale.set(0.6, 1.15, 0.42);
      group.add(hand);
    }
  }

  if (dressForm) {
    // A dress form stands on a weighted column. Without the foot the pole
    // ended in a point on the plinth and read as a stray stick.
    const pole = new T.Mesh(geo(new T.CylinderGeometry(0.018, 0.028, 0.94, 20)), mats.brass);
    pole.position.y = 0.47;
    group.add(pole);

    const foot = new T.Mesh(geo(new T.CylinderGeometry(0.14, 0.165, 0.03, 36)), mats.brass);
    foot.position.y = 0.015;
    group.add(foot);
  }

  const neck = new T.Mesh(geo(new T.CylinderGeometry(0.05, 0.058, 0.14, 20)), skin);
  neck.position.y = 1.56;
  group.add(neck);

  if (kind === "mannequin") {
    // Headless: a rounded neck stump and a brass collar are the display-form
    // signature. No eyes, no mouth, nothing to read as a toy face.
    const cap = new T.Mesh(geo(new T.SphereGeometry(0.058, 20, 16)), skin);
    cap.position.y = 1.63;
    cap.scale.set(1, 0.72, 1);
    group.add(cap);

    const collar = new T.Mesh(geo(new T.TorusGeometry(0.056, 0.008, 10, 36)), mats.brass);
    collar.position.y = 1.52;
    collar.rotation.x = Math.PI / 2;
    group.add(collar);
    return group;
  }

  const head = new T.Mesh(geo(new T.SphereGeometry(0.115, 32, 26)), mats.skin);
  head.position.y = 1.68;
  head.scale.set(0.92, 1.14, 0.96);
  group.add(head);

  for (const side of [-1, 1]) {
    const ear = new T.Mesh(geo(new T.SphereGeometry(0.026, 12, 10)), mats.skin);
    ear.position.set(0.104 * side, 1.675, 0);
    ear.scale.set(0.55, 1, 0.7);
    group.add(ear);

    // Small, correctly scaled features. The old toy faces were oversized;
    // these are barely a centimetre and read as a face at thumbnail size.
    const eye = new T.Mesh(geo(new T.SphereGeometry(0.0105, 12, 10)), mats.hair);
    eye.position.set(0.038 * side, 1.7, 0.101);
    group.add(eye);

    const glint = new T.Mesh(
      geo(new T.SphereGeometry(0.0028, 8, 6)),
      mats.glint
    );
    glint.position.set(0.035 * side, 1.704, 0.109);
    group.add(glint);

    const brow = new T.Mesh(geo(new T.CapsuleGeometry(0.0035, 0.026, 4, 6)), mats.hair);
    brow.position.set(0.038 * side, 1.728, 0.101);
    brow.rotation.z = Math.PI / 2 + side * 0.08;
    group.add(brow);
  }

  const nose = new T.Mesh(geo(new T.ConeGeometry(0.012, 0.036, 8)), mats.skin);
  nose.position.set(0, 1.672, 0.109);
  nose.rotation.x = Math.PI / 2;
  group.add(nose);

  const lips = new T.Mesh(
    geo(new T.CapsuleGeometry(0.005, 0.026, 4, 8)),
    mats.lips
  );
  lips.position.set(0, 1.632, 0.099);
  lips.rotation.z = Math.PI / 2;
  group.add(lips);

  // One ellipsoid, the head's shape plus a few millimetres, pushed up and back.
  // The surfaces cross at the forehead, temple and nape, so the hairline falls
  // where it should and the face stays clear — a rotated cap always cuts the
  // same height all round, which is what made the hair read as a blindfold.
  const hair = new T.Mesh(geo(new T.SphereGeometry(0.113, 32, 24)), mats.hair);
  hair.position.set(0, 1.71, -0.02);
  hair.scale.set(0.973, 1.195, 1.009);
  group.add(hair);

  if (female) {
    const bun = new T.Mesh(geo(new T.SphereGeometry(0.046, 16, 12)), mats.hair);
    bun.position.set(0, 1.615, -0.122);
    bun.scale.set(1, 0.88, 0.82);
    group.add(bun);
  }

  return group;
}

/**
 * Where each bodice begins and ends. The kit hangs the top from these numbers,
 * so it lives here rather than being duplicated at the hanger.
 */
const BODICE = {
  men: { base: 1.06, top: 1.492 },
  kids: { base: 0.98, top: 1.455 },
  women: { base: 0.99, top: 1.482 },
} as const;

/** A tailored top at body coordinates: blouse, shirt or kids' blouse. */
function buildTop(
  T: Three,
  audience: SpinAudience,
  mats: AtelierMats,
  geo: <G extends ThreeNS.BufferGeometry>(geometry: G) => G,
  hung = false
) {
  const group = new T.Group();
  const men = audience === "men";
  const kids = audience === "kids";
  // Every bodice has to end below the waist of whatever sits under it — a
  // blouse over the skirt, a shirt tucked into the band — otherwise the join
  // shows bare form between the two pieces.
  const span = BODICE[audience];
  const profile = men
    ? [
        new T.Vector2(0.19, span.base),
        new T.Vector2(0.19, 1.18),
        new T.Vector2(0.207, 1.3),
        new T.Vector2(0.215, 1.4),
        new T.Vector2(0.16, 1.462),
        new T.Vector2(0.082, span.top),
      ]
    : kids
      ? [
          new T.Vector2(0.178, span.base),
          new T.Vector2(0.175, 1.15),
          new T.Vector2(0.18, 1.27),
          new T.Vector2(0.172, 1.37),
          new T.Vector2(0.135, 1.43),
          new T.Vector2(0.075, span.top),
        ]
      : [
          new T.Vector2(0.192, span.base),
          new T.Vector2(0.186, 1.18),
          new T.Vector2(0.198, 1.3),
          new T.Vector2(0.19, 1.4),
          new T.Vector2(0.145, 1.455),
          new T.Vector2(0.078, span.top),
        ];

  // Radius of the bodice surface at a height, so front details sit on the
  // cloth instead of sinking into it or hovering in front.
  const profileR = (y: number) => {
    if (y <= profile[0].y) return profile[0].x;
    for (let i = 1; i < profile.length; i++) {
      if (y <= profile[i].y) {
        const t = (y - profile[i - 1].y) / (profile[i].y - profile[i - 1].y);
        return profile[i - 1].x + (profile[i].x - profile[i - 1].x) * t;
      }
    }
    return profile[profile.length - 1].x;
  };

  const body = new T.Mesh(geo(new T.LatheGeometry(profile, 48)), mats.cloth);
  group.add(body);

  const neckY = men ? 1.475 : 1.468;
  const neckline = new T.Mesh(geo(new T.TorusGeometry(0.074, 0.009, 10, 40)), mats.trim);
  neckline.position.y = neckY;
  neckline.rotation.x = Math.PI / 2;
  group.add(neckline);

  const shoulderX = men ? 0.205 : kids ? 0.163 : 0.185;
  const sleeveY = men ? 1.39 : kids ? 1.36 : 1.4;
  const capR = men ? 0.088 : kids ? 0.072 : 0.076;
  const armR = men ? 0.078 : kids ? 0.06 : 0.062;
  // Nothing props a hung sleeve open, so it falls in closer to the body.
  const tilt = hung ? 0.07 : men ? 0.12 : kids ? 0.12 : 0.14;
  const sleeveLen = (men ? 0.27 : kids ? 0.2 : 0.23) * (hung ? 1.18 : 1);
  for (const side of [-1, 1]) {
    // A set-in sleeve: a rounded cap over the shoulder joint, then a tapered
    // tube down the arm. One ball at the shoulder read as an epaulette. The cap
    // has to stay tall enough to bury the form's shoulder underneath it.
    const cap = new T.Mesh(geo(new T.SphereGeometry(capR, 20, 16)), mats.cloth);
    cap.position.set(shoulderX * 0.93 * side, sleeveY + 0.01, 0);
    cap.scale.set(1.04, 0.74, 1);
    group.add(cap);

    const dx = Math.sin(tilt) * side;
    const dy = -Math.cos(tilt);
    const tube = new T.Mesh(
      geo(new T.CylinderGeometry(armR * 1.02, armR, sleeveLen, 24, 1, true)),
      mats.cloth
    );
    tube.position.set(
      shoulderX * side + dx * sleeveLen * 0.5,
      sleeveY + dy * sleeveLen * 0.5,
      0
    );
    tube.rotation.z = side * tilt;
    group.add(tube);

    const cuff = new T.Mesh(
      geo(new T.CylinderGeometry(armR + 0.005, armR + 0.005, 0.02, 24)),
      mats.trim
    );
    cuff.position.set(
      shoulderX * side + dx * (sleeveLen - 0.008),
      sleeveY + dy * (sleeveLen - 0.008),
      0
    );
    cuff.rotation.z = side * tilt;
    group.add(cuff);

    if (men) {
      const lapel = new T.Mesh(geo(new T.ConeGeometry(0.052, 0.115, 3)), mats.trim);
      lapel.position.set(0.062 * side, neckY - 0.045, profileR(neckY - 0.045) - 0.02);
      lapel.rotation.z = Math.PI + side * 0.4;
      lapel.rotation.x = -0.28;
      group.add(lapel);
    }
  }

  const placketY = kids ? 1.21 : men ? 1.25 : 1.27;
  const placket = new T.Mesh(
    geo(new T.BoxGeometry(0.022, men ? 0.34 : kids ? 0.3 : 0.32, 0.01)),
    mats.trim
  );
  placket.position.set(0, placketY, profileR(placketY) + 0.005);
  group.add(placket);

  for (let i = 0; i < 4; i++) {
    const y = (kids ? 1.06 : men ? 1.14 : 1.1) + i * 0.082;
    const button = new T.Mesh(geo(new T.SphereGeometry(0.009, 10, 8)), mats.brass);
    button.position.set(0, y, profileR(y) + 0.007);
    group.add(button);
  }

  if (men) {
    const pocket = new T.Mesh(geo(new T.BoxGeometry(0.075, 0.062, 0.008)), mats.trim);
    pocket.position.set(0.098, 1.29, profileR(1.29) + 0.004);
    pocket.rotation.y = 0.08;
    group.add(pocket);
  }

  return group;
}

/** A tailored bottom at body coordinates: skirt, trousers or pinafore. */
function buildBottom(
  T: Three,
  audience: SpinAudience,
  mats: AtelierMats,
  geo: <G extends ThreeNS.BufferGeometry>(geometry: G) => G
) {
  const group = new T.Group();
  const men = audience === "men";
  const kids = audience === "kids";

  if (men) {
    // The band has to be wider than the form it covers and reach below the
    // shirt's hem, or the bare waist shows through the join.
    const waist = new T.Mesh(geo(new T.CylinderGeometry(0.172, 0.166, 0.2, 32)), mats.cloth);
    waist.position.y = 0.98;
    group.add(waist);

    for (const side of [-1, 1]) {
      const leg = new T.Mesh(
        geo(new T.CylinderGeometry(0.105, 0.072, 0.78, 24, 1, true)),
        mats.cloth
      );
      leg.position.set(0.086 * side, 0.53, 0);
      group.add(leg);

      const cuff = new T.Mesh(geo(new T.TorusGeometry(0.074, 0.005, 8, 28)), mats.trim);
      cuff.position.set(0.086 * side, 0.145, 0);
      cuff.rotation.x = Math.PI / 2;
      group.add(cuff);

      const crease = new T.Mesh(geo(new T.BoxGeometry(0.006, 0.7, 0.006)), mats.trim);
      crease.position.set(0.086 * side, 0.55, 0.088);
      group.add(crease);
    }

    const belt = new T.Mesh(geo(new T.TorusGeometry(0.172, 0.014, 8, 48)), mats.trim);
    belt.position.y = 1.055;
    belt.rotation.x = Math.PI / 2;
    group.add(belt);

    const buckle = new T.Mesh(geo(new T.BoxGeometry(0.055, 0.04, 0.016)), mats.brass);
    buckle.position.set(0, 1.055, 0.178);
    group.add(buckle);
    return group;
  }

  const hemY = kids ? 0.3 : 0.34;
  const waistY = kids ? 0.94 : 1.08;
  const skirtGeo = geo(
    new T.LatheGeometry(
      kids
        ? [
            new T.Vector2(0.27, hemY),
            new T.Vector2(0.26, hemY + 0.12),
            new T.Vector2(0.23, hemY + 0.28),
            new T.Vector2(0.19, waistY - 0.12),
            new T.Vector2(0.172, waistY),
          ]
        : [
            new T.Vector2(0.3, hemY),
            new T.Vector2(0.292, hemY + 0.16),
            new T.Vector2(0.262, hemY + 0.36),
            new T.Vector2(0.225, waistY - 0.12),
            new T.Vector2(0.186, waistY),
          ],
      72
    )
  );
  pleat(skirtGeo, kids ? 14 : 20, kids ? 0.028 : 0.038, hemY, waistY);
  const skirt = new T.Mesh(skirtGeo, mats.cloth);
  group.add(skirt);

  // The band has to overlap both the bodice and the skirt: it is the join, and
  // a band that floats off either surface shows a hole at the waist.
  const waistR = kids ? 0.178 : 0.192;
  const waistband = new T.Mesh(
    geo(new T.CylinderGeometry(waistR + 0.004, waistR, 0.06, 48, 1, true)),
    mats.trim
  );
  waistband.position.y = waistY - 0.005;
  group.add(waistband);

  const hem = new T.Mesh(
    geo(new T.TorusGeometry(kids ? 0.27 : 0.3, 0.007, 8, 64)),
    mats.trim
  );
  hem.position.y = hemY + 0.002;
  hem.rotation.x = Math.PI / 2;
  group.add(hem);

  if (kids) {
    for (const side of [-1, 1]) {
      const strap = new T.Mesh(geo(new T.BoxGeometry(0.032, 0.3, 0.012)), mats.trim);
      strap.position.set(0.08 * side, 1.08, 0.145);
      group.add(strap);

      const clasp = new T.Mesh(geo(new T.BoxGeometry(0.034, 0.018, 0.014)), mats.brass);
      clasp.position.set(0.08 * side, 0.96, 0.15);
      group.add(clasp);
    }
  }

  return group;
}

/** Headless retail mannequin on the boutique plinth. */
function buildMannequin(
  T: Three,
  audience: SpinAudience,
  palette: Palette,
  fabric: ThreeNS.Texture
): Figure {
  const group = new T.Group();
  const junk: Junk[] = [];
  const geo = <G extends ThreeNS.BufferGeometry>(geometry: G): G => {
    junk.push(geometry);
    return geometry;
  };
  const mats = atelierMats(T, palette, fabric, junk);
  const mat = (options: ThreeNS.MeshPhysicalMaterialParameters) => {
    const material = new T.MeshPhysicalMaterial(options);
    junk.push(material);
    return material;
  };
  addPedestal(T, group, palette, mat, geo);

  const figure = new T.Group();
  figure.position.y = 0.14;
  figure.add(buildBody(T, audience, mats, geo, "mannequin"));
  figure.add(buildTop(T, audience, mats, geo));
  figure.add(buildBottom(T, audience, mats, geo));
  if (audience === "kids") figure.scale.setScalar(0.8);
  group.add(figure);
  return { group, junk };
}

/** A stylised adult figure for editorial model shots. */
function buildModel(
  T: Three,
  audience: SpinAudience,
  palette: Palette,
  fabric: ThreeNS.Texture
): Figure {
  const group = new T.Group();
  const junk: Junk[] = [];
  const geo = <G extends ThreeNS.BufferGeometry>(geometry: G): G => {
    junk.push(geometry);
    return geometry;
  };
  const mats = atelierMats(T, palette, fabric, junk);
  const mat = (options: ThreeNS.MeshPhysicalMaterialParameters) => {
    const material = new T.MeshPhysicalMaterial(options);
    junk.push(material);
    return material;
  };
  addPedestal(T, group, palette, mat, geo);

  const figure = new T.Group();
  figure.position.y = 0.14;
  figure.add(buildBody(T, audience, mats, geo, "model"));
  figure.add(buildTop(T, audience, mats, geo));
  figure.add(buildBottom(T, audience, mats, geo));
  // A soft weight shift, so the pose is not a symmetrical T.
  figure.rotation.z = audience === "men" ? 0.012 : -0.018;
  group.add(figure);
  return { group, junk };
}

/** The garment as a digital kit: hung, measured, with its own swatches. */
function buildFashionKit(
  T: Three,
  audience: SpinAudience,
  palette: Palette,
  fabric: ThreeNS.Texture
): Figure {
  const group = new T.Group();
  const junk: Junk[] = [];
  const geo = <G extends ThreeNS.BufferGeometry>(geometry: G): G => {
    junk.push(geometry);
    return geometry;
  };
  const mats = atelierMats(T, palette, fabric, junk);
  const mat = (options: ThreeNS.MeshPhysicalMaterialParameters) => {
    const material = new T.MeshPhysicalMaterial(options);
    junk.push(material);
    return material;
  };
  addPedestal(T, group, palette, mat, geo);

  const figure = new T.Group();
  figure.position.y = 0.135;
  const men = audience === "men";
  const kids = audience === "kids";
  const top = buildTop(T, audience, mats, geo, true);
  const bottom = buildBottom(T, audience, mats, geo);

  // Nothing wears the outfit here, so the two pieces only read as one garment
  // if the bodice still overlaps the waist. A fixed lift left a floating skirt
  // on the short kid's build, so the lift is derived from each bodice.
  const waistTop = men ? 1.08 : kids ? 0.94 : 1.08;
  const lift = waistTop - 0.05 - BODICE[audience].base;
  top.position.y = lift;
  figure.add(top, bottom);
  if (kids) figure.scale.setScalar(0.86);

  // An open brass rail standing on the plinth. Without something to hang from,
  // the suspended garment reads as a floating dress.
  const rail = new T.Group();
  // The bar tucks under the neckline so only the stem and hook break out of the
  // garment, and the rail is exactly as tall as that hook needs.
  const barY = BODICE[audience].top + lift - 0.075;
  const railTop = barY + 0.177;
  const hangerX = (men ? 0.205 : kids ? 0.163 : 0.185) * 0.86;
  for (const side of [-1, 1]) {
    const post = new T.Mesh(
      geo(new T.CylinderGeometry(0.011, 0.013, railTop - 0.01, 16)),
      mats.brass
    );
    post.position.set(0.44 * side, (railTop - 0.01) / 2 + 0.01, 0);
    rail.add(post);

    const foot = new T.Mesh(geo(new T.CylinderGeometry(0.052, 0.062, 0.02, 28)), mats.brass);
    foot.position.set(0.44 * side, 0.01, 0);
    rail.add(foot);
  }
  const crossbar = new T.Mesh(geo(new T.CylinderGeometry(0.01, 0.01, 0.92, 16)), mats.brass);
  crossbar.position.y = railTop;
  crossbar.rotation.z = Math.PI / 2;
  rail.add(crossbar);
  figure.add(rail);

  const line = (points: [number, number, number][], color: string, opacity: number) => {
    const lineGeo = new T.BufferGeometry().setFromPoints(
      points.map(([x, y, z]) => new T.Vector3(x, y, z))
    );
    const lineMat = new T.LineBasicMaterial({
      color: hex(color),
      transparent: true,
      opacity,
      toneMapped: false,
    });
    junk.push(lineGeo, lineMat);
    const drawn = new T.Line(lineGeo, lineMat);
    figure.add(drawn);
    return drawn;
  };

  // The hanger's shoulders live inside the garment — that is how a hung dress
  // actually reads — so only the stem and hook rise out of the neckline.
  const chrome = mat({
    color: 0xd6dce6,
    roughness: 0.16,
    metalness: 1,
    clearcoat: 0.6,
  });
  const bar = new T.Mesh(
    geo(new T.CylinderGeometry(0.008, 0.008, hangerX * 2 + 0.02, 12)),
    chrome
  );
  bar.position.set(0, barY, 0);
  bar.rotation.z = Math.PI / 2;
  figure.add(bar);

  for (const side of [-1, 1]) {
    const shoulder = new T.Mesh(geo(new T.CylinderGeometry(0.007, 0.007, 0.1, 10)), chrome);
    shoulder.position.set(hangerX * side, barY - 0.048, 0);
    shoulder.rotation.z = side * 0.31;
    figure.add(shoulder);
  }

  const stem = new T.Mesh(geo(new T.CylinderGeometry(0.007, 0.007, 0.13, 10)), chrome);
  stem.position.set(0, barY + 0.06, 0);
  figure.add(stem);

  const hook = new T.Mesh(
    geo(new T.TorusGeometry(0.032, 0.007, 8, 28, Math.PI * 1.35)),
    chrome
  );
  hook.position.set(0, barY + 0.138, 0);
  hook.rotation.z = -0.2;
  figure.add(hook);

  // Measurement marks track the real hem of each build (see buildBottom).
  const hemY = audience === "men" ? 0.15 : audience === "kids" ? 0.3 : 0.34;
  const hemR = audience === "men" ? 0.16 : audience === "kids" ? 0.27 : 0.3;
  const waistY = audience === "men" ? 1.05 : audience === "kids" ? 0.94 : 1.08;
  line(
    [
      [-hemR - 0.04, hemY, 0.015],
      [hemR + 0.04, hemY, 0.015],
    ],
    palette.trim,
    0.75
  );
  for (const side of [-1, 1]) {
    line(
      [
        [(hemR + 0.04) * side, hemY - 0.035, 0.015],
        [(hemR + 0.04) * side, hemY + 0.035, 0.015],
      ],
      palette.trim,
      0.75
    );
  }
  line(
    [
      [hemR + 0.06, hemY, 0.01],
      [hemR + 0.06, BODICE[audience].top + lift - 0.02, 0.01],
    ],
    palette.trim,
    0.4
  );
  for (const y of [hemY, waistY, BODICE[audience].top + lift - 0.06]) {
    line(
      [
        [hemR - 0.02, y, 0.01],
        [hemR + 0.1, y, 0.01],
      ],
      palette.trim,
      0.3
    );
  }

  // The colour story: swatches fanned flat on the plinth top, like a fabric
  // book laid out beside the piece. They live on `group`, not `figure`, so
  // they stay on the plinth at every audience scale.
  const swatches = [
    palette.primary,
    palette.secondary,
    palette.outfit,
    palette.trim,
    "#E8DECE",
    "#14141C",
  ];
  swatches.forEach((color, index) => {
    const spread = (index / (swatches.length - 1) - 0.5) * 1.9;
    const chip = new T.Mesh(
      geo(new T.BoxGeometry(0.086, 0.012, 0.086)),
      mat({
        color: hex(color),
        roughness: 0.52,
        metalness: 0.05,
        clearcoat: 0.35,
        side: T.DoubleSide,
      })
    );
    chip.position.set(Math.sin(spread) * 0.62, 0.142, Math.cos(spread) * 0.62);
    chip.rotation.y = spread;
    group.add(chip);
  });

  // A folded sample stack on the plinth — the kit's fabric lot.
  const foldColors = [palette.outfit, palette.trim, shadeHex(palette.primary, 0.35)];
  foldColors.forEach((color, index) => {
    const fold = new T.Mesh(geo(new T.BoxGeometry(0.2, 0.022, 0.14)), mat({
      color: hex(color),
      roughness: 0.7,
      metalness: 0.02,
      bumpMap: fabric,
      bumpScale: 0.012,
      sheen: 0.6,
      sheenRoughness: 0.55,
      sheenColor: new T.Color(hex(shadeHex(color, 0.45))),
    }));
    fold.position.set(-0.34, 0.147 + index * 0.023, -0.44 - index * 0.006);
    fold.rotation.y = -0.32 + index * 0.09;
    group.add(fold);
  });

  group.add(figure);
  return { group, junk };
}


function buildDoll(
  T: Three,
  audience: SpinAudience,
  palette: Palette,
  fabric: ThreeNS.Texture
): Figure {
  const group = new T.Group();
  const junk: Junk[] = [];

  const mat = (options: ThreeNS.MeshStandardMaterialParameters) => {
    const material = new T.MeshStandardMaterial(options);
    junk.push(material);
    return material;
  };
  const geo = <G extends ThreeNS.BufferGeometry>(geometry: G): G => {
    junk.push(geometry);
    return geometry;
  };
  const cloth = (color: string, weight = 0.85) => {
    const material = new T.MeshPhysicalMaterial({
      color: hex(color),
      roughness: 0.74,
      metalness: 0.02,
      bumpMap: fabric,
      bumpScale: 0.016,
      sheen: weight,
      sheenRoughness: 0.55,
      sheenColor: new T.Color(hex(shadeHex(color, 0.48))),
      side: T.DoubleSide,
    });
    junk.push(material);
    return material;
  };

  const dressMat = cloth(palette.outfit);
  const trimMat = cloth(palette.trim);
  const skinMat = mat({ color: hex(audience === "kids" ? "#D9A886" : "#C89272"), roughness: 0.62 });
  const hairMat = mat({ color: hex(palette.hair), roughness: 0.65 });
  const eyeMat = mat({ color: 0x1c1520, roughness: 0.3 });
  const goldMat = mat({ color: 0xd9a441, roughness: 0.28, metalness: 0.7 });

  const scale = audience === "kids" ? 0.94 : 1;
  group.scale.setScalar(scale);

  // Collectible stand
  const stand = new T.Mesh(geo(new T.CylinderGeometry(0.34, 0.4, 0.07, 40)), goldMat);
  stand.position.y = 0.04;
  group.add(stand);

  // Doll dress — A-line with a little volume.
  const dressGeo = geo(
    new T.LatheGeometry(
      [
        new T.Vector2(0.3, 0.28),
        new T.Vector2(0.26, 0.42),
        new T.Vector2(0.2, 0.6),
        new T.Vector2(0.15, 0.78),
        new T.Vector2(0.14, 0.9),
      ],
      72
    )
  );
  pleat(dressGeo, 14, 0.035, 0.28, 0.9);
  const dress = new T.Mesh(dressGeo, dressMat);
  group.add(dress);

  // Ruffled hem and a soft netting layer peeking out.
  for (const [radius, y] of [
    [0.31, 0.285],
    [0.275, 0.32],
  ] as const) {
    const ruffle = new T.Mesh(geo(new T.TorusGeometry(radius, 0.022, 10, 72)), trimMat);
    ruffle.position.y = y;
    ruffle.rotation.x = Math.PI / 2;
    group.add(ruffle);
  }

  const bodice = new T.Mesh(
    geo(
      new T.LatheGeometry(
        [
          new T.Vector2(0.145, 0.88),
          new T.Vector2(0.13, 0.98),
          new T.Vector2(0.15, 1.06),
          new T.Vector2(0.1, 1.11),
        ],
        28
      )
    ),
    dressMat
  );
  group.add(bodice);

  const sash = new T.Mesh(geo(new T.TorusGeometry(0.145, 0.016, 8, 48)), trimMat);
  sash.position.y = 0.9;
  sash.rotation.x = Math.PI / 2;
  group.add(sash);

  // Puff sleeves and a peter-pan collar — the details that make a doll read
  // as dressed rather than moulded.
  for (const side of [-1, 1]) {
    const puff = new T.Mesh(geo(new T.SphereGeometry(0.075, 20, 16)), dressMat);
    puff.position.set(0.16 * side, 1.04, 0);
    puff.scale.set(1.05, 0.85, 1);
    group.add(puff);

    const cuff = new T.Mesh(geo(new T.TorusGeometry(0.052, 0.011, 8, 32)), trimMat);
    cuff.position.set(0.18 * side, 0.99, 0);
    cuff.rotation.z = Math.PI / 2;
    group.add(cuff);

    const collar = new T.Mesh(geo(new T.SphereGeometry(0.055, 18, 12)), trimMat);
    collar.position.set(0.045 * side, 1.1, 0.09);
    collar.scale.set(1.5, 0.55, 0.7);
    collar.rotation.z = side * 0.4;
    group.add(collar);
  }

  // Sash bow at the back.
  for (const side of [-1, 1]) {
    const loop = new T.Mesh(geo(new T.SphereGeometry(0.045, 16, 12)), trimMat);
    loop.position.set(0.045 * side, 0.9, -0.16);
    loop.scale.set(1.2, 0.65, 0.55);
    loop.rotation.z = side * 0.55;
    group.add(loop);
  }
  const knot = new T.Mesh(geo(new T.SphereGeometry(0.025, 14, 10)), trimMat);
  knot.position.set(0, 0.9, -0.165);
  group.add(knot);

  // Head with a soft, friendly face.
  const head = new T.Mesh(geo(new T.SphereGeometry(0.27, 32, 24)), skinMat);
  head.position.y = 1.38;
  head.scale.set(1, 1.03, 0.96);
  group.add(head);

  const hair = new T.Mesh(
    geo(new T.SphereGeometry(0.282, 30, 20, 0, Math.PI * 2, 0, Math.PI * 0.58)),
    hairMat
  );
  hair.position.set(0, 1.42, -0.025);
  hair.rotation.x = -0.15;
  group.add(hair);

  const whiteMat = mat({ color: 0xfbf7f2, roughness: 0.32 });
  const blushMat = mat({ color: 0xe0857a, roughness: 0.6, transparent: true, opacity: 0.4 });

  for (const side of [-1, 1]) {
    const eyeWhite = new T.Mesh(geo(new T.SphereGeometry(0.032, 16, 12)), whiteMat);
    eyeWhite.position.set(0.088 * side, 1.4, 0.246);
    eyeWhite.scale.set(0.85, 1, 0.45);
    group.add(eyeWhite);

    const eye = new T.Mesh(geo(new T.SphereGeometry(0.016, 14, 10)), eyeMat);
    eye.position.set(0.09 * side, 1.399, 0.267);
    group.add(eye);

    const glint = new T.Mesh(geo(new T.SphereGeometry(0.005, 8, 6)), whiteMat);
    glint.position.set(0.084 * side, 1.406, 0.279);
    group.add(glint);

    const brow = new T.Mesh(geo(new T.CapsuleGeometry(0.006, 0.036, 4, 8)), hairMat);
    brow.position.set(0.089 * side, 1.452, 0.238);
    brow.rotation.z = Math.PI / 2 + side * 0.16;
    group.add(brow);

    const cheek = new T.Mesh(geo(new T.SphereGeometry(0.032, 12, 8)), blushMat);
    cheek.position.set(0.145 * side, 1.355, 0.206);
    cheek.scale.set(1, 0.72, 0.35);
    group.add(cheek);

    const ear = new T.Mesh(geo(new T.SphereGeometry(0.045, 12, 10)), skinMat);
    ear.position.set(0.262 * side, 1.36, 0);
    ear.scale.set(0.7, 1, 0.7);
    group.add(ear);

    const arm = new T.Mesh(geo(new T.CapsuleGeometry(0.04, 0.22, 6, 12)), skinMat);
    arm.position.set(0.26 * side, 0.96, 0.02);
    arm.rotation.z = 0.35 * side;
    group.add(arm);

    const hand = new T.Mesh(geo(new T.SphereGeometry(0.045, 12, 10)), skinMat);
    hand.position.set(0.33 * side, 0.82, 0.03);
    group.add(hand);

    const leg = new T.Mesh(geo(new T.CapsuleGeometry(0.045, 0.1, 6, 10)), skinMat);
    leg.position.set(0.1 * side, 0.22, 0);
    group.add(leg);

    const shoe = new T.Mesh(geo(new T.SphereGeometry(0.06, 14, 10)), trimMat);
    shoe.position.set(0.1 * side, 0.12, 0.03);
    shoe.scale.set(0.9, 0.6, 1.3);
    group.add(shoe);

    if (audience !== "men") {
      const pigtail = new T.Mesh(geo(new T.SphereGeometry(0.07, 14, 12)), hairMat);
      pigtail.position.set(0.27 * side, 1.33, -0.06);
      pigtail.scale.set(0.8, 1.2, 0.8);
      group.add(pigtail);
    }
  }

  const nose = new T.Mesh(geo(new T.SphereGeometry(0.018, 12, 10)), skinMat);
  nose.position.set(0, 1.372, 0.263);
  nose.scale.set(0.9, 0.8, 0.7);
  group.add(nose);

  const smile = new T.Mesh(
    geo(new T.TorusGeometry(0.036, 0.007, 8, 24, Math.PI)),
    mat({ color: 0x9e3f45, roughness: 0.45 })
  );
  smile.position.set(0, 1.335, 0.245);
  smile.rotation.z = Math.PI;
  group.add(smile);

  if (audience !== "men") {
    for (const side of [-1, 1]) {
      const ribbon = new T.Mesh(geo(new T.BoxGeometry(0.07, 0.032, 0.012)), trimMat);
      ribbon.position.set(0.245 * side, 1.43, -0.03);
      ribbon.rotation.z = side * 0.5;
      group.add(ribbon);
    }
  }

  const ringMat = new T.MeshBasicMaterial({ color: hex(palette.trim), toneMapped: false });
  junk.push(ringMat);
  const standRing = new T.Mesh(geo(new T.TorusGeometry(0.36, 0.01, 8, 48)), ringMat);
  standRing.position.y = 0.08;
  standRing.rotation.x = Math.PI / 2;
  group.add(standRing);

  return { group, junk };
}

/**
 * Corporate showcase: a lacquered bottle or a rigid gift box on the same
 * turntable. No people, no audience variants — the product is the subject.
 */
function buildShowcase(
  T: Three,
  product: "product" | "packaging",
  palette: Palette,
  fabric: ThreeNS.Texture
): Figure {
  const group = new T.Group();
  const junk: Junk[] = [];

  const mat = (options: ThreeNS.MeshPhysicalMaterialParameters) => {
    const material = new T.MeshPhysicalMaterial(options);
    junk.push(material);
    return material;
  };
  const geo = <G extends ThreeNS.BufferGeometry>(geometry: G): G => {
    junk.push(geometry);
    return geometry;
  };

  addPedestal(T, group, palette, mat, geo);
  const lift = 0.14;

  const lacquer = mat({
    color: hex(mixHex(palette.outfit, palette.secondary, 0.3)),
    roughness: 0.22,
    metalness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
  });
  const gold = mat({
    color: hex(palette.trim),
    roughness: 0.26,
    metalness: 0.78,
    clearcoat: 0.6,
  });
  const paper = mat({
    color: hex(mixHex(palette.outfit, "#111827", 0.25)),
    roughness: 0.78,
    metalness: 0.04,
    bumpMap: fabric,
    bumpScale: 0.008,
    sheen: 0.45,
    sheenRoughness: 0.7,
    sheenColor: new T.Color(hex(shadeHex(palette.outfit, 0.4))),
    side: T.DoubleSide,
  });

  if (product === "packaging") {
    const box = new T.Mesh(geo(new T.BoxGeometry(0.62, 0.4, 0.44, 1, 1, 1)), paper);
    box.position.y = lift + 0.2;
    group.add(box);

    const lid = new T.Mesh(geo(new T.BoxGeometry(0.66, 0.1, 0.48)), paper);
    lid.position.y = lift + 0.45;
    group.add(lid);

    for (const axis of ["x", "z"] as const) {
      const ribbon = new T.Mesh(
        geo(
          axis === "x"
            ? new T.BoxGeometry(0.67, 0.012, 0.07)
            : new T.BoxGeometry(0.07, 0.012, 0.49)
        ),
        gold
      );
      ribbon.position.y = lift + 0.506;
      group.add(ribbon);

      const band = new T.Mesh(
        geo(
          axis === "x"
            ? new T.BoxGeometry(0.632, 0.41, 0.072)
            : new T.BoxGeometry(0.072, 0.41, 0.452)
        ),
        gold
      );
      band.position.y = lift + 0.2;
      group.add(band);
    }

    const seal = new T.Mesh(geo(new T.CylinderGeometry(0.115, 0.115, 0.014, 40)), gold);
    seal.position.y = lift + 0.512;
    group.add(seal);

    const sealInset = new T.Mesh(
      geo(new T.CylinderGeometry(0.082, 0.082, 0.016, 40)),
      paper
    );
    sealInset.position.y = lift + 0.513;
    group.add(sealInset);

    // A small stack of tissue at the open edge sells the unboxing idea.
    const tissue = new T.Mesh(geo(new T.ConeGeometry(0.1, 0.16, 16, 1, true)), paper);
    tissue.position.set(0.19, lift + 0.53, 0.06);
    tissue.rotation.z = 0.32;
    group.add(tissue);
  } else {
    const body = new T.Mesh(
      geo(
        new T.LatheGeometry(
          [
            new T.Vector2(0.24, 0),
            new T.Vector2(0.255, 0.06),
            new T.Vector2(0.25, 0.44),
            new T.Vector2(0.21, 0.54),
            new T.Vector2(0.1, 0.6),
            new T.Vector2(0.09, 0.66),
          ],
          48
        )
      ),
      lacquer
    );
    body.position.y = lift;
    group.add(body);

    const collar = new T.Mesh(geo(new T.TorusGeometry(0.092, 0.018, 12, 48)), gold);
    collar.position.y = lift + 0.66;
    collar.rotation.x = Math.PI / 2;
    group.add(collar);

    const cap = new T.Mesh(geo(new T.CylinderGeometry(0.1, 0.1, 0.15, 40)), gold);
    cap.position.y = lift + 0.735;
    group.add(cap);

    const capTop = new T.Mesh(geo(new T.CylinderGeometry(0.078, 0.078, 0.012, 40)), lacquer);
    capTop.position.y = lift + 0.815;
    group.add(capTop);

    const label = new T.Mesh(
      geo(new T.CylinderGeometry(0.252, 0.252, 0.2, 48, 1, true)),
      paper
    );
    label.position.y = lift + 0.24;
    group.add(label);

    for (const y of [0.14, 0.34]) {
      const ring = new T.Mesh(geo(new T.TorusGeometry(0.253, 0.006, 8, 48)), gold);
      ring.position.y = lift + y;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    // Embossed mark on the label, facing the camera at rest.
    const mark = new T.Mesh(geo(new T.CylinderGeometry(0.055, 0.055, 0.006, 32)), gold);
    mark.position.set(0, lift + 0.24, 0.252);
    mark.rotation.x = Math.PI / 2;
    group.add(mark);
  }

  return { group, junk };
}

function addPedestal(
  T: Three,
  group: ThreeNS.Group,
  palette: Palette,
  mat: (options: ThreeNS.MeshPhysicalMaterialParameters) => ThreeNS.MeshPhysicalMaterial,
  geo: <G extends ThreeNS.BufferGeometry>(geometry: G) => G
) {
  const baseMat = mat({ color: 0x111118, roughness: 0.32, metalness: 0.55 });
  const base = new T.Mesh(geo(new T.CylinderGeometry(0.84, 0.92, 0.1, 48)), baseMat);
  base.position.y = 0.05;
  group.add(base);

  const topMat = mat({ color: 0x191922, roughness: 0.26, metalness: 0.6 });
  const top = new T.Mesh(geo(new T.CylinderGeometry(0.8, 0.84, 0.035, 48)), topMat);
  top.position.y = 0.118;
  group.add(top);

  // A lit metal inlay, not an emissive disc: an unlit brand-coloured glow is
  // what made the stage read as a toy rather than a boutique plinth.
  const ringMat = mat({
    color: hex(mixHex(palette.primary, "#8C6B3F", 0.6)),
    roughness: 0.26,
    metalness: 0.85,
    clearcoat: 0.4,
    emissive: hex(shadeHex(palette.primary, 0.72)),
    emissiveIntensity: 0.22,
  });
  const ring = new T.Mesh(geo(new T.TorusGeometry(0.68, 0.007, 10, 96)), ringMat);
  ring.position.y = 0.139;
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  const grooveMat = mat({ color: 0x23232d, roughness: 0.38, metalness: 0.5 });
  const groove = new T.Mesh(geo(new T.TorusGeometry(0.5, 0.0045, 8, 80)), grooveMat);
  groove.position.y = 0.1375;
  groove.rotation.x = Math.PI / 2;
  group.add(groove);

  const centreMat = mat({ color: 0x15151d, roughness: 0.2, metalness: 0.65 });
  const centre = new T.Mesh(geo(new T.CircleGeometry(0.18, 48)), centreMat);
  centre.position.y = 0.137;
  centre.rotation.x = -Math.PI / 2;
  group.add(centre);
}

/* ------------------------------------------------------------------ */
/* WebGL-less fallback                                                 */
/* ------------------------------------------------------------------ */

function SpinFallback({
  audience,
  product,
  mode,
  primary,
  secondary,
  className,
}: {
  audience: SpinAudience;
  product: SpinProduct;
  mode: SpinMode;
  primary: string;
  secondary: string;
  className?: string;
}) {
  const scale = audience === "kids" ? 0.82 : 1;
  const label = isShowcase(product)
    ? `${PRODUCT_LABEL[product]} preview`
    : product === "outfit"
      ? `${AUDIENCE_LABEL[audience]} outfit on a ${SPIN_MODE_LABEL[mode].toLowerCase()}`
      : `${AUDIENCE_LABEL[audience]} ${PRODUCT_LABEL[product]} preview`;
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-2xl border border-white/8",
        className
      )}
      style={{
        background: `radial-gradient(120% 90% at 50% 18%, ${rgba(secondary, 0.3)} 0%, #070811 60%, #05060c 100%)`,
      }}
    >
      <svg
        viewBox="0 0 200 260"
        role="img"
        aria-label={label}
        className="h-[86%] w-auto"
      >
        <ellipse cx="100" cy="236" rx="70" ry="16" fill="rgba(0,0,0,0.6)" />
        <ellipse cx="100" cy="232" rx="58" ry="10" fill="none" stroke={primary} strokeWidth="1.2" opacity="0.7" />
        <g transform={`translate(100 0) scale(${scale}) translate(-100 0)`}>
          {product === "packaging" ? (
            <>
              <rect x="56" y="128" width="88" height="70" rx="4" fill={mixHex(primary, secondary, 0.4)} />
              <rect x="52" y="116" width="96" height="18" rx="3" fill={mixHex(primary, secondary, 0.25)} />
              <rect x="94" y="116" width="12" height="82" fill={primary} />
              <rect x="52" y="156" width="96" height="12" fill={primary} />
              <circle cx="100" cy="125" r="10" fill="none" stroke={primary} strokeWidth="2" />
              <path d="M100 116v18M91 125h18" stroke={primary} strokeWidth="1.4" opacity="0.6" />
            </>
          ) : product === "product" ? (
            <>
              <path d="M84 116h32v22c0 8 6 10 6 20v52H78v-52c0-10 6-12 6-20v-22Z" fill={mixHex(primary, secondary, 0.35)} />
              <rect x="86" y="104" width="28" height="16" rx="3" fill={primary} />
              <rect x="78" y="156" width="44" height="34" rx="3" fill="#0f172a" stroke={primary} strokeWidth="1" />
              <circle cx="100" cy="173" r="6" fill="none" stroke={primary} strokeWidth="1.4" />
            </>
          ) : product === "doll" ? (
            <>
              <circle cx="100" cy="78" r="26" fill="#D9A886" />
              <path d="M74 70a26 26 0 0 1 52 0c-8-7-18-10-26-10s-18 3-26 10Z" fill="#221812" />
              <path d="M82 156c0-30 6-48 18-48s18 18 18 48l12 60H70l12-60Z" fill={mixHex(primary, secondary, 0.35)} />
              <path d="M86 104h28v14H86z" fill={secondary} opacity="0.7" />
              <rect x="88" y="192" width="9" height="26" rx="4.5" fill="#D9A886" />
              <rect x="103" y="192" width="9" height="26" rx="4.5" fill="#D9A886" />
              <circle cx="92" cy="74" r="2.4" fill="#1c1520" />
              <circle cx="108" cy="74" r="2.4" fill="#1c1520" />
            </>
          ) : mode === "mannequin" ? (
            <>
              <ellipse cx="100" cy="232" rx="26" ry="5" fill="#191922" stroke={primary} strokeWidth="1" />
              <rect x="97.5" y="196" width="5" height="34" fill={shadeHex(primary, 0.3)} />
              <path
                d="M92 84c-5 3-10 6-13 11s-5 14-2 22c2 7 6 12 8 18 1 3 0 7-1 11-2 7-6 13-8 20-2 6 1 12 7 14h34c6-2 9-8 7-14-2-7-6-13-8-20-1-4-2-8-1-11 2-6 6-11 8-18 3-8 1-17-2-22s-8-8-13-11Z"
                fill={mixHex(primary, secondary, 0.22)}
              />
              <path
                d="M100 86v100M86 100c-4 12-4 26 0 38M114 100c4 12 4 26 0 38"
                stroke={shadeHex(primary, 0.35)}
                strokeWidth="0.9"
                fill="none"
                opacity="0.55"
              />
              <ellipse cx="100" cy="83" rx="9" ry="3.6" fill={primary} />
              <ellipse cx="100" cy="81.4" rx="6.4" ry="2.4" fill={mixHex(primary, "#FFFFFF", 0.32)} />
            </>
          ) : mode === "model" ? (
            <>
              <circle cx="100" cy="47" r="4.6" fill={HAIR} />
              <ellipse cx="100" cy="66" rx="9.4" ry="11.8" fill="#C99878" />
              <path d="M89 64a11 12 0 0 1 22 0c-4-6-7-8-11-8s-7 2-11 8Z" fill={HAIR} />
              <path d="M89 68c-2 6-2 11 0 15-3-2-5-8-4-13ZM111 68c2 6 2 11 0 15 3-2 5-8 4-13Z" fill={HAIR} />
              <rect x="96.6" y="76" width="6.8" height="9" fill="#B9856A" />
              <path
                d="M84 92c-6 8-9 24-8 40 1 22-6 52-13 78h74c-7-26-14-56-13-78 1-16-2-32-8-40-6 4-26 4-32 0Z"
                fill={mixHex(primary, secondary, 0.24)}
              />
              <path d="M84 92c-6 4-10 12-11 22l-6 44" stroke="#C99878" strokeWidth="6" fill="none" strokeLinecap="round" />
              <path d="M116 92c6 4 10 12 11 22l6 44" stroke="#C99878" strokeWidth="6" fill="none" strokeLinecap="round" />
              <path d="M84 92q16 6 32 0" stroke={primary} strokeWidth="2" fill="none" />
              <path d="M86 138q14 5 28 0" stroke={shadeHex(primary, 0.4)} strokeWidth="2" fill="none" opacity="0.7" />
              <ellipse cx="92" cy="214" rx="7" ry="3" fill="#1b1b22" stroke={primary} strokeWidth="0.8" />
              <ellipse cx="108" cy="214" rx="7" ry="3" fill="#1b1b22" stroke={primary} strokeWidth="0.8" />
            </>
          ) : (
            <>
              <path d="M100 32c0-8 9-9 9-1 0 6-9 7-9 14" fill="none" stroke={primary} strokeWidth="2.4" strokeLinecap="round" />
              <path d="M72 60h56M72 60l14 24M128 60l-14 24" stroke={primary} strokeWidth="3" strokeLinecap="round" fill="none" />
              <path
                d="M84 86 72 206h56L116 86q-16 10-32 0Z"
                fill={mixHex(primary, secondary, 0.24)}
              />
              <path d="M84 86q16 11 32 0" stroke={primary} strokeWidth="2" fill="none" />
              <path d="M100 90v114" stroke={shadeHex(primary, 0.4)} strokeWidth="0.8" strokeDasharray="3 4" opacity="0.6" />
              <path d="M144 62h10M144 90h10M144 134h10M144 206h10M144 62v144" stroke={primary} strokeWidth="0.8" opacity="0.45" />
              {[0, 1, 2, 3].map((index) => (
                <rect
                  key={index}
                  x="38"
                  y={150 + index * 15}
                  width="12"
                  height="12"
                  rx="2"
                  fill={
                    index % 2 === 0
                      ? mixHex(primary, secondary, index * 0.2)
                      : shadeHex(primary, 0.15 * index)
                  }
                  stroke={primary}
                  strokeWidth="0.6"
                />
              ))}
              <rect x="52" y="150" width="18" height="24" rx="2" fill="#111118" stroke={primary} strokeWidth="0.8" />
              <path d="M55 156h12M55 160h12M55 164h8" stroke={primary} strokeWidth="0.7" opacity="0.6" />
            </>
          )}
          {mode !== "kit" || product !== "outfit" ? (
            <ellipse cx="100" cy="228" rx="52" ry="9" fill="#191922" stroke={primary} strokeWidth="1" />
          ) : null}
        </g>
      </svg>
      <span className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-white/45 backdrop-blur-md">
        Static preview · WebGL off
      </span>
    </div>
  );
}
