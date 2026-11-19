"use client";

import { useLinkStatus } from "next/link";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * An icon that knows when its parent <Link> is fetching. While the route
 * resolves the glyph recedes and a gold spinner takes its place, so the
 * exact menu item that was pressed is the one that shows the wait.
 */
export function LinkPendingIcon({
  children,
  className,
  active = false,
  activeClassName,
  spinnerClassName = "text-amber-300",
}: {
  children: React.ReactNode;
  className?: string;
  active?: boolean;
  activeClassName?: string;
  spinnerClassName?: string;
}) {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        className,
        active && activeClassName
      )}
    >
      <span
        className={cn(
          "inline-flex h-full w-full items-center justify-center transition-[opacity,transform] duration-200",
          pending && "scale-75 opacity-0"
        )}
      >
        {children}
      </span>
      <LoaderCircle
        className={cn(
          "absolute inset-0 h-full w-full transition-opacity duration-150",
          spinnerClassName,
          pending ? "animate-spin opacity-100" : "opacity-0"
        )}
        strokeWidth={2.3}
      />
    </span>
  );
}
