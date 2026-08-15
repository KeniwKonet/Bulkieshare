import { notFound } from "next/navigation";

import { PhoneShell } from "@/components/nav";
import { Btn, PhotoPlaceholder } from "@/components/ui";
import { requireMember } from "@/lib/auth/dal";
import { getOwnedCommitment } from "@/lib/domain/commitments";
import { getPool, getPoolReport } from "@/lib/domain/pools";
import { listCreditMovements } from "@/lib/domain/support";
import { formatBasisPoints, formatKg, formatKobo } from "@/lib/money";
import { formatShortDate } from "@/lib/time";

export const metadata = { title: "Settlement" };

export default async function SettlementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await requireMember(`/commitments/${id}/settlement`);

  const commitment = await getOwnedCommitment(id, member.id);
  if (!commitment) notFound();

  const [pool, report, credits] = await Promise.all([
    getPool(commitment.poolId),
    getPoolReport(commitment.poolId),
    listCreditMovements(member.id),
  ]);

  // Any credit written against this pool is the yield adjustment for it.
  const poolCredit = credits
    .filter((c) => c.poolId === commitment.poolId && c.amountKobo > 0)
    .reduce((sum, c) => sum + c.amountKobo, 0);

  const nominalPerSlot = report?.nominalWeightGrams
    ? report.nominalWeightGrams / (pool?.totalSlots ?? 1)
    : null;
  const actualPerSlot = report?.usableWeightGrams
    ? report.usableWeightGrams / (pool?.totalSlots ?? 1)
    : null;

  const under = report ? report.yieldVarianceBasisPoints < 0 : false;

  return (
    <div className="bg-[#8E8C86] min-h-screen py-6">
      <PhoneShell
        title={`#${commitment.poolCode} complete`}
        eyebrow={formatShortDate(commitment.shareDate).toUpperCase()}
      >
        <div className="px-5 py-6 border-b border-ink">
          {report && nominalPerSlot && actualPerSlot ? (
            <>
              <h2 className="font-display text-[27px] sm:text-[30px] tracking-tight leading-tight mb-2.5">
                Your portion came to {formatKg(actualPerSlot)}, against{" "}
                {formatKg(nominalPerSlot)} nominal.
              </h2>
              <p className="text-[15px] leading-relaxed text-text-mid mb-4.5">
                {under
                  ? `The animal dressed out lighter than the farm weight suggested. That is ${formatBasisPoints(Math.abs(report.yieldVarianceBasisPoints))} under nominal, so we credited the difference. You did not have to ask.`
                  : `That is ${formatBasisPoints(report.yieldVarianceBasisPoints)} over nominal, inside the band we published. Nothing to settle, and you keep the extra.`}
              </p>
            </>
          ) : (
            <>
              <h2 className="font-display text-[27px] sm:text-[30px] tracking-tight leading-tight mb-2.5">
                This pool is settled.
              </h2>
              <p className="text-[15px] leading-relaxed text-text-mid mb-4.5">
                The full weight report for {commitment.poolTitle} is not published yet. It lands
                within a day of the last handover.
              </p>
            </>
          )}

          {poolCredit > 0 && (
            <div className="bg-lime border border-ink px-4 py-3.5 flex justify-between items-center">
              <span className="text-[15px] font-semibold">Credited to you</span>
              <span className="font-display text-[30px]">{formatKobo(poolCredit)}</span>
            </div>
          )}
        </div>

        {report && (
          <div className="px-5 py-5">
            <div className="font-mono text-[11.5px] text-text-dim mb-3">HOW WE GOT THERE</div>
            <div className="flex flex-col font-mono text-[13.5px]">
              {report.liveWeightGrams && (
                <div className="flex justify-between py-2 border-b border-rule">
                  <span>Live weight at intake</span>
                  <span>{formatKg(report.liveWeightGrams)}</span>
                </div>
              )}
              {report.usableWeightGrams && (
                <div className="flex justify-between py-2 border-b border-rule">
                  <span>Usable after butchering</span>
                  <span>{formatKg(report.usableWeightGrams)} total</span>
                </div>
              )}
              {report.nominalWeightGrams && pool && (
                <div className="flex justify-between py-2 border-b border-rule">
                  <span>
                    Nominal, {pool.totalSlots} × {formatKg(report.nominalWeightGrams / pool.totalSlots)}
                  </span>
                  <span>{formatKg(report.nominalWeightGrams)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b border-rule">
                <span>Variance</span>
                <span className={under ? "text-rust" : ""}>
                  {report.yieldVarianceBasisPoints >= 0 ? "+" : "−"}
                  {formatBasisPoints(Math.abs(report.yieldVarianceBasisPoints))}
                </span>
              </div>
              {actualPerSlot && (
                <div className="flex justify-between py-2">
                  <span>Your weighed portion</span>
                  <span>
                    {commitment.slots > 1
                      ? `${commitment.slots} × ${formatKg(actualPerSlot)}`
                      : formatKg(actualPerSlot)}
                  </span>
                </div>
              )}
            </div>

            <PhotoPlaceholder
              caption="your portion on the scale at handover"
              height={96}
              className="mt-4"
            />
          </div>
        )}

        <div className="mt-auto px-5 py-5 border-t border-ink flex gap-2">
          <Btn
            href={`/disputes/new?commitment=${commitment.id}`}
            variant="outline"
            size="md"
            block
          >
            Something is wrong
          </Btn>
          <Btn href="/account/credit" variant="dark" size="md" block>
            Use credit on a pool
          </Btn>
        </div>
      </PhoneShell>
    </div>
  );
}
