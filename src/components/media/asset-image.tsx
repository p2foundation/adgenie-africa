"use client";

import { useEffect, useState } from "react";
import { apiBlobCached } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * An owner's uploaded photo, fetched through the authenticated byte route.
 * Same reason as PrivateImage: a plain `<img src>` to the API origin carries no
 * session cookie in production.
 */
export function AssetImage({
  assetId,
  alt,
  className,
  width = 320,
}: {
  assetId: string;
  alt: string;
  className?: string;
  width?: number;
}) {
  // Keyed by id so a new photo never shows the previous photo's blob while its
  // own bytes are still loading.
  const [loaded, setLoaded] = useState<{ id: string; url: string } | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let objectUrl: string | null = null;

    apiBlobCached(`/assets/${assetId}?w=${width}`)
      .then((blob) => {
        if (!alive) return;
        if (!blob) {
          setFailedId(assetId);
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setLoaded({ id: assetId, url: objectUrl });
      })
      .catch(() => {
        if (alive) setFailedId(assetId);
      });

    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetId, width]);

  const url = loaded?.id === assetId ? loaded.url : null;
  const failed = failedId === assetId;

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- blob URL from a private route
      <img src={url} alt={alt} className={className} loading="lazy" />
    );
  }

  return (
    <span
      aria-label={alt}
      role="img"
      className={cn(
        "flex items-center justify-center bg-white/[0.03] text-[10px] text-white/30",
        className
      )}
    >
      {failed ? "Unavailable" : <span className="h-4 w-4 animate-pulse rounded-full bg-white/10" />}
    </span>
  );
}
