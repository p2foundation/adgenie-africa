import { cn } from "@/lib/utils";

export interface BarPoint {
  label: string;
  value: number;
}

/**
 * Fourteen thin bars, no library. Values are shown on hover via the native
 * title so the component stays a server component with zero JavaScript.
 */
export function FlowBars({
  points,
  tone = "gold",
  className,
  ariaLabel,
}: {
  points: BarPoint[];
  tone?: "gold" | "violet";
  className?: string;
  ariaLabel: string;
}) {
  const max = Math.max(...points.map((point) => point.value), 1);
  const total = points.reduce((sum, point) => sum + point.value, 0);

  if (total === 0) {
    return (
      <div
        className={cn(
          "flex min-h-[140px] flex-col items-center justify-center rounded-xl border border-dashed border-white/10 px-6 py-8 text-center",
          className
        )}
      >
        <p className="text-sm text-white/35">Nothing spent in this window.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        className="flex h-[150px] items-end gap-1.5"
        role="img"
        aria-label={ariaLabel}
      >
        {points.map((point, index) => {
          const height = Math.max((point.value / max) * 100, point.value > 0 ? 4 : 1);
          const isRecent = index >= points.length - 3;
          return (
            <div
              key={point.label}
              className="group relative flex h-full flex-1 items-end"
              title={`${point.label}: ${point.value.toLocaleString("en-GH")}`}
            >
              <span
                className={cn(
                  "w-full rounded-t-[3px] transition-all duration-300",
                  point.value === 0
                    ? "bg-white/5"
                    : isRecent
                      ? tone === "gold"
                        ? "bg-gradient-to-t from-amber-500/40 to-amber-300"
                        : "bg-gradient-to-t from-violet-500/40 to-violet-300"
                      : tone === "gold"
                        ? "bg-gradient-to-t from-amber-500/15 to-amber-400/45"
                        : "bg-gradient-to-t from-violet-500/15 to-violet-400/45",
                  "group-hover:brightness-125"
                )}
                style={{ height: `${height}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-wider text-white/25">
        <span>{points[0].label}</span>
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  );
}
