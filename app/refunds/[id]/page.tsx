import { notFound } from "next/navigation";

import { RefundAsCreditForm } from "@/components/forms";
import { PhoneShell } from "@/components/nav";
import { Btn, Tag } from "@/components/ui";
import { requireMember } from "@/lib/auth/dal";
import { getPool } from "@/lib/domain/pools";
import { getRefund } from "@/lib/domain/support";
import { formatKobo } from "@/lib/money";
import { formatEventStamp } from "@/lib/time";

export const metadata = { title: "Refund tracker" };

export default async function RefundTrackerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await requireMember(`/refunds/${id}`);

  const refund = await getRefund(id);
  if (!refund) notFound();
  if (refund.memberId !== member.id && member.role !== "ops" && member.role !== "admin") {
    notFound();
  }

  const pool = refund.poolId ? await getPool(refund.poolId) : null;
  const isPaid = refund.state === "paid";

  const step = (done: boolean, active: boolean, title: string, sub: string) => (
    <div className={`flex gap-3 ${!done && !active ? "opacity-45" : ""}`}>
      <div
        className={
          done
            ? "w-[18px] h-[18px] bg-ink text-lime text-[11px] flex items-center justify-center flex-shrink-0"
            : active
              ? "w-[18px] h-[18px] border border-ink hatch-unpaid flex-shrink-0"
              : "w-[18px] h-[18px] border border-ink flex-shrink-0"
        }
      >
        {done ? "✓" : ""}
      </div>
      <div>
        <div className="text-[15px] font-semibold">{title}</div>
        <div className="font-mono text-[12px] text-text-dim">{sub}</div>
      </div>
    </div>
  );

  return (
    <div className="bg-[#8E8C86] min-h-screen py-6">
      <PhoneShell
        title={refund.poolCode ? `#${refund.poolCode} cancelled` : refund.reference}
        eyebrow={<Tag tone={isPaid ? "green" : "rust"}>{refund.state.toUpperCase()}</Tag>}
      >
        <div className="px-5 py-6 border-b border-ink">
          <h2 className="font-display text-[27px] sm:text-[30px] tracking-tight leading-tight mb-2.5">
            {isPaid
              ? refund.method === "credit"
                ? "Your refund is in your store credit."
                : "Your money went back to your bank."
              : "The pool did not fill. Your money is on its way back."}
          </h2>
          <p className="text-[15px] leading-relaxed text-text-mid">
            {pool
              ? `${pool.paidSlots} people joined and we needed ${pool.threshold} to make the price work. We did not buy anything, so there is nothing to split. `
              : ""}
            {refund.reason}
          </p>
        </div>

        <div className="px-5 py-5 border-b border-ink">
          <div className="font-mono text-[11.5px] text-text-dim mb-3.5">
            REFUND, PROMISED WITHIN 24 HOURS
          </div>
          <div className="flex flex-col gap-3.5">
            {step(true, false, "Pool closed underfilled", formatEventStamp(refund.createdAt))}
            {step(
              refund.state !== "requested",
              refund.state === "requested",
              "Refund approved",
              refund.state === "requested" ? "waiting on second approval" : "approved by ops",
            )}
            {step(
              isPaid,
              refund.state === "processing",
              refund.method === "credit" ? "Added to your credit" : "Sent to your bank",
              refund.paidAt ? formatEventStamp(refund.paidAt) : "usually under an hour",
            )}
          </div>
        </div>

        <div className="px-5 py-5">
          <div className="flex justify-between items-baseline">
            <span className="text-[15px] text-text-dim">Refund amount</span>
            <span className="font-display text-[30px]">{formatKobo(refund.amountKobo)}</span>
          </div>
          <div className="font-mono text-[12.5px] text-text-dim mt-1">
            {refund.method === "credit" ? "AS STORE CREDIT" : "TO YOUR BANK ACCOUNT"} · REF{" "}
            {refund.reference}
          </div>

          {!isPaid && refund.method === "bank" && (
            <div className="mt-4">
              <RefundAsCreditForm refundId={refund.id} />
              <p className="font-mono text-[11px] text-text-dim mt-2 leading-relaxed">
                Store credit lands instantly and comes off your next slot.
              </p>
            </div>
          )}
        </div>

        <div className="mt-auto px-5 py-5 border-t border-ink">
          <p className="text-[14px] leading-relaxed text-text-mid mb-3">
            We open a pool like this most weeks. Nothing was charged beyond what is being returned.
          </p>
          <Btn href={`/${pool?.areaSlug ?? "abuja"}/pools`} block size="lg">
            See what is open now
          </Btn>
        </div>
      </PhoneShell>
    </div>
  );
}
