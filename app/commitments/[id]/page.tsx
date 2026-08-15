import Link from "next/link";
import { notFound } from "next/navigation";

import { AppHeader } from "@/components/nav";
import { Btn, PoolProgress, Tag } from "@/components/ui";
import { requireMember } from "@/lib/auth/dal";
import { getOwnedCommitment } from "@/lib/domain/commitments";
import { getPool } from "@/lib/domain/pools";
import { formatKobo } from "@/lib/money";

export const metadata = { title: "Commitment" };

export default async function CommitmentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await requireMember(`/commitments/${id}`);

  const commitment = await getOwnedCommitment(id, member.id);
  if (!commitment) notFound();

  const pool = await getPool(commitment.poolId);

  const canCollect =
    commitment.poolState === "distributing" ||
    commitment.poolState === "completed" ||
    commitment.poolState === "funded";

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader crumb={`#${commitment.poolCode} / COMMITMENT`} />
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
        <h1 className="font-display text-[30px] sm:text-[36px] tracking-tight mb-1">
          {commitment.poolTitle}
        </h1>
        <p className="text-[15px] text-text-dim mb-6">
          {commitment.hubName} · {commitment.shareDateLabel}
        </p>

        {pool && (
          <div className="border border-ink bg-card p-5 mb-5">
            <div className="flex justify-between items-baseline mb-2 flex-wrap gap-2">
              <span className="font-display text-[26px]">
                {pool.paidSlots} / {pool.totalSlots} paid
              </span>
              <span className="font-mono text-[12.5px] text-text-dim">
                {pool.isOpen ? `CLOSES ${pool.closesAtLabel.toUpperCase()}` : pool.state.toUpperCase()}
              </span>
            </div>
            <PoolProgress pool={pool} height={16} />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div className="border border-ink bg-card p-5">
            <div className="font-mono text-[11.5px] text-text-dim mb-2">PAYMENT RECORD</div>
            <div className="flex justify-between text-[14.5px] py-1.5 border-b border-rule-card">
              <span className="text-text-dim">Amount paid</span>
              <span className="font-mono">{formatKobo(commitment.paidKobo)}</span>
            </div>
            <div className="flex justify-between text-[14.5px] py-1.5 border-b border-rule-card">
              <span className="text-text-dim">Slots</span>
              <span className="font-mono">{commitment.slots}</span>
            </div>
            <div className="flex justify-between text-[14.5px] py-1.5">
              <span className="text-text-dim">Paid by</span>
              <span className="font-mono">
                {commitment.paidByCoordinator ? "your coordinator" : "you"}
              </span>
            </div>
          </div>

          <div className="border border-ink bg-card p-5">
            <div className="font-mono text-[11.5px] text-text-dim mb-2">WHO COLLECTS</div>
            <p className="text-[14.5px] text-text-dim leading-relaxed mb-2">
              {commitment.namedSlots} of {commitment.slots} named.
            </p>
            {commitment.collectionCode && (
              <div className="font-mono text-[13px] mb-2">
                Your code:{" "}
                <b className="text-[18px] tracking-wider">{commitment.collectionCode}</b>
              </div>
            )}
            <Link
              href={`/commitments/${commitment.id}/people`}
              className="font-semibold text-[14.5px] border-b-2 border-ink"
            >
              Edit who collects
            </Link>
          </div>
        </div>

        {commitment.windowAt && (
          <div className="border border-ink bg-lime p-4 mb-5 flex justify-between items-center flex-wrap gap-2">
            <span className="text-[15.5px] font-semibold">
              Collection window booked for {commitment.windowLabel} on{" "}
              {commitment.shareDateLabel}
            </span>
            <Tag tone="ink">{commitment.hubName.toUpperCase()}</Tag>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {canCollect && commitment.state !== "collected" && (
            <>
              <Btn href={`/collections/${commitment.id}/book`} size="lg">
                {commitment.windowAt ? "Change collection window" : "Book a collection window"}
              </Btn>
              <Btn href={`/collections/${commitment.id}/pass`} variant="outline" size="lg">
                View collection pass
              </Btn>
            </>
          )}
          {(commitment.state === "collected" || commitment.poolState === "completed") && (
            <>
              <Btn href={`/commitments/${commitment.id}/settlement`} size="lg">
                See what you got
              </Btn>
              <Btn
                href={`/disputes/new?commitment=${commitment.id}`}
                variant="outline-rust"
                size="lg"
              >
                Something was wrong
              </Btn>
            </>
          )}
          {commitment.state === "refunded" && (
            <Btn href="/account/credit" variant="outline" size="lg">
              See your refund
            </Btn>
          )}
          <Btn
            href={`/${pool?.areaSlug ?? "abuja"}/pools/${commitment.poolId}`}
            variant="outline"
            size="lg"
          >
            See the pool
          </Btn>
        </div>

        <p className="font-mono text-[11.5px] text-text-dim mt-6 border-t border-rule pt-4">
          {commitment.poolState === "open"
            ? "You can withdraw for a full refund until this pool closes."
            : "This pool is locked, so slots can no longer be withdrawn."}
        </p>
      </div>
    </div>
  );
}
