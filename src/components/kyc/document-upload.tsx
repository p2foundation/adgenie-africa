"use client";

import { useEffect, useRef, useState } from "react";
import { KYC_DOCUMENT_LABELS, KYC_MAX_DOCUMENT_BYTES, type KycDocumentKind } from "@adgenie/core";
import { Check, FileText, Loader2, RefreshCw, ShieldCheck, UploadCloud } from "lucide-react";
import { ApiError, apiBlob, apiUpload, type KycDocumentMeta, type KycView } from "@/lib/api";
import { cn } from "@/lib/utils";

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Evidence is fetched as a blob and shown through a same-origin object URL: an
 * `<img src>` pointed at the API is a cross-site subresource, and the browser
 * would not attach the session cookie to it.
 */
function usePreview(kind: KycDocumentKind | null, revision: number): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!kind) return;
    let objectUrl: string | null = null;
    let live = true;

    void apiBlob(`/kyc/documents/${kind}`).then((blob) => {
      if (!live || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });

    return () => {
      live = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
  }, [kind, revision]);

  return url;
}

export function DocumentUpload({
  kind,
  document,
  disabled,
  onSaved,
}: {
  kind: KycDocumentKind;
  document: KycDocumentMeta | null;
  disabled: boolean;
  onSaved: (view: KycView) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = usePreview(document ? kind : null, document?.revision ?? 0);
  const isImage = document ? document.contentType.startsWith("image/") : false;

  async function send(file: File) {
    setError(null);
    if (file.size > KYC_MAX_DOCUMENT_BYTES) {
      setError(`${formatBytes(file.size)} is too big. A phone photo at normal quality is plenty.`);
      return;
    }
    setPending(true);
    try {
      onSaved(await apiUpload<KycView>(`/kyc/documents/${kind}`, file));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The upload failed. Try again.");
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white/85">{KYC_DOCUMENT_LABELS[kind]}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-white/35">
            JPG, PNG, WEBP or PDF · up to 5 MB · everything readable in one shot
          </p>
        </div>
        {document ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-teal-400/25 bg-teal-500/10 px-2.5 py-1 text-[11px] font-medium text-teal-200">
            <Check className="h-3 w-3" strokeWidth={3} />
            Uploaded{document.revision > 1 ? ` · v${document.revision}` : ""}
          </span>
        ) : null}
      </div>

      {document ? (
        <div className="mt-4 flex items-center gap-4">
          {isImage && preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- a same-origin blob URL is not an optimisable image
            <img
              src={preview}
              alt={`Uploaded ${kind === "identity_document" ? "Ghana Card" : "business document"}`}
              className="h-20 w-28 shrink-0 rounded-xl border border-white/10 bg-black/40 object-cover"
            />
          ) : (
            <span className="flex h-20 w-28 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/40">
              <FileText className="h-7 w-7" />
            </span>
          )}
          <div className="min-w-0 text-[11px] leading-relaxed text-white/45">
            <p className="truncate">
              {document.contentType} · {formatBytes(document.bytes)}
            </p>
            <p className="mt-1">
              Only you and one reviewer can see this. It is not shared with any model.
            </p>
            {preview && !isImage ? (
              <a
                href={preview}
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 inline-block font-medium text-amber-300 hover:text-amber-200"
              >
                Open the PDF
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      {!disabled ? (
        <div
          className={cn(
            "mt-4 rounded-xl border border-dashed px-4 py-5 text-center transition-colors",
            dragging ? "border-amber-400/60 bg-amber-500/[0.08]" : "border-white/12 bg-white/[0.02]"
          )}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files?.[0];
            if (file) void send(file);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void send(file);
            }}
          />
          <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300">
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : document ? (
              <RefreshCw className="h-4 w-4" />
            ) : (
              <UploadCloud className="h-4 w-4" />
            )}
          </span>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={pending}
            className="mt-3 inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-white/80 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40 touch-target"
          >
            {pending
              ? "Uploading…"
              : document
                ? "Replace with a new photo"
                : kind === "identity_document"
                  ? "Take or choose a photo of your card"
                  : "Choose your registration document"}
          </button>
          <p className="mt-1 text-[11px] text-white/30">
            {document
              ? "A replacement overwrites the old copy — nothing is kept twice."
              : "Or drag the file here"}
          </p>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-[11px] text-rose-300/80">{error}</p> : null}
      {!disabled && !error ? (
        <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed text-white/30">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-300/70" />
          We check the file is really a photo or a PDF before we store it, and we store it
          privately — never on a public link.
        </p>
      ) : null}
    </div>
  );
}
