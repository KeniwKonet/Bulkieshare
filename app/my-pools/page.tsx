import Link from "next/link";

import { AppHeader } from "@/components/nav";
import { Btn, PoolProgress, Tag } from "@/components/ui";
import { requireMember } from "@/lib/auth/dal";
import { getActiveHolds } from "@/lib/domain/checkout";
import { listMemberCommitments } from "@/lib/domain/commitments";
import { getPool, listOpenPools } from "@/lib/domain/pools";
import { formatKobo } from "@/lib/money";
import { secondsUntil } from "@/lib/time";

export const metadata = { title: "My pools" };

type Tone = "lime" | "amber" | "green" | "rust" | "ink" | "outline";

/** How a commitment reads to the member, from the pool state plus their own. */
function statusOf(poolState: string, commitmentState: string): { label: string; tone: Tone } {
  if (commitmentState === "refunded") return { label: "refunding", tone: "rust" };
  if (commitmentState === "collected") return { label: "collected", tone: "lime" };
  if (poolState === "open") return { label: "filling", tone: "amber" };
  if (poolState === "funded") return { label: "funded", tone: "lime" };
  if (poolState === "allocating") return { label: "allocating", tone: "amber" };
  if (poolState === "distributing") return { label: "ready to collect", tone: "green" };
  if (poolState === "completed") return { label: "completed", tone: "lime" };
  if (poolState === "underfilled" || poolState === "refunding")
    return { label: "refunding", tone: "rust" };
  return { label: poolState, tone: "outline" };
}

