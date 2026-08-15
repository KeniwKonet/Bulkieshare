import Link from "next/link";

import { OpsHeader } from "@/components/nav";
import { RefundPoolButton } from "@/components/staff-forms";
import { Btn, ProgressBar, StatGrid } from "@/components/ui";
import { requireOps } from "@/lib/auth/dal";
import { getOpsCounts, getReconciliationSummary } from "@/lib/domain/ops";
import { listAllPools, settleClosedPools, sweepExpiredHolds } from "@/lib/domain/pools";
import { formatKobo } from "@/lib/money";

export const metadata = { title: "Pool board" };

export default async function PoolBoardPage() {
  await requireOps();

  // The board is where ops looks first, so bring state up to date on load.
  await sweepExpiredHolds();
  await settleClosedPools();

  const [pools, counts, recon] = await Promise.all([
    listAllPools(),
    getOpsCounts(),
    getReconciliationSummary(),
  ]);

  const live = pools.filter(
    (p) => p.state !== "completed" && p.state !== "cancelled",
  );

  // Money still held for pools that have not been bought against yet.
  const escrowKobo = pools
    .filter((p) => p.state === "open" || p.state === "funded")
    .reduce((sum, p) => sum + p.paidSlots * p.pricePerSlotKobo, 0);

  const needsDecision = pools.filter(
    (p) => p.state === "underfilled" || (p.state === "funded" && p.paidSlots > 0),
  );

  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="pools" />

      <StatGrid
        columns={5}
        items={[
          { label: "COLLECTED, ALL TIME", value: formatKobo(recon.money.collectedKobo) },
          { label: "HELD IN POOL ESCROW", value: formatKobo(escrowKobo) },
          { label: "MEMBER CREDIT OUTSTANDING", value: formatKobo(recon.creditOutstanding.kobo) },
          {
            label: "OPEN DISPUTES",
            value: String(counts.openDisputes),
            valueClassName: counts.breachingDisputes > 0 ? "text-rust-dark" : undefined,
            sub: counts.breachingDisputes > 0 ? `${counts.breachingDisputes} breaching` : undefined,
          },
          {
            label: "UNMATCHED TRANSFERS",
            value: String(counts.unmatched),
            valueClassName: counts.unmatched > 0 ? "text-rust-dark" : undefined,
          },
        ]}
      />

      <div className="px-5 sm:px-6 py-6">
        <div className="flex justify-between items-end mb-3.5 flex-wrap gap-3">
          <div>
            <h1 className="font-display text-[26px] sm:text-[28px] tracking-tight">
              {live.length} live pool{live.length === 1 ? "" : "s"}
            </h1>
            <p className="text-[14.5px] text-text-dim mt-1">
              {needsDecision.length > 0
                ? `${needsDecision.length} need a decision today.`
                : "Nothing needs a decision right now."}
            </p>
          </div>
          <Btn href="/admin/pools/new" variant="dark" size="md">
            Open a pool
          </Btn>
        </div>

        <div className="border border-ink bg-card overflow-x-auto">
          <div className="grid grid-cols-[1.6fr_.9fr_1.2fr_.9fr_1fr_1.3fr] font-mono text-[11.5px] bg-ink text-dark-dim-2 min-w-[900px]">
            {["POOL", "STATE", "FILL", "CLOSES", "COLLECTED", "ACTION"].map((h) => (
              <div key={h} className="px-4 py-2.5">
                {h}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-[1.6fr_.9fr_1.2fr_.9fr_1fr_1.3fr] text-[13.5px] min-w-[900px]">
            {pools.map((p, i) => {
              const bad = p.state === "underfilled" || p.state === "refunding";
              const border = i < pools.length - 1 ? "border-b border-rule-card" : "";
              return (
                <div key={p.id} className="contents">
                  <div className={`px-4 py-2.5 font-semibold ${bad ? "text-rust-dark" : ""} ${border}`}>
                    <Link href={`/${p.areaSlug}/pools/${p.id}`} className="underline">
                      {p.code} {p.title.split(",")[0]} · {p.hubName.split(" ")[0]}
                    </Link>
                  </div>
                  <div className={`px-4 py-2.5 font-mono ${bad ? "text-rust-dark" : ""} ${border}`}>
                    {p.state}
                  </div>
                  <div className={`px-4 py-2.5 ${border}`}>
                    <ProgressBar
                      paidPct={(p.paidSlots / p.totalSlots) * 100}
                      reservedPct={(p.holdingSlots / p.totalSlots) * 100}
                      thresholdPct={(p.threshold / p.totalSlots) * 100}
                      height={7}
                    />
                    <span className="font-mono text-[11px] mt-0.5 inline-block">
                      {p.paidSlots}/{p.totalSlots}
                    </span>
                  </div>
                  <div className={`px-4 py-2.5 font-mono text-[12.5px] ${border}`}>
                    {p.closesAtLabel}
                  </div>
                  <div className={`px-4 py-2.5 font-mono text-[12.5px] ${border}`}>
                    {formatKobo(p.paidSlots * p.pricePerSlotKobo)}
                  </div>
                  <div className={`px-4 py-2.5 ${border}`}>
                    {p.state === "underfilled" ? (
                      <RefundPoolButton poolId={p.id} />
                    ) : p.state === "funded" ? (
                      <Link
                        href={`/admin/pools/${p.id}/allocation`}
                        className="font-mono text-[11.5px] px-1.5 py-1 inline-block bg-ink text-lime"
                      >
                        ALLOCATE
                      </Link>
                    ) : p.state === "completed" ? (
                      <Link
                        href={`/${p.areaSlug}/pools/${p.id}/report`}
                        className="font-mono text-[11.5px] px-1.5 py-1 inline-block border border-ink"
                      >
                        REPORT
                      </Link>
                    ) : (
                      <span className="font-mono text-[11.5px] text-text-dim">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-4 py-2.5 border-t border-rule font-mono text-[11.5px] text-text-dim">
            {pools.length} pools · escrow {formatKobo(escrowKobo)} reconciles to the ledger
          </div>
        </div>
      </div>
    </div>
  );
}
