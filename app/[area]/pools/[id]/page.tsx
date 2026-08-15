import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SitePage } from "@/components/nav";
import { Btn, PhotoPlaceholder, PoolProgress } from "@/components/ui";
import { getCurrentMember } from "@/lib/auth/dal";
import { getPool } from "@/lib/domain/pools";
import { formatKobo, slotsLeftLabel } from "@/lib/money";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ area: string; id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const pool = await getPool(id);
  return { title: pool?.title ?? "Pool" };
}

export default async function PoolDetail({
  params,
}: {
  params: Promise<{ area: string; id: string }>;
}) {
  const { area, id } = await params;
  const [pool, member] = await Promise.all([getPool(id), getCurrentMember()]);
  if (!pool) notFound();

  const creditKobo = member?.creditKobo ?? 0;
  const creditApplied = Math.min(creditKobo, pool.pricePerSlotKobo);
  const oneSlotDue = pool.pricePerSlotKobo - creditApplied;

  return (
    <SitePage area={area}>
      <div className="max-w-6xl mx-auto">
        <div className="px-5 sm:px-8 py-3.5 border-b border-ink">
          <span className="font-mono text-[12.5px]">OPEN POOLS / #{pool.code}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_.95fr]">
          <div className="px-5 sm:px-8 py-8 lg:border-r border-ink">
            <PhotoPlaceholder caption={pool.photoCaption} height={230} className="mb-6" />
            <h1 className="font-display text-[36px] sm:text-[44px] tracking-tight leading-none mb-3">
              {pool.title}
            </h1>
            <p className="text-[16px] sm:text-[17px] leading-relaxed text-text-mid max-w-[56ch] mb-6 text-pretty">
              {pool.description}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-ink border border-ink mb-6">
              <div className="bg-card p-4">
                <div className="font-mono text-[11.5px] text-text-dim">WHAT ONE SLOT IS</div>
                <div className="text-[17px] font-semibold">{pool.unitDescription}</div>
              </div>
              {pool.toleranceBand && (
                <div className="bg-card p-4">
                  <div className="font-mono text-[11.5px] text-text-dim">TOLERANCE BAND</div>
                  <div className="text-[17px] font-semibold">{pool.toleranceBand}</div>
                </div>
              )}
              <div className="bg-card p-4">
                <div className="font-mono text-[11.5px] text-text-dim">COLLECT AT</div>
                <div className="text-[17px] font-semibold">
                  {pool.hubName}, {pool.shareDateLabel}
                </div>
              </div>
              {pool.cutsBreakdown && (
                <div className="bg-card p-4">
                  <div className="font-mono text-[11.5px] text-text-dim">CUTS YOU GET</div>
                  <div className="text-[17px] font-semibold">{pool.cutsBreakdown}</div>
                </div>
              )}
            </div>

            {pool.toleranceBand && (
              <>
                <h3 className="text-[21px] font-semibold mb-2 tracking-tight">
                  How the cuts are shared out
                </h3>
                <p className="text-[15.5px] leading-relaxed text-text-dim max-w-[62ch] mb-6">
                  A {pool.title.toLowerCase()} does not divide into identical portions, so we run a
                  published algorithm with a seed we post before allocation
                  {pool.allocationSeed ? ` (this pool's seed is ${pool.allocationSeed})` : ""}. If
                  you drew below average last time, you are prioritised this time. The full
                  allocation table goes to every member before anybody collects.
                </p>
              </>
            )}

            <h3 className="text-[21px] font-semibold mb-2 tracking-tight">
              If the pool does not fill
            </h3>
            <p className="text-[15.5px] leading-relaxed text-text-dim max-w-[62ch]">
              {pool.threshold} slots is the minimum for this to be worth buying. Below that at
              closing time, the pool is cancelled and every naira goes back to the account it came
              from within 24 hours. You can also pull out yourself any time before the pool closes.
            </p>
          </div>

          <div className="px-5 sm:px-8 py-8">
            <div className="border border-ink bg-card p-5 lg:sticky lg:top-5">
              {pool.isOpen && (
                <>
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="font-display text-[30px]">
                      {slotsLeftLabel(pool.slotsLeft)}
                    </span>
                    <span className="font-mono text-[13px]">
                      {pool.paidSlots} / {pool.totalSlots} paid
                    </span>
                  </div>
                  <PoolProgress pool={pool} height={24} />
                  <div className="font-mono text-[12.5px] bg-ink text-lime px-2.5 py-2 text-center my-5">
                    CLOSES {pool.closesAtLabel.toUpperCase()}
                  </div>

                  <div className="border-t border-rule pt-4 mb-4">
                    <div className="flex justify-between text-[14.5px] py-1.5 text-text-dim">
                      <span>1 × {formatKobo(pool.pricePerSlotKobo)}</span>
                      <span className="font-mono">{formatKobo(pool.pricePerSlotKobo)}</span>
                    </div>
                    <div className="flex justify-between text-[14.5px] py-1.5 text-text-dim">
                      <span>Hub collection</span>
                      <span className="font-mono">free</span>
                    </div>
                    {creditApplied > 0 && (
                      <div className="flex justify-between text-[14.5px] py-1.5 text-text-dim">
                        <span>Your store credit</span>
                        <span className="font-mono">−{formatKobo(creditApplied)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-baseline pt-3 border-t border-rule">
                      <span className="text-[16px] font-bold">One slot costs</span>
                      <span className="font-display text-[28px]">{formatKobo(oneSlotDue)}</span>
                    </div>
                  </div>

                  <Btn href={`/pools/${pool.id}/reserve`} block size="xl" className="mb-2.5">
                    Reserve a slot
                  </Btn>
                  <p className="font-mono text-[11.5px] leading-relaxed text-text-dim">
                    Reserving holds your slot for 20 minutes while you transfer. No card needed.
                  </p>

                  {!pool.thresholdPassed && (
                    <p className="text-[13px] text-rust font-mono mt-3">
                      threshold {pool.threshold} not yet met
                    </p>
                  )}
                </>
              )}

              {pool.state === "open" && !pool.isOpen && (
                <>
                  <span className="font-mono text-[12px] bg-ink text-lime px-2 py-1">
                    {pool.slotsLeft === 0 ? "FULL" : "CLOSED"}
                  </span>
                  <div className="font-display text-[26px] tracking-tight mt-3 mb-2">
                    {pool.slotsLeft === 0 ? "Every slot is taken" : "This pool has closed"}
                  </div>
                  <PoolProgress pool={pool} height={20} />
                  <p className="text-[15px] leading-relaxed text-text-mid mt-4">
                    We open a pool like this most weeks at {pool.hubName}.
                  </p>
                  <Btn href={`/${area}/pools`} block size="lg" className="mt-4">
                    See what is open
                  </Btn>
                </>
              )}

              {(pool.state === "underfilled" || pool.state === "refunding") && (
                <>
                  <span className="font-mono text-[12px] bg-rust text-white px-2 py-1">
                    UNDERFILLED · CANCELLED
                  </span>
                  <div className="font-display text-[26px] tracking-tight mt-3 mb-2">
                    This pool did not reach threshold
                  </div>
                  <PoolProgress pool={pool} height={20} />
                  <p className="text-[15px] leading-relaxed text-text-mid mt-4">
                    {pool.paidSlots} of {pool.threshold} needed joined. Nothing was bought and
                    everyone was refunded in full.
                  </p>
                </>
              )}

              {(pool.state === "completed" ||
                pool.state === "funded" ||
                pool.state === "distributing" ||
                pool.state === "allocating") && (
                <>
                  <span className="font-mono text-[12px] bg-green text-white px-2 py-1">
                    {pool.state.toUpperCase()}
                  </span>
                  <div className="font-display text-[26px] tracking-tight mt-3 mb-2">
                    {pool.paidSlots} of {pool.totalSlots} slots taken
                  </div>
                  <PoolProgress pool={pool} height={20} showCaption={false} />
                  <p className="text-[15px] leading-relaxed text-text-mid mt-4 mb-4">
                    {pool.state === "completed"
                      ? "This pool ran to completion. Read the full breakdown of weights, cost and allocation."
                      : `Funded and buying. Share date is ${pool.shareDateLabel} at ${pool.hubName}.`}
                  </p>
                  {pool.state === "completed" && (
                    <Btn href={`/${area}/pools/${pool.id}/report`} block size="lg">
                      Read the public report
                    </Btn>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 sm:px-8 pb-8">
          <Link
            href={`/${area}/pools`}
            className="text-[14.5px] font-semibold border-b-2 border-ink"
          >
            ← Back to all pools
          </Link>
        </div>
      </div>
    </SitePage>
  );
}
