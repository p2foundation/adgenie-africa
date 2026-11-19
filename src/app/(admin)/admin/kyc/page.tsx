import { type Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { roleAtLeast } from "@adgenie/core";
import { readKycQueue, readSession } from "@/lib/session";
import { StatusPill } from "@/components/admin/kyc-status-pill";
import { Pager } from "@/components/pagination/pager";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Verification queue" };

const FILTERS = [
  { key: "under_review", label: "Waiting" },
  { key: "verified", label: "Verified" },
  { key: "rejected", label: "Sent back" },
  { key: "", label: "Everything" },
] as const;

export default async function KycQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const [session, params] = await Promise.all([readSession(), searchParams]);
  if (!session) redirect("/sign-in");

  const requested = params.status ?? "under_review";
  const status = (FILTERS.find((filter) => filter.key === requested)?.key ?? "under_review") || undefined;
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const data = await readKycQueue({ status, page });
  if (!data) redirect("/dashboard");

  return (
    <div className="shell-wide space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 animate-in">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-amber-400">
            Verification
          </p>
          <h1 className="font-display text-3xl font-bold leading-[1.05] tracking-tight text-white md:text-[2.6rem]">
            The people we are
            <br />
            <span className="gradient-text-hero glow-text-gold">about to pay.</span>
          </h1>
        </div>
        <p className="text-sm text-white/35">
          {data.total.toLocaleString("en-GH")} {data.total === 1 ? "file" : "files"} here
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => {
          const active = (status ?? "") === filter.key;
          return (
            <Link
              key={filter.key || "all"}
              href={filter.key ? `/admin/kyc?status=${filter.key}` : "/admin/kyc?status="}
              className={cn(
                "rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors touch-target",
                active
                  ? "border-amber-400/40 bg-amber-400/10 text-amber-200"
                  : "border-white/8 text-white/45 hover:border-white/20 hover:text-white/70"
              )}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      <div className="glass-card overflow-hidden rounded-2xl">
        <div className="overflow-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <caption className="sr-only">
              Identity verification submissions with status and submission time
            </caption>
            <thead className="sticky top-0 z-10 bg-[#0a0d1b]/95 backdrop-blur-xl">
              <tr className="border-b border-white/8 text-[10px] uppercase tracking-wider text-white/30">
                <th scope="col" className="px-5 py-3 font-semibold">Creator</th>
                <th scope="col" className="px-4 py-3 font-semibold">Legal name</th>
                <th scope="col" className="px-4 py-3 font-semibold">Business</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                <th scope="col" className="px-5 py-3 font-semibold">Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.items.map((item) => (
                <tr key={item.userId} className="transition-colors hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/admin/kyc/${item.userId}`}
                      className="text-sm font-medium text-white/85 hover:text-amber-200"
                    >
                      {item.displayName?.trim() || item.email || "Unnamed creator"}
                      <span className="block truncate text-[11px] font-normal text-white/35">
                        {item.email ?? "no email"}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-white/55">{item.legalName ?? "—"}</td>
                  <td className="px-4 py-3.5 text-xs text-white/55">{item.businessName ?? "—"}</td>
                  <td className="px-4 py-3.5">
                    <StatusPill status={item.status} />
                  </td>
                  <td className="px-5 py-3.5 text-xs text-white/40" title={item.submittedAt ? formatDateTime(item.submittedAt) : "Not submitted"}>
                    {formatRelative(item.submittedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.items.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="font-display text-lg font-semibold text-white/70">Nothing in this list.</p>
            <p className="mt-1 text-sm text-white/35">
              {status === "under_review"
                ? "No one is waiting on you right now."
                : "Try another filter."}
            </p>
          </div>
        ) : null}
      </div>

      <Pager
        page={data.page}
        pages={data.pages}
        total={data.total}
        label="files"
        basePath="/admin/kyc"
        params={{ status: status ?? "" }}
        className="glass-card rounded-2xl"
      />

      {roleAtLeast(session.appRole, "admin") ? null : (
        <p className="text-[11px] text-white/30">
          Managers read the queue; only an admin records a decision.
        </p>
      )}
    </div>
  );
}
