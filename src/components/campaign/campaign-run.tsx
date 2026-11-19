"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Camera,
  Check,
  Download,
  Loader2,
  PenLine,
  RefreshCw,
  ScanLine,
  Sparkles,
  Type,
  Wand2,
} from "lucide-react";
import { ApiError, api, apiBlob, type Campaign } from "@/lib/api";
import { PrivateImage } from "@/components/media/private-image";
import { PostKit } from "./post-kit";
import { cn } from "@/lib/utils";

const TOOL_LABEL: Record<string, { label: string; icon: typeof Sparkles }> = {
  plan: { label: "Planned the angle", icon: Sparkles },
  write_copy: { label: "Wrote headline and caption", icon: PenLine },
  make_scene: { label: "Shot the scene", icon: Camera },
  compose_overlay: { label: "Set the type and price", icon: Type },
  check_output: { label: "Checked every size", icon: ScanLine },
  package_delivery: { label: "Packaged the files", icon: Check },
};

const POLL_MS = 2500;

interface FinalFile {
  generationId: string;
  index: number;
  label: string;
  width: number;
  height: number;
}

export function CampaignRun({ campaign }: { campaign: Campaign }) {
  const [data, setData] = useState<Campaign>(campaign);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);
  const refreshedRef = useRef(false);
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const fresh = await api<Campaign>(`/campaigns/${campaign.id}`);
      setData(fresh);
      return fresh;
    } catch {
      return null;
    }
  }, [campaign.id]);

  // While the agent works, the page reads its own state back from Postgres.
  useEffect(() => {
    if (data.status !== "running") return;
    const tick = async () => {
      const fresh = await refresh();
      if (fresh && fresh.status !== "running") {
        if (pollRef.current) window.clearInterval(pollRef.current);
        pollRef.current = null;
        // The header chip, credit balance and library are server-rendered, so
        // they only learn about the finished run when the page is refreshed.
        if (!refreshedRef.current) {
          refreshedRef.current = true;
          router.refresh();
        }
      }
    };
    pollRef.current = window.setInterval(() => void tick(), POLL_MS);
    void tick();
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [data.status, refresh, router]);

  const ai = data.ai;
  const quote = data.plan?.quote;
  const copy = data.copy ?? null;
  const steps = data.steps ?? [];
  const finals = useMemo<FinalFile[]>(() => {
    const files: FinalFile[] = [];
    for (const output of data.outputs ?? []) {
      for (const file of output.files) {
        if (file.role !== "final" && output.kind !== "overlay") continue;
        files.push({
          generationId: output.id,
          index: file.index,
          label: file.label ?? "Creative",
          width: file.width ?? 1080,
          height: file.height ?? 1080,
        });
      }
    }
    return files;
  }, [data.outputs]);

  const captionText = copy
    ? [copy.caption, copy.hashtags.map((tag) => `#${tag.replace(/^#/, "")}`).join(" ")]
        .filter(Boolean)
        .join("\n\n")
    : "";

  async function start() {
    setStarting(true);
    setError(null);
    try {
      await api(`/campaigns/${campaign.id}/run`, { method: "POST" });
      refreshedRef.current = false;
      const fresh = await refresh();
      if (!fresh) setData((current) => ({ ...current, status: "running" }));
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        await refresh();
      } else if (err instanceof ApiError && err.status === 402) {
        setError("You need a few more credits before this plan can run.");
      } else if (err instanceof ApiError && err.status === 503) {
        setError(err.message);
        await refresh();
      } else {
        setError("We could not start the run. Try again in a moment.");
      }
    } finally {
      setStarting(false);
    }
  }

  async function download(file: FinalFile) {
    const blob = await apiBlob(
      `/outputs/${file.generationId}?index=${file.index}&download=1`
    );
    if (!blob) {
      setError("That file is no longer available.");
      return;
    }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `adgenie-${file.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const running = data.status === "running";
  const done = data.status === "done";
  const failed = data.status === "failed";
  const canStart = !running && !starting && Boolean(ai?.configured);
  const betaLanguage = data.language === "tw" || data.language === "gaa";

  return (
    <section className="glass-card rounded-2xl p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-amber-300" />
          <h2 className="font-display text-sm font-semibold text-white">Generate</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {ai && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
                ai.mode !== "mock"
                  ? "border-teal-400/25 bg-teal-500/10 text-teal-200"
                  : "border-amber-400/25 bg-amber-500/10 text-amber-200"
              )}
              title={ai.note}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {ai.mode === "gemini" ? "Gemini" : ai.mode === "openai" ? "OpenAI" : "Sample render"}
            </span>
          )}
          {ai?.backup && (
            <span
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-2 py-1 text-[9px] font-medium uppercase tracking-wider text-white/35"
              title={`${ai.backup.textModel} / ${ai.backup.imageModel}`}
            >
              + {ai.backup.provider} backup
            </span>
          )}
          {running && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-400/25 bg-teal-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-teal-200">
              <Loader2 className="h-3 w-3 animate-spin" />
              Running
            </span>
          )}
          {done && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-400/25 bg-teal-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-teal-200">
              <Check className="h-3 w-3" />
              Delivered
            </span>
          )}
        </div>
      </div>

      {ai && !ai.configured && (
        <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-500/[0.07] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-200">
            Setup needed
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-100/70">{ai.note}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-amber-100/50">
            Set <code className="rounded bg-black/30 px-1 py-0.5">GEMINI_API_KEY</code> or{" "}
            <code className="rounded bg-black/30 px-1 py-0.5">OPENAI_API_KEY</code> on the API
            and generation switches on. Nothing has been charged.
          </p>
        </div>
      )}

      {data.plan?.brief.video && (
        <p className="mt-4 rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-2.5 text-[11px] leading-relaxed text-white/40">
          Motion cut is not part of this run yet: AdGenie delivers the stills, sizes
          and caption. No video credits are taken.
        </p>
      )}

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-400/25 bg-rose-500/[0.07] px-4 py-3 text-xs leading-relaxed text-rose-100/80">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">
            {error}
            {error.includes("credits") && (
              <Link href="/credits" className="ml-2 underline underline-offset-2">
                Top up
              </Link>
            )}
          </span>
        </div>
      )}

      {running && (
        <div className="mt-4 space-y-3">
          <ol className="space-y-2">
            {steps.length === 0 && (
              <li className="flex items-center gap-2 text-xs text-white/45">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-300" />
                The agent is starting…
              </li>
            )}
            {steps.map((step) => {
              const meta = TOOL_LABEL[step.tool] ?? {
                label: step.tool,
                icon: Sparkles,
              };
              const Icon = meta.icon;
              return (
                <li key={step.seq} className="flex items-center gap-2.5 text-xs">
                  <span
                    className={cn(
                      "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                      step.status === "done"
                        ? "border-teal-400/30 bg-teal-500/10 text-teal-300"
                        : step.status === "failed"
                          ? "border-rose-400/30 bg-rose-500/10 text-rose-300"
                          : "border-white/10 bg-white/5 text-white/40"
                    )}
                  >
                    {step.status === "running" ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Icon className="h-3 w-3" />
                    )}
                  </span>
                  <span
                    className={cn(
                      "flex-1",
                      step.status === "running" ? "text-white/75" : "text-white/50"
                    )}
                  >
                    {meta.label}
                  </span>
                  {step.latencyMs !== null && (
                    <span className="tabular-nums text-[10px] text-white/25">
                      {(step.latencyMs / 1000).toFixed(1)}s
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
          <p className="text-[11px] text-white/30">
            Each piece is charged as it lands. If a step fails, its credits go back.
          </p>
        </div>
      )}

      {done && finals.length > 0 && (
        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {finals.map((file) => (
              <figure
                key={`${file.generationId}-${file.index}`}
                className="group overflow-hidden rounded-xl border border-white/8 bg-black/20"
              >
                <div
                  className="relative w-full overflow-hidden"
                  style={{ aspectRatio: `${file.width} / ${file.height}` }}
                >
                  <PrivateImage
                    generationId={file.generationId}
                    index={file.index}
                    width={480}
                    alt={`${file.label} creative`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => void download(file)}
                    className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-lg border border-white/15 bg-black/55 px-2 py-1 text-[10px] font-semibold text-white/80 backdrop-blur-sm transition-colors hover:border-amber-400/40 hover:text-amber-200 touch-target"
                  >
                    <Download className="h-3 w-3" />
                    Save
                  </button>
                </div>
                <figcaption className="flex items-center justify-between gap-2 px-2.5 py-2">
                  <span className="truncate text-[11px] font-medium text-white/60">
                    {file.label}
                  </span>
                  <span className="shrink-0 text-[9px] uppercase tracking-wider text-white/25">
                    {file.width}×{file.height}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>

          {copy && <PostKit files={finals} caption={captionText} />}

          {copy && (
            <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35">
                Caption
              </p>
              <p className="mt-2.5 whitespace-pre-line text-sm leading-relaxed text-white/70">
                {copy.caption}
              </p>
              {copy.hashtags.length > 0 && (
                <p className="mt-2 text-xs text-teal-300/60">
                  {copy.hashtags.map((tag) => `#${tag.replace(/^#/, "")}`).join(" ")}
                </p>
              )}
              <p className="mt-3 border-t border-white/5 pt-3 text-[11px] leading-relaxed text-white/30">
                {copy.strategy}
              </p>
              {betaLanguage && (
                <p className="mt-2 text-[11px] leading-relaxed text-amber-200/70">
                  {data.language === "tw" ? "Twi" : "Ga"} is in beta — have a native
                  speaker read the caption before you post.
                </p>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-white/30">
            <span>
              {data.run?.creditsSpent ?? 0} credits this run
              {data.creditsSpent !== (data.run?.creditsSpent ?? 0)
                ? ` · ${data.creditsSpent} across all runs`
                : ""}
              {data.run?.finishedAt
                ? ` · finished ${new Date(data.run.finishedAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : ""}
            </span>
            <button
              type="button"
              onClick={() => void start()}
              disabled={!canStart}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white/45 transition-colors hover:border-white/20 hover:text-white/75 disabled:opacity-40 touch-target"
            >
              <RefreshCw className="h-3 w-3" />
              Run again
            </button>
          </div>
        </div>
      )}

      {done && finals.length === 0 && (
        <p className="mt-4 text-xs leading-relaxed text-white/40">
          This run finished without image files. Open the library to see what it
          wrote, or run it again.
        </p>
      )}

      {!running && !done && (
        <div className="mt-4 space-y-3">
          {failed && (
            <>
              <p className="text-xs leading-relaxed text-rose-100/70">
                {data.run?.error || "The last run stopped before it finished."} Every
                charged step was refunded.
              </p>
              <p className="text-xs leading-relaxed text-white/45">
                This is the model provider, not your account or your brief — your
                credits are back where they were. You can run the same plan again;
                nothing about it needs changing.
              </p>
            </>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white/75">
                {quote ? `${quote.total} credits for this plan` : "Ready when you are"}
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-white/35">
                {quote
                  ? quote.lines
                      .map((line) => `${line.units}× ${line.label.toLowerCase()}`)
                      .join(" · ")
                  : "Credits move only when you press start."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void start()}
              disabled={!canStart}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/15 px-4 py-2.5 text-sm font-semibold text-amber-100 transition-colors hover:border-amber-400/50 hover:bg-amber-500/20 disabled:opacity-40 touch-target"
            >
              {starting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {failed ? "Try again" : starting ? "Starting…" : "Generate campaign"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
