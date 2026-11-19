"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, FileText, Loader2, ShieldX } from "lucide-react";
import type { KycStatus } from "@adgenie/core";
import { ApiError, api, apiBlob, type KycDocumentMeta } from "@/lib/api";
import { fieldClass, labelClass } from "@/components/auth/fields";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Evidence is served by the API to staff sessions only, so the bytes have to be
 * fetched with the cookie and shown from an object URL — a plain <img src> would
 * not carry the session in production, where web and API are different sites.
 */
export function DocumentPreview({
  userId,
  document,
}: {
  userId: string;
  document: KycDocumentMeta & { sha256: string };
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [opening, setOpening] = useState(false);

  const open = async () => {
    setOpening(true);
    const blob = await apiBlob(`/admin/kyc/${userId}/documents/${document.kind}`);
    if (blob) window.open(URL.createObjectURL(blob), "_blank", "noopener");
    else setFailed(true);
    setOpening(false);
  };

  useEffect(() => {
    let revoke: string | null = null;
    let live = true;
    if (!document.contentType.startsWith("image/")) return;
    void (async () => {
      const blob = await apiBlob(`/admin/kyc/${userId}/documents/${document.kind}`);
      if (!blob) {
        if (live) setFailed(true);
        return;
      }
      revoke = URL.createObjectURL(blob);
      if (live) setUrl(revoke);
    })();
    return () => {
      live = false;
      if (revoke) URL.revokeObjectURL(revoke);
    };
  }, [userId, document.kind, document.contentType, document.revision]);

  const isImage = document.contentType.startsWith("image/");

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-white/70">
          {document.kind === "identity_document" ? "Ghana Card" : "Business document"}
        </p>
        <p className="text-[10px] uppercase tracking-wider text-white/30">
          v{document.revision} · {formatBytes(document.bytes)}
        </p>
      </div>

      {isImage ? (
        url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={url}
            alt={`${document.kind === "identity_document" ? "Ghana Card" : "Business document"} uploaded by the creator`}
            className="mt-3 max-h-72 w-full rounded-xl border border-white/8 object-contain"
          />
        ) : (
          <div className="mt-3 flex h-40 items-center justify-center rounded-xl border border-white/8 bg-white/[0.02] text-[11px] text-white/30">
            {failed ? "The file would not load. Reload this page." : "Loading the file…"}
          </div>
        )
      ) : (
        <button
          type="button"
          onClick={() => void open()}
          disabled={opening}
          className="mt-3 inline-flex min-h-[44px] items-center gap-2 px-1 text-xs text-amber-300/80 hover:text-amber-200 disabled:opacity-50"
        >
          <FileText className="h-3.5 w-3.5" />
          {opening ? "Opening…" : "Open the document in a new tab"}
        </button>
      )}

      <p className="mt-2 break-all font-mono text-[10px] text-white/25">
        sha256 {document.sha256.slice(0, 16)}
      </p>
    </div>
  );
}

export function DecisionForm({
  userId,
  status,
  canDecide,
}: {
  userId: string;
  status: KycStatus;
  canDecide: boolean;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<"verified" | "rejected" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = async (decision: "verified" | "rejected") => {
    setBusy(decision);
    setError(null);
    try {
      await api(`/admin/kyc/${userId}/review`, {
        method: "POST",
        body: { decision, ...(decision === "rejected" ? { reason: reason.trim() } : {}) },
      });
      setReason("");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "The decision did not reach us. Nothing was recorded — try again."
      );
    } finally {
      setBusy(null);
    }
  };

  if (status !== "under_review") {
    return (
      <p className="text-[11px] leading-relaxed text-white/35">
        {status === "verified"
          ? "This account is verified. A verified record is closed; changes go through support."
          : "This submission has already been decided."}
      </p>
    );
  }

  if (!canDecide) {
    return (
      <p className="text-[11px] leading-relaxed text-white/35">
        You can read this file, but only an admin can decide it.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => void decide("verified")}
        disabled={busy !== null}
        className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-40 touch-target"
      >
        {busy === "verified" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" strokeWidth={3} />}
        Verify this person
      </button>

      <div>
        <label htmlFor="kyc-reject-reason" className={labelClass}>
          Why it goes back
        </label>
        <textarea
          id="kyc-reject-reason"
          value={reason}
          maxLength={400}
          rows={3}
          placeholder="The card photo is unreadable. Re-upload the photo side in good light."
          onChange={(event) => setReason(event.target.value)}
          className={cn(fieldClass, "mt-1 resize-y")}
        />
        <p className="mt-1 text-[10px] text-white/30">
          The creator sees this wording exactly, so name the fix.
        </p>
      </div>

      <button
        type="button"
        onClick={() => void decide("rejected")}
        disabled={busy !== null || reason.trim().length < 10}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-rose-400/25 bg-rose-500/[0.08] px-4 py-3 text-sm font-semibold text-rose-200 transition-colors hover:bg-rose-500/[0.14] disabled:cursor-not-allowed disabled:opacity-40 touch-target"
      >
        {busy === "rejected" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldX className="h-4 w-4" />}
        Send it back
      </button>

      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
    </div>
  );
}
