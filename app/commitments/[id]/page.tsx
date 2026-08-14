import Link from "next/link";
import { AppHeader } from "@/components/nav";
import { Btn, PoolProgress } from "@/components/ui";
import { BENEFICIARIES, formatNaira, getPool } from "@/lib/mock-data";

export const metadata = { title: "Commitment" };

export default async function CommitmentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const poolId = id.split("-r")[0];
  const pool = getPool(poolId);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader crumb={`#${pool.code} / COMMITMENT`} />
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
        <h1 className="font-display text-[30px] sm:text-[36px] tracking-tight mb-1">
          {pool.title}
        </h1>
        <p className="text-[15px] text-text-dim mb-6">
          {pool.hubName} · {pool.shareDate}
        </p>

        <div className="border border-ink bg-card p-5 mb-5">
          <div className="flex justify-between items-baseline mb-2">
            <span className="font-display text-[26px]">
              {pool.paidSlots} / {pool.totalSlots} paid
            </span>
            <span className="font-mono text-[12.5px] text-text-dim">CLOSES {pool.closesAt.toUpperCase()}</span>
          </div>
          <PoolProgress pool={pool} height={16} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div className="border border-ink bg-card p-5">
            <div className="font-mono text-[11.5px] text-text-dim mb-2">PAYMENT RECORD</div>
            <div className="flex justify-between text-[14.5px] py-1.5 border-b border-rule-card">
              <span className="text-text-dim">Amount paid</span>
              <span className="font-mono">{formatNaira(pool.pricePerSlot * BENEFICIARIES.length)}</span>
            </div>
            <div className="flex justify-between text-[14.5px] py-1.5 border-b border-rule-card">
              <span className="text-text-dim">Reference</span>
              <span className="font-mono">R-88412</span>
            </div>
            <div className="flex justify-between text-[14.5px] py-1.5">
              <span className="text-text-dim">Slots</span>
              <span className="font-mono">{BENEFICIARIES.length}</span>
            </div>
          </div>
          <div className="border border-ink bg-card p-5">
            <div className="font-mono text-[11.5px] text-text-dim mb-2">WHO COLLECTS</div>
            <p className="text-[14.5px] text-text-dim leading-relaxed mb-2">
              {BENEFICIARIES.filter((b) => b.status === "named").length} of {BENEFICIARIES.length}{" "}
              named.
            </p>
            <Link href={`/commitments/${id}/people`} className="font-semibold text-[14.5px] border-b-2 border-ink">
              Edit who collects
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Btn href={`/collections/${id}/book`} size="lg">
            Book a collection window
          </Btn>
          <Btn href={`/collections/${id}/pass`} variant="outline" size="lg">
            View collection pass
          </Btn>
          <Btn href={`/disputes/new`} variant="outline" size="lg">
            Report a problem
          </Btn>
        </div>
        <p className="font-mono text-[11.5px] text-text-dim mt-6 border-t border-rule pt-4">
          You can withdraw for a full refund until 72 hours before the pool closes.
        </p>
      </div>
    </div>
  );
}