export default async function MyPoolsPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string }>;
}) {
  const { paid } = await searchParams;
  const member = await requireMember("/my-pools");

  const [commitments, holds] = await Promise.all([
    listMemberCommitments(member.id),
    getActiveHolds(member.id),
  ]);

  if (commitments.length === 0 && holds.length === 0) {
    const open = await listOpenPools(member.areaSlug ?? "abuja");
    const cheapest = [...open].sort((a, b) => a.pricePerSlotKobo - b.pricePerSlotKobo)[0];

    return (
      <div className="min-h-screen bg-paper text-ink">
        <AppHeader crumb="MY POOLS" />
        <div className="max-w-xl mx-auto px-5 sm:px-8 py-10">
          <h1 className="font-display text-[30px] tracking-tight leading-tight mb-2.5">
            You have not joined a pool yet
          </h1>
          <p className="text-[15.5px] leading-relaxed text-text-mid mb-5">
            {open.length > 0
              ? `${open.length} pool${open.length === 1 ? " is" : "s are"} open right now. Joining one that is close to its threshold does something visible today.`
              : "Nothing is open this minute. We open new pools most weeks."}
          </p>
          <Btn href={`/${member.areaSlug ?? "abuja"}/pools`} block size="lg" className="mb-8">
            Browse open pools
          </Btn>

          {cheapest && (
            <>
              <div className="font-mono text-[11.5px] text-text-dim mb-3">CHEAPEST WAY IN</div>
              <div className="border border-ink bg-card p-4 mb-3">
                <div className="font-mono text-[11.5px] mb-1">
                  #{cheapest.code} · {cheapest.hubName.toUpperCase()} · {cheapest.shareDateLabel}
                </div>
                <div className="font-display text-[21px]">{cheapest.title}</div>
                <div className="flex justify-between items-end mt-2.5">
                  <span className="font-display text-[24px]">
                    {formatKobo(cheapest.pricePerSlotKobo)}
                  </span>
                  <Btn
                    href={`/${cheapest.areaSlug}/pools/${cheapest.id}`}
                    variant="outline"
                    size="sm"
                  >
                    Look at it
                  </Btn>
                </div>
              </div>
            </>
          )}

          <p className="text-[14.5px] text-text-dim leading-relaxed">
            Nothing here is a subscription. Join one pool, collect once, decide then.
          </p>
        </div>
      </div>
    );
  }

  // Fetch pool views for the progress bars, one per distinct pool.
  const poolIds = [...new Set(commitments.map((c) => c.poolId))];
  const pools = new Map(
    (await Promise.all(poolIds.map((id) => getPool(id))))
      .filter((p) => p !== null)
      .map((p) => [p.id, p] as const),
  );

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader active="my-pools" />
      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
        <h1 className="font-display text-[32px] sm:text-[38px] tracking-tight mb-1">My pools</h1>
        <p className="text-[15px] text-text-dim mb-6">
          {commitments.length} pool{commitments.length === 1 ? "" : "s"}
          {member.creditKobo > 0 && ` · ${formatKobo(member.creditKobo)} store credit`}
        </p>

        {paid && (
          <div className="border border-ink bg-lime px-5 py-4 mb-6">
            <div className="font-display text-[20px] tracking-tight mb-0.5">
              Payment confirmed. Your slot is in.
            </div>
            <p className="text-[14.5px] leading-snug">
              Name who each slot is for, then book a collection window when the pool funds.
            </p>
          </div>
        )}

        {holds.length > 0 && (
          <div className="border border-rust bg-card p-5 mb-6">
            <div className="font-mono text-[11.5px] text-rust mb-2">
              PAYMENT PENDING · {holds.length} HOLD{holds.length === 1 ? "" : "S"}
            </div>
            <div className="flex flex-col gap-3">
              {holds.map((h) => {
                const mins = Math.ceil(secondsUntil(h.expiresAt) / 60);
                return (
                  <div key={h.reference} className="flex justify-between items-center gap-4 flex-wrap">
                    <div>
                      <div className="font-semibold text-[16px]">{h.poolTitle}</div>
                      <div className="font-mono text-[12px] text-text-dim">
                        #{h.poolCode} · {h.slots} slot{h.slots === 1 ? "" : "s"} ·{" "}
                        {formatKobo(h.amountDueKobo)} · {mins} min left
                      </div>
                    </div>
                    <Btn href={`/pay/${h.reference}`} size="sm" variant="dark">
                      Finish paying
                    </Btn>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {commitments.map((c) => {
            const pool = pools.get(c.poolId);
            const s = statusOf(c.poolState, c.state);
            return (
              <Link
                key={c.id}
                href={`/commitments/${c.id}`}
                className="border border-ink bg-card p-5 block"
              >
                <div className="flex justify-between items-start mb-2.5 gap-3">
                  <div>
                    <div className="font-mono text-[11.5px] text-text-dim mb-1">
                      #{c.poolCode} · {c.hubName.toUpperCase()}
                    </div>
                    <div className="font-display text-[22px] tracking-tight">{c.poolTitle}</div>
                  </div>
                  <Tag tone={s.tone}>{s.label.toUpperCase()}</Tag>
                </div>

                {pool && <PoolProgress pool={pool} height={10} showCaption={false} />}

                <div className="flex justify-between text-[14px] text-text-dim mt-3">
                  <span>
                    {c.slots} slot{c.slots === 1 ? "" : "s"} · {formatKobo(c.paidKobo)}
                  </span>
                  <span>{c.shareDateLabel}</span>
                </div>

                <div className="flex gap-2 flex-wrap mt-3">
                  {c.namedSlots < c.slots && (
                    <span className="font-mono text-[11px] bg-amber px-2 py-1">
                      {c.slots - c.namedSlots} SLOT{c.slots - c.namedSlots === 1 ? "" : "S"} UNNAMED
                    </span>
                  )}
                  {c.windowAt && (
                    <span className="font-mono text-[11px] border border-ink px-2 py-1">
                      WINDOW {c.windowLabel}
                    </span>
                  )}
                  {c.collectionCode && c.state !== "collected" && (
                    <span className="font-mono text-[11px] bg-ink text-lime px-2 py-1">
                      CODE {c.collectionCode}
                    </span>
                  )}
                  {c.hasOpenDispute && (
                    <span className="font-mono text-[11px] bg-rust text-white px-2 py-1">
                      DISPUTE OPEN
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
