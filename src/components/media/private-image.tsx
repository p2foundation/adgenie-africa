"use client";

import { useEffect, useState } from "react";
import { apiBlobCached } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Files are private: an <img src> would not carry the session cookie across
 * origins, so the bytes are fetched with credentials and shown from a blob URL.
 * `width` asks the API for a downscaled JPEG instead of a full 1080px PNG.
 */
export function PrivateImage({
  generationId,
  index = 0,
  width = 480,
  alt,
  className,
}: {
  generationId: string;
  index?: number;
  width?: number;
  alt: string;
  className?: string;
}) {
  const requestKey = `${generationId}:${index}:${width}`;
  // Keyed by request so a different file never flashes the previous blob while
  // its own bytes are loading.
  const [loaded, setLoaded] = useState<{ key: string; url: string } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let objectUrl: string | null = null;

    apiBlobCached(`/outputs/${generationId}?index=${index}&w=${width}`)
      .then((blob) => {
        if (!alive) return;
        if (!blob) {
          setFailedKey(requestKey);
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setLoaded({ key: requestKey, url: objectUrl });
      })
      .catch(() => {
        if (alive) setFailedKey(requestKey);
      });

    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [generationId, index, width, requestKey]);

  const url = loaded?.key === requestKey ? loaded.url : null;
  const failed = failedKey === requestKey;

  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- blob URL from a private route
    return <img src={url} alt={alt} className={className} loading="lazy" />;
  }

  return (
    <span
      aria-label={alt}
      role="img"
      className={cn(
        "flex items-center justify-center bg-[radial-gradient(circle_at_35%_25%,rgba(251,191,36,0.1),transparent_60%),linear-gradient(160deg,#15102a,#070a14)]",
        failed && "text-[10px] text-white/30",
        className
      )}
    >
      {failed ? "Unavailable" : <span className="h-4 w-4 animate-pulse rounded-full bg-white/10" />}
    </span>
  );
}
