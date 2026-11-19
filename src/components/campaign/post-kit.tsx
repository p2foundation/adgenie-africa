"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  Download,
  Loader2,
  MessageCircle,
  Share2,
  Smartphone,
} from "lucide-react";
import { apiBlob } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface PostKitFile {
  generationId: string;
  index: number;
  label: string;
  width: number;
  height: number;
}

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function fileName(file: PostKitFile, type: string): string {
  const base =
    file.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "creative";
  return `adgenie-${base}-${file.width}x${file.height}.${EXT[type] ?? "png"}`;
}

export function PostKit({
  files,
  caption,
  className,
}: {
  files: PostKitFile[];
  caption: string;
  className?: string;
}) {
  const [busy, setBusy] = useState<"share" | "save" | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const cachedRef = useRef<File[] | null>(null);

  // The share sheet needs File objects, and Safari drops the tap gesture if it
  // waits for a download. Phones warm the cache as soon as the kit appears.
  const touch =
    typeof navigator !== "undefined" && (navigator.maxTouchPoints ?? 0) > 0;
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  const loadFiles = async (): Promise<File[]> => {
    const loaded: File[] = [];
    for (const file of files) {
      const blob = await apiBlob(
        `/outputs/${file.generationId}?index=${file.index}&download=1`
      );
      if (!blob) continue;
      const type = blob.type || "image/jpeg";
      loaded.push(new File([blob], fileName(file, type), { type }));
    }
    return loaded;
  };

  useEffect(() => {
    if (!touch || !canShare || cachedRef.current) return;
    let live = true;
    void loadFiles().then((loaded) => {
      if (live && loaded.length > 0) cachedRef.current = loaded;
    });
    return () => {
      live = false;
    };
    // Files only change when the run redraws them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [touch, canShare]);

  async function share() {
    setBusy("share");
    setNote(null);
    // Instagram ignores text passed through the sheet, so the caption rides on
    // the clipboard instead. Copying here keeps it inside the tap gesture.
    void navigator.clipboard?.writeText(caption).catch(() => {});
    try {
      let loaded = cachedRef.current;
      if (!loaded) {
        loaded = await loadFiles();
        if (loaded.length > 0) cachedRef.current = loaded;
      }
      if (loaded.length === 0) {
        setNote("Those files are no longer available. Run the campaign again.");
        return;
      }
      const data: ShareData = { files: loaded, text: caption };
      if (!navigator.canShare?.(data)) {
        setNote("This browser cannot share files. Use Save all, then post in the app.");
        return;
      }
      await navigator.share(data);
      setNote("Caption is on your clipboard — paste it when the app asks.");
    } catch (err) {
      // Backing out of the sheet is not an error.
      if (err instanceof DOMException && err.name === "AbortError") return;
      setNote("The share sheet did not open. Use Save all instead.");
    } finally {
      setBusy(null);
    }
  }

  async function saveAll() {
    setBusy("save");
    setNote(null);
    let saved = 0;
    for (const file of files) {
      const blob = await apiBlob(
        `/outputs/${file.generationId}?index=${file.index}&download=1`
      );
      const type = blob?.type || "image/jpeg";
      if (!blob) continue;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName(file, type);
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      saved++;
    }
    setNote(
      saved === 0
        ? "Those files are no longer available."
        : `${saved} file${saved === 1 ? "" : "s"} saved to your downloads.`
    );
    setBusy(null);
  }

  async function copyCaption() {
    await navigator.clipboard.writeText(caption);
    setCopied(true);
    setNote("Caption copied.");
    window.setTimeout(() => setCopied(false), 1800);
  }

  function shareWhatsApp() {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(caption)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-amber-400/20 bg-gradient-to-br from-amber-500/[0.06] via-transparent to-transparent p-4",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Share2 className="h-4 w-4 text-amber-300" />
          <h3 className="font-display text-sm font-semibold text-white">Post kit</h3>
        </div>
        <span className="text-[10px] uppercase tracking-widest text-white/30">
          {files.length} file{files.length === 1 ? "" : "s"} · caption ready
        </span>
      </div>

      <p className="mt-1.5 text-[11px] leading-relaxed text-white/45">
        One tap opens your phone&apos;s share sheet — then pick Instagram, WhatsApp
        Status, TikTok or Facebook. No password, no business account needed.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {canShare && (
          <button
            type="button"
            onClick={() => void share()}
            disabled={busy !== null}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/15 px-4 py-2.5 text-sm font-semibold text-amber-100 transition-colors hover:border-amber-400/50 hover:bg-amber-500/25 disabled:opacity-50 touch-target"
          >
            {busy === "share" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
            {busy === "share" ? "Preparing…" : "Share to my apps"}
          </button>
        )}
        <button
          type="button"
          onClick={() => void saveAll()}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/12 px-3 py-2.5 text-xs font-medium text-white/60 transition-colors hover:border-white/25 hover:text-white/85 disabled:opacity-50 touch-target"
        >
          {busy === "save" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          {busy === "save" ? "Saving…" : "Save all"}
        </button>
        <button
          type="button"
          onClick={() => void copyCaption()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-white/12 px-3 py-2.5 text-xs font-medium text-white/60 transition-colors hover:border-white/25 hover:text-white/85 touch-target"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy caption"}
        </button>
        <button
          type="button"
          onClick={shareWhatsApp}
          className="inline-flex items-center gap-1.5 rounded-xl border border-teal-400/25 bg-teal-500/10 px-3 py-2.5 text-xs font-medium text-teal-200 transition-colors hover:border-teal-400/45 touch-target"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          WhatsApp
        </button>
      </div>

      {note && (
        <p className="mt-2.5 text-[11px] leading-relaxed text-teal-200/70">{note}</p>
      )}

      {!canShare && (
        <p className="mt-2.5 inline-flex items-start gap-1.5 text-[11px] leading-relaxed text-white/35">
          <Smartphone className="mt-0.5 h-3 w-3 shrink-0" />
          This browser cannot open a share sheet. Save the files here, or open this
          campaign on your phone and use Share to my apps.
        </p>
      )}

      <ol className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-white/5 pt-3 text-[10px] text-white/30">
        <li>1 · Share to my apps</li>
        <li>2 · Pick the app</li>
        <li>3 · Paste the caption</li>
      </ol>
    </div>
  );
}
