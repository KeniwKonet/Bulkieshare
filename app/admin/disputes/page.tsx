import Link from "next/link";

import { DisputePhotos } from "@/components/dispute-photos";
import { OpsHeader } from "@/components/nav";
import { ResolveDisputeForm } from "@/components/staff-forms";
import { GridTable } from "@/components/ui";
import { requireOps } from "@/lib/auth/dal";
import { listAllDisputes, listOpenDisputes } from "@/lib/domain/support";
import { formatEventStamp } from "@/lib/time";

export const metadata = { title: "Disputes" };

export default async function DisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>;
}) {
  await requireOps();
  const { show } = await searchParams;

  // Closed disputes are the record of how we behaved, so they stay readable.
  const showAll = show === "all";
  const [disputes, everything] = await Promise.all([
    showAll ? listAllDisputes() : listOpenDisputes(),
    listAllDisputes(),
  ]);
  const resolved = everything.filter(
    (d) => d.state === "resolved" || d.state === "rejected",
  );
  const breaching = disputes.filter((d) => d.breaching);

  // Whichever is closest to breaching gets the full treatment at the top.
  const featured = disputes[0];
  const rest = disputes.slice(1);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="disputes" />
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8">
        <div className="flex justify-between items-center mb-5 flex-wrap gap-2">
          <h1 className="font-display text-[26px] tracking-tight">
            Disputes · {showAll ? `${disputes.length} all time` : `${disputes.length} open`}
          </h1>
          <span className="flex gap-2">
            <Link
              href="/admin/disputes"
              className={`font-mono text-[11.5px] px-2.5 py-1.5 border ${
                showAll ? "border-rule" : "bg-ink text-paper border-ink"
              }`}
            >
              OPEN
            </Link>
            <Link
              href="/admin/disputes?show=all"
              className={`font-mono text-[11.5px] px-2.5 py-1.5 border ${
                showAll ? "bg-ink text-paper border-ink" : "border-rule"
              }`}
            >
              ALL {everything.length}
            </Link>
          </span>
          {breaching.length > 0 && (
            <span className="font-mono text-[11.5px] text-rust-dark">
              {breaching.length} BREACHING SLA
            </span>
          )}
        </div>

        {!featured ? (
          <div className="border border-ink bg-card px-5 py-10 text-center">
            <div className="font-display text-[22px] tracking-tight mb-1.5">
              Nothing open
            </div>
            <p className="text-[14.5px] text-text-dim">
              Every dispute raised has been answered.
            </p>
          </div>
        ) : (
          <>
            <div
              className={`border bg-card p-4.5 mb-4 ${
                featured.breaching ? "border-rust-dark" : "border-ink"
              }`}
            >
              <div className="flex justify-between items-baseline mb-2 flex-wrap gap-2">
                <span className="text-[17px] font-bold">{featured.reasonLabel}</span>
                <span
                  className={`font-mono text-[11.5px] px-1.5 py-1 ${
                    featured.breaching ? "bg-rust-dark text-white" : "border border-ink"
                  }`}
                >
                  {featured.breaching ? "BREACHING · SLA 48H" : `${featured.slaLabel} · SLA 48H`}
                </span>
              </div>

              <div className="font-mono text-[11.5px] text-text-dim mb-2.5">
                {featured.reference} · {featured.memberName.toUpperCase()}
                {featured.poolCode ? ` · #${featured.poolCode}` : ""}
                {featured.hubName ? ` · ${featured.hubName.toUpperCase()}` : ""} ·{" "}
                {formatEventStamp(featured.createdAt)}
              </div>

              <p className="text-[14.5px] leading-relaxed text-text-mid mb-3.5">
                {featured.detail}
              </p>

              <DisputePhotos disputeId={featured.id} />

              <ResolveDisputeForm disputeId={featured.id} />
            </div>

            {rest.length > 0 && (
              <GridTable
                columns="1fr 1.3fr 1.2fr .8fr .9fr"
                headers={["REF", "MEMBER", "REASON", "POOL", "SLA"]}
                rows={rest.map((d) => [
                  <Link key="r" href={`/disputes/${d.id}`} className="underline font-mono">
                    {d.reference}
                  </Link>,
                  d.memberName,
                  d.reasonLabel,
                  d.poolCode ? `#${d.poolCode}` : "—",
                  <span key="s" className={d.breaching ? "text-rust-dark font-semibold" : ""}>
                    {d.slaLabel}
                  </span>,
                ])}
              />
            )}
          </>
        )}

        <p className="text-[14.5px] leading-relaxed text-text-dim mt-4">
          Above a 5% dispute rate at any hub we stop opening pools there until we know why.
          {resolved.length > 0 &&
            ` ${resolved.length} have been closed so far.`}
        </p>
      </div>
    </div>
  );
}
