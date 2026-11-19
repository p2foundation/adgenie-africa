"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, Plus, ShieldCheck, Trash2 } from "lucide-react";
import {
  PHOTO_ID_PATTERN,
  PHOTO_KIND_HINTS,
  PHOTO_KIND_LABELS,
  PHOTO_KINDS,
  PHOTO_LIMIT,
  PHOTO_MAX_BYTES,
  type PhotoKind,
} from "@adgenie/core";
import { ApiError, api, apiUpload, type AssetList, type AssetSummary } from "@/lib/api";
import { fieldClass } from "@/components/auth/fields";
import { AssetImage } from "@/components/media/asset-image";
import { cn } from "@/lib/utils";

/**
 * Optional reference photos for one campaign. A photo is a reference, not a
 * template: the model keeps the product, logo, person or room recognisable, and
 * the renderer still draws every word. A person photo cannot be uploaded without
 * the consent tick (the API and the table's check constraint refuse it anyway).
 */
export function PhotoPicker({
  selected,
  onChange,
  max = PHOTO_LIMIT,
  revision = 0,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
  max?: number;
  revision?: number;
}) {
  const [items, setItems] = useState<AssetSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<PhotoKind>("product");
  const [consent, setConsent] = useState(false);
  const [personLabel, setPersonLabel] = useState("");
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    api<AssetList>("/assets")
      .then((list) => {
        if (alive) setItems(list.items);
      })
      .catch(() => {
        if (alive) setError("Could not load your photos. You can still upload a new one.");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [revision]);

  function toggle(id: string) {
    if (selected.includes(id)) {
      setError(null);
      onChange(selected.filter((value) => value !== id));
      return;
    }
    if (selected.length >= max) {
      setError(`The agent can look at ${max} photos. Remove one first.`);
      return;
    }
    setError(null);
    onChange([...selected, id]);
  }

  function startUpload() {
    if (kind === "person" && !consent) {
      setError("Tick the consent box before uploading a photo of a person.");
      return;
    }
    setError(null);
    inputRef.current?.click();
  }

  async function upload(file: File) {
    if (file.size > PHOTO_MAX_BYTES) {
      setError("That photo is over 5 MB. A normal phone photo is plenty.");
      return;
    }

    const params = new URLSearchParams({ kind });
    if (kind === "person") {
      params.set("consent", "1");
      const label = personLabel.trim();
      if (label) params.set("person_label", label);
    }

    setUploading(true);
    setError(null);
    try {
      const asset = await apiUpload<AssetSummary>(`/assets?${params.toString()}`, file);
      setItems((current) => [asset, ...current]);
      if (selected.length < max) onChange([...selected, asset.id]);
      if (kind === "person") {
        setConsent(false);
        setPersonLabel("");
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "That upload did not go through. Check your connection and try again."
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(id: string) {
    setDeleting(id);
    setError(null);
    try {
      await api(`/assets/${id}`, { method: "DELETE" });
      setItems((current) => current.filter((item) => item.id !== id));
      if (selected.includes(id)) onChange(selected.filter((value) => value !== id));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not delete that photo. Try again."
      );
    } finally {
      setDeleting(null);
    }
  }

  const usable = selected.filter((id) => PHOTO_ID_PATTERN.test(id));

  return (
    <section className="rounded-2xl border border-white/8 bg-[linear-gradient(150deg,rgba(255,255,255,0.045),rgba(255,255,255,0.01))] p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-white/35">
            <Camera className="h-3.5 w-3.5 text-amber-300/80" />
            Photos for the agent
            <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] font-medium normal-case tracking-normal text-white/30">
              optional
            </span>
          </p>
          <p className="mt-2 max-w-md text-xs leading-relaxed text-white/45">
            Show the model what to keep: your product, logo, a person with
            permission, or the venue. Every price, phone and CTA is still drawn
            by code.
          </p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold tabular-nums",
            usable.length > 0
              ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
              : "border-white/10 text-white/35"
          )}
        >
          {usable.length}/{max} in this campaign
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {PHOTO_KINDS.map((option) => {
          const active = kind === option;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setKind(option);
                setError(null);
              }}
              className={cn(
                "inline-flex min-h-[44px] items-center justify-center rounded-full border px-4 py-1.5 text-xs font-medium transition-all",
                active
                  ? "border-amber-400/50 bg-amber-500/10 text-amber-200"
                  : "border-white/10 text-white/45 hover:border-white/20 hover:text-white/75"
              )}
            >
              {PHOTO_KIND_LABELS[option]}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-white/30">
        {PHOTO_KIND_HINTS[kind]}
      </p>

      {kind === "person" && (
        <div className="mt-3 space-y-2.5 rounded-xl border border-amber-400/20 bg-amber-500/[0.06] p-3">
          <label className="flex min-h-[44px] cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-amber-100/80">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-amber-400"
            />
            <span>
              This is me, or someone who agreed to appear in my ads. I can show
              that consent if asked.
            </span>
          </label>
          <input
            value={personLabel}
            onChange={(event) => setPersonLabel(event.target.value)}
            placeholder="Who is it? (optional)"
            maxLength={60}
            className={cn(fieldClass, "py-2 text-xs")}
          />
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
          else if (inputRef.current) inputRef.current.value = "";
        }}
      />

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-xs text-white/30">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading your photos…
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-2.5">
          {items.map((item) => {
            const active = selected.includes(item.id);
            const label = PHOTO_KIND_LABELS[item.kind];
            return (
              <div
                key={item.id}
                className={cn(
                  "group relative aspect-square overflow-hidden rounded-xl border transition-all",
                  active
                    ? "border-amber-400/60 shadow-[0_0_0_3px_rgba(251,191,36,0.15)]"
                    : "border-white/8 hover:border-white/20"
                )}
              >
                <button
                  type="button"
                  aria-pressed={active}
                  aria-label={`${active ? "Stop using" : "Use"} this ${label.toLowerCase()} photo`}
                  onClick={() => toggle(item.id)}
                  className="absolute inset-0 block h-full w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
                >
                  <AssetImage
                    assetId={item.id}
                    alt={item.personLabel ?? `${label} photo`}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2 pb-1.5 pt-4 text-[9px] font-semibold uppercase tracking-wider text-white/80">
                    {label}
                  </span>
                  {active && (
                    <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-black">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  aria-label={`Delete this ${label.toLowerCase()} photo`}
                  disabled={deleting === item.id}
                  onClick={() => void remove(item.id)}
                  className="absolute left-1 top-1 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white/60 backdrop-blur transition-all before:absolute before:-inset-1 before:content-[''] hover:border-rose-400/40 hover:text-rose-300 focus-visible:opacity-100 disabled:opacity-40 sm:pointer-events-none sm:opacity-0 sm:group-hover:pointer-events-auto sm:group-hover:opacity-100"
                >
                  {deleting === item.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            );
          })}

          <button
            type="button"
            onClick={startUpload}
            disabled={uploading}
            className={cn(
              "flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] text-white/35 transition-all hover:border-amber-400/40 hover:bg-amber-500/[0.04] hover:text-amber-200/80 disabled:cursor-wait",
              items.length === 0 && "col-span-3 aspect-[3/1]"
            )}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-amber-300" />
            ) : (
              <Plus className="h-5 w-5" />
            )}
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              {uploading ? "Uploading…" : `Add ${PHOTO_KIND_LABELS[kind].toLowerCase()}`}
            </span>
          </button>
        </div>
      )}

      <p className="mt-3 flex items-start gap-2 text-[10px] leading-relaxed text-white/25">
        <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-teal-300/60" />
        Photos stay private to your account and are never used to clone a face or
        train a public model. JPG, PNG or WEBP up to 5 MB.
      </p>

      {error && <p className="mt-2 text-xs leading-relaxed text-rose-300">{error}</p>}
    </section>
  );
}
