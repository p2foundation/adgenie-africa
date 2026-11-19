"use client";

import { useEffect, useRef } from "react";

/**
 * Liquid-gold / aurora hero background. Raw WebGL: one fullscreen triangle and a
 * domain-warped fbm fragment shader in the brand palette (deep indigo → violet →
 * gold), gently reacting to the pointer.
 *
 * Guardrails (this page must stay fast on Ghanaian 3G/4G):
 * - DPR capped at 1.5 — it is a soft background, not a product shot.
 * - rAF stops when offscreen or the tab is hidden.
 * - prefers-reduced-motion: renders one static frame.
 * - WebGL unavailable or context lost: the canvas stays empty and the CSS
 *   gradient painted underneath shows instead.
 */

const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_mouse;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
    f.y
  );
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.3, 9.1);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 p = (uv - 0.5) * vec2(u_res.x / u_res.y, 1.0) * 2.3;
  float t = u_time * 0.06;

  // Domain warp: two fbm passes bend the field into slow liquid folds.
  vec2 m = u_mouse * 0.4;
  vec2 q = vec2(
    fbm(p * 0.9 + m + vec2(0.0, t)),
    fbm(p * 0.9 + vec2(5.2, 1.3) - t * 0.7)
  );
  vec2 r = vec2(
    fbm(p * 0.9 + 2.2 * q + vec2(1.7, 9.2) + t * 0.9),
    fbm(p * 0.9 + 2.6 * q + vec2(8.3, 2.8) - t * 0.6)
  );
  float f = fbm(p * 0.9 + 2.4 * r);

  vec3 deep    = vec3(0.020, 0.016, 0.055);
  vec3 indigo  = vec3(0.090, 0.070, 0.290);
  vec3 violet  = vec3(0.230, 0.150, 0.540);
  vec3 amber   = vec3(0.980, 0.660, 0.140);
  vec3 gold    = vec3(1.000, 0.800, 0.250);

  vec3 col = deep;
  col = mix(col, indigo, smoothstep(0.18, 0.80, f));
  col = mix(col, violet, smoothstep(0.45, 0.95, q.y) * 0.78);

  // Gold veins where the warped field folds high.
  col += amber * pow(clamp(f, 0.0, 1.0), 3.0) * 0.62;
  col += gold * smoothstep(0.66, 0.96, f) * 0.45;

  // Pointer hotspot — the "genie" follows your hand.
  float glow = pow(clamp(1.0 - length(p - m * 2.0 - vec2(0.0, 0.35)), 0.0, 1.0), 2.2);
  col += amber * glow * 0.30;

  // Vignette + grain to kill banding.
  float d = length(uv - 0.5);
  col *= 1.0 - d * d * 0.9;
  col += (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * 0.016;

  gl_FragColor = vec4(col, 1.0);
}`;

export function HeroShader({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    };

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    );
    const loc = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uMouse = gl.getUniformLocation(prog, "u_mouse");

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    let raf = 0;
    let running = false;
    let visible = true;
    let last = performance.now();
    let time = 0;
    const mouse = { x: 0.35, y: 0.25, tx: 0.35, ty: 0.25 };

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w === 0 || h === 0) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const frame = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      time += dt;
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      gl.uniform1f(uTime, time);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduceMotion) raf = requestAnimationFrame(frame);
      else running = false;
    };

    const start = () => {
      if (!running && visible && !document.hidden) {
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
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
      { rootMargin: "80px" }
    );
    io.observe(canvas);

    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);

    const onPointer = (e: PointerEvent) => {
      mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onPointer, { passive: true });

    const onLost = (e: Event) => {
      e.preventDefault();
      stop();
    };
    canvas.addEventListener("webglcontextlost", onLost);

    start();

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointermove", onPointer);
      canvas.removeEventListener("webglcontextlost", onLost);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: "100%", height: "100%", display: "block" }}
      aria-hidden="true"
    />
  );
}
