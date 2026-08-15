import { notFound } from "next/navigation";

import { PhoneShell } from "@/components/nav";
import { Btn } from "@/components/ui";
import { requireMember } from "@/lib/auth/dal";
import { getOwnedCommitment } from "@/lib/domain/commitments";
import { getHub, getPool } from "@/lib/domain/pools";
import { formatKobo } from "@/lib/money";

export const metadata = { title: "Collection pass" };

export default async function CollectionPassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await requireMember(`/collections/${id}/pass`);

  const commitment = await getOwnedCommitment(id, member.id);
  if (!commitment) notFound();

  const [hub, pool] = await Promise.all([getHub(commitment.hubId), getPool(commitment.poolId)]);

  return (
    <div className="bg-[#8E8C86] min-h-screen py-6">
      <PhoneShell title="Collection pass" eyebrow="WORKS OFFLINE">
        <div className="px-5 py-6 text-center border-b border-ink">
          <div className="font-mono text-[11.5px] text-text-dim mb-1">READ THIS TO THE AGENT</div>
          <div className="font-display text-[64px] sm:text-[72px] tracking-[.06em] leading-tight">
            {commitment.collectionCode ?? "····"}
          </div>
          {commitment.state === "collected" && (
            <div className="font-mono text-[12px] bg-ink text-lime inline-block px-2.5 py-1 mt-2">
              ALREADY COLLECTED
            </div>
          )}
        </div>

        <div className="px-5 py-5">
          <div className="font-display text-[22px] sm:text-[24px] tracking-tight leading-tight mb-3.5">
            {commitment.hubName}
            <br />
            {commitment.shareDateLabel}
            {commitment.windowLabel ? `, ${commitment.windowLabel}` : ""}
          </div>

          <div className="flex flex-col gap-2 text-[14.5px]">
            <div className="flex justify-between pb-2 border-b border-rule">
              <span className="text-text-dim">Pool</span>
              <span className="font-semibold">
                {commitment.poolTitle} · #{commitment.poolCode}
              </span>
            </div>
            <div className="flex justify-between pb-2 border-b border-rule">
              <span className="text-text-dim">Your portion</span>
              <span className="font-semibold text-right">
                {commitment.slots} × {commitment.unitDescription}
              </span>
            </div>
            <div className="flex justify-between pb-2 border-b border-rule">
              <span className="text-text-dim">Paid</span>
              <span className="font-semibold font-mono">{formatKobo(commitment.paidKobo)}</span>
            </div>
            {hub && (
              <div className="flex justify-between gap-3">
                <span className="text-text-dim flex-shrink-0">Landmark</span>
                <span className="font-semibold text-right">
                  {hub.landmark || hub.address}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-auto px-5 py-5 border-t border-ink">
          {pool?.toleranceBand && (
            <p className="text-[14px] leading-relaxed text-text-mid mb-3">
              Watch the scale. Tolerance on this pool is {pool.toleranceBand}, and anything under
              is credited to you before you leave.
            </p>
          )}
          <div className="flex gap-2">
            <Btn
              href={`/${commitment.hubId ? pool?.areaSlug ?? "abuja" : "abuja"}/hubs`}
              variant="outline"
              size="md"
              block
            >
              Hub details
            </Btn>
            {commitment.state !== "collected" && (
              <Btn href={`/collections/${commitment.id}/book`} variant="dark" size="md" block>
                Change my window
              </Btn>
            )}
          </div>
        </div>
      </PhoneShell>
    </div>
  );
}
