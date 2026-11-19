"use client";

import { useId, useMemo, useState, type PointerEvent, type ReactNode } from "react";
import { formatGhs, formatUsdMicros } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface CurvePoint {
  label: string;
  value: number;
}

const TONES = {
  gold: {
    line: "#fbbf24",
    soft: "#f59e0b",
    glow: "rgba(251, 191, 36, 0.28)",
  },
  green: {
    line: "#34d399",
    soft: "#10b981",
    glow: "rgba(52, 211, 153, 0.22)",
  },
  violet: {
    line: "#a78bfa",
    soft: "#8b5cf6",
    glow: "rgba(167, 139, 250, 0.22)",
  },
} as const;

export type CurveTone = keyof typeof TONES;

/** Declarative tooltip formatting: functions cannot cross the server→client boundary. */
export type CurveValueFormat = "plain" | "ghs-pesewas" | "usd-micros";

/**
 * Catmull-Rom through the points, expressed as cubic Béziers. A straight
 * polyline reads as a spreadsheet; this reads as a trend without inventing
 * values between the samples.
 */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

export function CurveChart({
  points,
  tone = "gold",
  height = 190,
  valueSuffix = "",
  valueFormat = "plain",
  ariaLabel,
  empty,
  className,
}: {
  points: CurvePoint[];
  tone?: CurveTone;
  height?: number;
  valueSuffix?: string;
  valueFormat?: CurveValueFormat;
  ariaLabel: string;
  empty?: ReactNode;
  className?: string;
}) {
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gradientId = `curve-fill-${rawId}`;
  const [active, setActive] = useState<number | null>(null);

  const width = 640;
  const padX = 14;
  const padY = 22;

  const model = useMemo(() => {
    if (points.length < 2) return null;
    const values = points.map((p) => p.value);
    const max = Math.max(...values);
    const min = Math.min(...values, 0);
    const span = max - min || 1;
    const step = (width - padX * 2) / (points.length - 1);
    const coords = points.map((point, i) => ({
      x: padX + i * step,
      y: height - padY - ((point.value - min) / span) * (height - padY * 2),
    }));
    const line = smoothPath(coords);
    const area = `${line} L ${coords[coords.length - 1].x.toFixed(2)} ${height - padY} L ${coords[0].x.toFixed(2)} ${height - padY} Z`;
    return { coords, line, area, max, min };
  }, [points, height]);

  if (!model) {
    return (
      <div
        className={cn(
          "flex min-h-[140px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 px-6 py-8 text-center",
          className
        )}
      >
        {empty ?? (
          <p className="text-sm text-white/35">Not enough data for a curve yet.</p>
        )}
      </div>
    );
  }

  const colors = TONES[tone];
  const activePoint = active === null ? null : points[active];
  const activeCoord = active === null ? null : model.coords[active];

  function formatCurveValue(value: number): string {
    if (valueFormat === "ghs-pesewas") return formatGhs(value);
    if (valueFormat === "usd-micros") return formatUsdMicros(value);
    return `${value.toLocaleString("en-GH")}${valueSuffix}`;
  }

  function onPointerMove(event: PointerEvent<SVGRectElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0) return;
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
    const index = Math.round(ratio * (points.length - 1));
    setActive(index);
  }

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label={ariaLabel}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.line} stopOpacity="0.32" />
            <stop offset="100%" stopColor={colors.line} stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((fraction) => (
          <line
            key={fraction}
            x1={padX}
            x2={width - padX}
            y1={padY + (height - padY * 2) * fraction}
            y2={padY + (height - padY * 2) * fraction}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="3 6"
            vectorEffect="non-scaling-stroke"
          />
        ))}

        <path d={model.area} fill={`url(#${gradientId})`} />
        <path
          d={model.line}
          fill="none"
          stroke={colors.line}
          strokeWidth="2.4"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />

        {activeCoord && (
          <>
            <line
              x1={activeCoord.x}
              x2={activeCoord.x}
              y1={padY - 6}
              y2={height - padY}
              stroke="rgba(255,255,255,0.18)"
              strokeDasharray="3 4"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={activeCoord.x}
              cy={activeCoord.y}
              r="7"
              fill={colors.glow}
              className="blur-[2px]"
            />
            <circle
              cx={activeCoord.x}
              cy={activeCoord.y}
              r="3.6"
              fill="#0a0d1c"
              stroke={colors.line}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}

        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          fill="transparent"
          onPointerMove={onPointerMove}
          onPointerLeave={() => setActive(null)}
        />
      </svg>

      {activePoint && activeCoord && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[130%] whitespace-nowrap rounded-lg border border-white/10 bg-[#0b0e1c]/95 px-3 py-1.5 text-xs shadow-xl backdrop-blur"
          style={{
            left: `${(activeCoord.x / width) * 100}%`,
            top: `${(activeCoord.y / height) * 100}%`,
          }}
        >
          <span className="text-white/45">{activePoint.label}</span>
          <span className="ml-2 font-semibold text-white">
            {formatCurveValue(activePoint.value)}
          </span>
        </div>
      )}

      <div className="mt-1 flex justify-between px-1 text-[11px] uppercase tracking-wider text-white/45">
        <span>{points[0].label}</span>
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  );
}
