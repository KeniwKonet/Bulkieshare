import { notFound } from "next/navigation";

import { ReserveForm } from "@/components/forms";
import { AppHeader } from "@/components/nav";
import { Btn, PoolProgress } from "@/components/ui";
import { requireMember } from "@/lib/auth/dal";
import { getPool } from "@/lib/domain/pools";
import { slotsLeftLabel } from "@/lib/money";

export const metadata = { title: "Reserve a slot" };

export default async function ReservePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const pool = await getPool(id);
  if (!pool) notFound();

  const member = await requireMember(`/pools/${id}/reserve`);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader crumb={`#${pool.code} / RESERVE`} />
      <div className="max-w-xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
        <h1 className="font-display text-[32px] sm:text-[38px] tracking-tight leading-tight mb-1">
          {pool.title}
        </h1>
        <p className="text-[15px] text-text-dim mb-6">
          {pool.hubName} · {pool.shareDateLabel}
        </p>

        <div className="border border-ink bg-card p-5 sm:p-6">
          <div className="flex justify-between items-baseline mb-2">
            <span className="font-display text-[26px]">{slotsLeftLabel(pool.slotsLeft)}</span>
            <span className="font-mono text-[13px]">
              {pool.paidSlots} / {pool.totalSlots} paid
            </span>
          </div>
          <PoolProgress pool={pool} height={20} />
          <div className="font-mono text-[12.5px] bg-ink text-lime px-2.5 py-2 text-center my-5">
            CLOSES {pool.closesAtLabel.toUpperCase()}
          </div>

          {pool.isOpen ? (
            <ReserveForm
              poolId={pool.id}
              pricePerSlotKobo={pool.pricePerSlotKobo}
              creditKobo={member.creditKobo}
              maxSlots={Math.min(pool.slotsLeft, 8)}
              hubName={pool.hubName}
              shareDateLabel={pool.shareDateLabel}
            />
          ) : (
            <div className="border-t border-rule pt-4">
              <div className="font-display text-[22px] tracking-tight mb-2">
                {pool.slotsLeft === 0 ? "Every slot is taken" : "This pool has closed"}
              </div>
              <p className="text-[15px] text-text-dim leading-relaxed mb-4">
                Nothing was charged. Have a look at what else is open at {pool.hubName}.
              </p>
              <Btn href={`/${pool.areaSlug}/pools`} block size="lg">
                See open pools
              </Btn>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
