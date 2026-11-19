import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type ParamValue = string | number | null | undefined;

export interface PagerProps {
  page: number;
  pages: number;
  total?: number;
  /** Plural noun for the count, e.g. "payments". */
  label?: string;
  basePath: string;
  pageParam?: string;
  /** Filters already in the URL; the pager keeps them on every link. */
  params?: Record<string, ParamValue>;
  /** Section anchor to return to, without the "#". */
  hash?: string;
  className?: string;
}

function pageHref(
  target: number,
  basePath: string,
  pageParam: string,
  params: Record<string, ParamValue>,
  hash?: string
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === pageParam || value === null || value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  if (target > 1) search.set(pageParam, String(target));
  const query = search.toString();
  return `${basePath}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
}

/** First, last and the pages around the current one, with gaps elided. */
function pageWindow(page: number, pages: number): (number | "gap")[] {
  const wanted = new Set(
    [1, pages, page - 1, page, page + 1].filter((n) => n >= 1 && n <= pages)
  );
  const sorted = [...wanted].sort((a, b) => a - b);
  const window: (number | "gap")[] = [];
  let previous = 0;
  for (const n of sorted) {
    if (previous && n - previous > 1) window.push("gap");
    window.push(n);
    previous = n;
  }
  return window;
}

export function Pager({
  page,
  pages,
  total,
  label,
  basePath,
  pageParam = "page",
  params = {},
  hash,
  className,
}: PagerProps) {
  if (pages <= 1) return null;

  const href = (target: number) =>
    pageHref(target, basePath, pageParam, params, hash);
  const previous = Math.max(1, page - 1);
  const next = Math.min(pages, page + 1);

  return (
    <nav
      aria-label={label ? `Pages of ${label}` : "Pagination"}
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-t border-white/6 px-4 py-3",
        className
      )}
    >
      <p className="text-[11px] tabular-nums text-white/30">
        Page {page} of {pages}
        {total !== undefined && (
          <>
            <span className="mx-1.5 text-white/15">·</span>
            {total.toLocaleString("en-GH")} {label ?? "entries"}
          </>
        )}
      </p>

      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link
            href={href(previous)}
            rel="prev"
            aria-label="Previous page"
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/8 px-2.5 text-[11px] font-medium text-white/50 transition-colors hover:border-amber-400/25 hover:text-amber-200 touch-target"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Prev</span>
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="inline-flex h-8 cursor-not-allowed items-center gap-1 rounded-lg border border-white/5 px-2.5 text-[11px] font-medium text-white/15"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Prev</span>
          </span>
        )}

        <div className="hidden items-center gap-1 sm:flex">
          {pageWindow(page, pages).map((item, index) =>
            item === "gap" ? (
              <span
                key={`gap-${index}`}
                aria-hidden="true"
                className="px-1 text-[11px] text-white/20"
              >
                …
              </span>
            ) : item === page ? (
              <span
                key={item}
                aria-current="page"
                className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-500/10 px-2 text-[11px] font-semibold tabular-nums text-amber-200"
              >
                {item}
              </span>
            ) : (
              <Link
                key={item}
                href={href(item)}
                aria-label={`Page ${item}`}
                className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-white/8 px-2 text-[11px] font-medium tabular-nums text-white/45 transition-colors hover:border-white/20 hover:text-white/80"
              >
                {item}
              </Link>
            )
          )}
        </div>

        {page < pages ? (
          <Link
            href={href(next)}
            rel="next"
            aria-label="Next page"
            className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/8 px-2.5 text-[11px] font-medium text-white/50 transition-colors hover:border-amber-400/25 hover:text-amber-200 touch-target"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="inline-flex h-8 cursor-not-allowed items-center gap-1 rounded-lg border border-white/5 px-2.5 text-[11px] font-medium text-white/15"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </nav>
  );
}
