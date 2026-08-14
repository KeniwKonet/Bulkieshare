import { AppHeader } from "@/components/nav";
import { Btn, PoolProgress } from "@/components/ui";
import { Stepper } from "@/components/interactive";
import { formatNaira, getPool, slotsLeftLabel } from "@/lib/mock-data";

export const metadata = { title: "Reserve a slot" };

export default async function ReservePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pool = getPool(id);
  const credit = 1940;
  const subtotal = pool.pricePerSlot;
  const toPay = Math.max(0, subtotal - credit);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader crumb={`#${pool.code} / RESERVE`} />
      <div className="max-w-xl mx-auto px-5 sm:px-8 py-8 sm:py-10">
        <h1 className="font-display text-[32px] sm:text-[38px] tracking-tight leading-tight mb-1">
          {pool.title}
        </h1>
        <p className="text-[15px] text-text-dim mb-6">
          {pool.hubName} · {pool.shareDate}
        </p>

        <div className="border border-ink bg-card p-5 sm:p-6">
          <div className="flex justify-between items-baseline mb-2">
            <span className="font-display text-[26px]">
              {slotsLeftLabel(pool.totalSlots - pool.paidSlots - pool.reservedUnpaidSlots)}
            </span>
            <span className="font-mono text-[13px]">
              {pool.paidSlots} / {pool.totalSlots} paid
            </span>
          </div>
          <PoolProgress pool={pool} height={20} />
          <div className="font-mono text-[12.5px] bg-ink text-lime px-2.5 py-2 text-center my-5">
            CLOSES {pool.closesAt.toUpperCase()}
          </div>

          <div className="border-t border-rule pt-4 mb-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[15px] font-semibold">How many slots?</span>
              <Stepper min={1} max={pool.totalSlots - pool.paidSlots} />
            </div>
            <div className="flex justify-between text-[14.5px] py-1.5 text-text-dim">
              <span>1 × {formatNaira(pool.pricePerSlot)}</span>
              <span className="font-mono">{formatNaira(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[14.5px] py-1.5 text-text-dim">
              <span>Hub collection</span>
              <span className="font-mono">free</span>
            </div>
            <div className="flex justify-between text-[14.5px] py-1.5 text-text-dim border-b border-rule">
              <span>Store credit applied</span>
              <span className="font-mono">−{formatNaira(credit)}</span>
            </div>
            <div className="flex justify-between items-baseline pt-3">
              <span className="text-[16px] font-bold">To pay now, in full</span>
              <span className="font-display text-[28px]">{formatNaira(toPay)}</span>
            </div>
          </div>

          <Btn href={`/pay/${pool.id}-r1`} block size="xl" className="mb-2.5">
            Reserve slot
          </Btn>
          <p className="font-mono text-[11.5px] leading-relaxed text-text-dim mb-3.5">
            Reserving holds your slot for 20 minutes while you transfer. No card needed.
          </p>
          <label className="flex gap-2.5 items-start text-[14px] leading-snug text-text-mid border-t border-rule pt-3.5">
            <span className="w-4 h-4 border border-ink bg-ink text-lime text-[11px] flex items-center justify-center flex-shrink-0 mt-0.5">
              ✓
            </span>
            <span>
              I can collect at <b>{pool.hubName} on {pool.shareDate}</b>. This pool is not
              delivered.
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
