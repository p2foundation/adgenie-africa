"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Link2, Loader2, Sparkles } from "lucide-react";
import { ApiError, api, type ImportedPage } from "@/lib/api";
import { fieldClass, labelClass } from "@/components/auth/fields";
import { cn } from "@/lib/utils";

type Mode = "company" | "product";

export function UrlImport({
  value,
  onChange,
  defaultMode,
  availableSlots,
  onApply,
  onBusyChange,
}: {
  value: string;
  onChange: (value: string) => void;
  defaultMode: Mode;
  availableSlots: number;
  onApply: (page: ImportedPage, assetIds: string[]) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const t = useTranslations("campaign.import");
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [page, setPage] = useState<ImportedPage | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saved, setSaved] = useState<Map<string, string>>(new Map());
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState<"read" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const requestRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    onBusyChange(busy !== null);
  }, [busy, onBusyChange]);

  useEffect(
    () => () => {
      requestRef.current += 1;
      abortRef.current?.abort();
      onBusyChange(false);
    },
    [onBusyChange]
  );

  const chosen = page
    ? page.images
        .filter((image) => selected.has(image.url))
        .slice(0, availableSlots)
    : [];
  const chosenCount = chosen.length;

  function invalidate() {
    requestRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setPage(null);
    setSelected(new Set());
    setSaved(new Map());
    setRights(false);
    setError(null);
    setMessage(null);
    setBusy(null);
  }

  async function readPage() {
    const url = value.trim();
    if (!url) {
      setError(t("empty"));
      return;
    }
    invalidate();
    const id = ++requestRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy("read");
    try {
      const result = await api<ImportedPage>("/campaigns/import-url", {
        method: "POST",
        body: { url, mode },
        signal: controller.signal,
      });
      if (id !== requestRef.current) return;
      if (result.sourceUrl.length <= 500) onChange(result.sourceUrl);
      setPage(result);
      setSelected(
        new Set(result.images.slice(0, availableSlots).map((image) => image.url))
      );
      if (result.images.length === 0) setMessage(t("noImages"));
    } catch (err) {
      if (id !== requestRef.current) return;
      setError(err instanceof ApiError ? err.message : t("readFailed"));
    } finally {
      if (id === requestRef.current) {
        setBusy(null);
        abortRef.current = null;
      }
    }
  }

  async function apply() {
    if (!page || busy) return;
    if (chosen.length > 0 && !rights) {
      setError(t("rightsRequired"));
      return;
    }
    const id = ++requestRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy("save");
    setError(null);
    setMessage(null);
    const nextSaved = new Map(saved);
    try {
      for (const image of chosen) {
        if (nextSaved.has(image.url)) continue;
        const asset = await api<{ id: string }>("/campaigns/import-photo", {
          method: "POST",
          body: {
            url: image.url,
            kind: image.kind,
            rights_confirmed: true,
          },
          signal: controller.signal,
        });
        if (id !== requestRef.current) return;
        nextSaved.set(image.url, asset.id);
        setSaved(new Map(nextSaved));
      }
      if (id !== requestRef.current) return;
      onApply(
        page,
        chosen
          .map((image) => nextSaved.get(image.url))
          .filter((id): id is string => Boolean(id))
      );
      setMessage(t("applied", { photos: chosen.length }));
      setPage(null);
      setSelected(new Set());
      setSaved(new Map());
      setRights(false);
    } catch (err) {
      if (id !== requestRef.current) return;
      setError(err instanceof ApiError ? err.message : t("saveFailed"));
      if (nextSaved.size > 0) setMessage(t("partial", { count: nextSaved.size }));
    } finally {
      if (id === requestRef.current) {
        setBusy(null);
        abortRef.current = null;
      }
    }
  }

  function toggle(image: ImportedPage["images"][number]) {
    if (busy || availableSlots === 0) return;
    setError(null);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(image.url)) next.delete(image.url);
      else if (next.size < availableSlots) next.add(image.url);
      return next;
    });
  }

  return (
    <section className="rounded-2xl border border-white/8 bg-[linear-gradient(150deg,rgba(255,255,255,0.045),rgba(255,255,255,0.01))] p-4 md:p-5">
      <div className="flex items-start gap-3">
        <Link2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
        <div>
          <h2 className="font-display text-base font-semibold text-white">
            {t("title")}
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/50">
            {t("subtitle")}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(["product", "company"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={mode === option}
            disabled={busy !== null}
            onClick={() => {
              setMode(option);
              invalidate();
            }}
            className={cn(
              "inline-flex min-h-[44px] items-center rounded-full border px-4 text-xs font-semibold transition-colors",
              mode === option
                ? "border-amber-400/50 bg-amber-500/10 text-amber-200"
                : "border-white/10 text-white/45 hover:border-white/20 hover:text-white/75"
            )}
          >
            {t(option === "product" ? "productMode" : "companyMode")}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <label htmlFor="source-url" className={labelClass}>
          {t("urlLabel")}
        </label>
        <div className="flex max-w-[720px] flex-col gap-2 sm:flex-row">
          <input
            id="source-url"
            className={cn(fieldClass, "min-w-0 flex-1")}
            value={value}
            onChange={(event) => {
              onChange(event.target.value);
              invalidate();
            }}
            placeholder={t("urlPlaceholder")}
            maxLength={500}
            inputMode="url"
            autoComplete="url"
          />
          <button
            type="button"
            onClick={() => void readPage()}
            disabled={busy !== null}
            className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 text-sm font-semibold text-black transition-colors hover:bg-amber-300 disabled:cursor-wait disabled:opacity-60"
          >
            {busy === "read" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
            {busy === "read" ? t("reading") : t("read")}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm leading-relaxed text-rose-300">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-3 text-sm leading-relaxed text-teal-300">
          {message}
        </p>
      )}

      {page && (
        <div className="mt-4 rounded-2xl border border-teal-400/20 bg-teal-500/[0.04] p-4 md:p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-teal-300" />
            <div>
              <h3 className="font-display text-base font-semibold text-white">
                {t("reviewTitle")}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-white/50">
                {page.note}
              </p>
            </div>
          </div>

          <dl className="mt-4 space-y-3 text-sm">
            {page.businessName && (
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  {t("business")}
                </dt>
                <dd className="mt-1 text-white/85">{page.businessName}</dd>
              </div>
            )}
            {page.headline && (
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  {t("headline")}
                </dt>
                <dd className="mt-1 text-white/85">{page.headline}</dd>
              </div>
            )}
            {page.details && (
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  {t("description")}
                </dt>
                <dd className="mt-1 leading-relaxed text-white/70">
                  {page.details}
                </dd>
              </div>
            )}
            {page.priceLabel && (
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wider text-white/40">
                  {t("price")}
                </dt>
                <dd className="mt-1 font-semibold text-amber-200">
                  {page.priceLabel}
                </dd>
              </div>
            )}
          </dl>

          {page.images.length > 0 && (
            <div className="mt-5">
              <p className="text-xs text-white/55">
                {availableSlots === 0
                  ? t("full")
                  : t("choosePhotos", { count: availableSlots })}
              </p>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {page.images.map((image) => {
                  const isSelected = chosen.some((item) => item.url === image.url);
                  const isSaved = saved.has(image.url);
                  return (
                    <button
                      key={image.url}
                      type="button"
                      aria-pressed={isSelected}
                      aria-label={`${isSelected ? t("remove") : t("choose")} ${image.alt}`}
                      disabled={busy !== null || availableSlots === 0}
                      onClick={() => toggle(image)}
                      className={cn(
                        "relative block aspect-square w-full overflow-hidden rounded-xl border bg-black/30 transition-colors",
                        isSelected
                          ? "border-amber-400/50"
                          : "border-white/10 hover:border-white/25"
                      )}
                    >
                      {/* Safe API-generated preview; never load the remote URL in the browser. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.preview}
                        alt={image.alt}
                        className="h-full w-full object-cover"
                      />
                      <span
                        className={cn(
                          "absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border",
                          isSelected
                            ? "border-amber-300 bg-amber-400 text-black"
                            : "border-white/30 bg-black/60 text-white"
                        )}
                      >
                        {isSelected && <Check className="h-3.5 w-3.5" />}
                      </span>
                      <span className="absolute inset-x-0 bottom-0 bg-black/70 px-1.5 py-1 text-[11px] capitalize text-white/80">
                        {isSaved ? t("saved") : t(image.kind)}
                      </span>
                    </button>
                  );
                })}
              </div>

              {chosenCount > 0 && (
                <label className="mt-4 flex min-h-[44px] cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-amber-100/80">
                  <input
                    type="checkbox"
                    checked={rights}
                    disabled={busy !== null}
                    onChange={(event) => {
                      setRights(event.target.checked);
                      setError(null);
                    }}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-amber-400"
                  />
                  <span>{t("rights")}</span>
                </label>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => void apply()}
            disabled={busy !== null}
            className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-teal-300 px-4 text-sm font-semibold text-black transition-colors hover:bg-teal-200 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
          >
            {busy === "save" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {busy === "save"
              ? t("saving")
              : chosenCount > 0
                ? t("applyWithPhotos", { count: chosenCount })
                : t("apply")}
          </button>
          <p className="mt-2 text-[11px] leading-relaxed text-white/40">
            {t("replace")}
          </p>
        </div>
      )}
    </section>
  );
}