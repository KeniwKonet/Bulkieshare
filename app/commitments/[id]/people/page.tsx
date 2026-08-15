import { notFound } from "next/navigation";

import { NameSlotForm } from "@/components/forms";
import { AppHeader } from "@/components/nav";
import { requireMember } from "@/lib/auth/dal";
import { getOwnedCommitment, listBeneficiaries } from "@/lib/domain/commitments";
import { formatKobo } from "@/lib/money";
import { formatPhone } from "@/lib/phone";

export const metadata = { title: "Who collects" };

export default async function BeneficiariesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await requireMember(`/commitments/${id}/people`);

  const commitment = await getOwnedCommitment(id, member.id);
  if (!commitment) notFound();

  const beneficiaries = await listBeneficiaries(commitment.id);
  const named = beneficiaries.filter((b) => b.name).length;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader
        crumb={`#${commitment.poolCode} / ${commitment.slots} SLOTS / WHO COLLECTS`}
      />
      <div className="bg-lime px-5 sm:px-8 py-3.5 border-b border-ink flex flex-wrap justify-between items-center gap-2">
        <span className="text-[16px] font-semibold">
          {formatKobo(commitment.paidKobo)} received. {commitment.slots} slot
          {commitment.slots === 1 ? "" : "s"} confirmed.
        </span>
        <span className="font-mono text-[12.5px]">
          {named} OF {commitment.slots} NAMED
        </span>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.4fr_1fr]">
        <div className="px-5 sm:px-8 py-8 lg:border-r border-ink">
          <h1 className="font-display text-[30px] sm:text-[34px] tracking-tight mb-1.5">
            Name the people collecting
          </h1>
          <p className="text-[15.5px] text-text-dim leading-relaxed max-w-[58ch] mb-6">
            Each person gets their own code and their own share day message, so nobody has to stand
            at the hub holding several codes. You can change these names until the pool locks.
          </p>

          <div className="flex flex-col gap-3">
            {beneficiaries.map((b) => (
              <div key={b.id} className="border border-ink bg-card p-4">
                <div className="flex justify-between items-center mb-2.5 gap-3 flex-wrap">
                  <span className="font-mono text-[12px] text-text-dim">
                    SLOT {String(b.slotIndex).padStart(2, "0")}
                    {b.isPayer && " · YOU"}
                  </span>
                  <span className="font-mono text-[13px] font-semibold">
                    {b.name ? `CODE ${b.code}` : "code issued once named"}
                  </span>
                </div>

                {b.name && !b.isPayer && (
                  <div className="font-mono text-[12px] text-text-dim mb-2">
                    {b.phone ? formatPhone(b.phone) : "no phone number yet"}
                  </div>
                )}

                <NameSlotForm
                  commitmentId={commitment.id}
                  slotIndex={b.slotIndex}
                  defaultName={b.name}
                  defaultPhone={b.phone}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 sm:px-8 py-8">
          <div className="border border-ink bg-ink text-paper p-5 mb-4">
            <div className="font-mono text-[11.5px] text-dark-dim-2 mb-2">
              ONE THING TO BE CLEAR ABOUT
            </div>
            <p className="text-[15px] leading-relaxed text-dark-dim">
              If this pool is cancelled, all {formatKobo(commitment.paidKobo)} goes back to{" "}
              <b className="text-paper">your</b> account, not split between the group. You collected
              the cash, so you return it. This is also in the terms you agreed to.
            </p>
          </div>

          <div className="border border-ink bg-card p-5">
            <div className="text-[16px] font-bold mb-3">What each person will receive</div>
            <p className="text-[14.5px] leading-relaxed text-text-dim mb-3">
              A WhatsApp message with their code, their 20 minute window, and what to bring.
            </p>
            <div className="bg-paper border border-rule p-3.5 text-[14px] leading-relaxed">
              <div className="font-mono text-[11px] text-text-dim mb-1.5">PREVIEW</div>
              {beneficiaries[1]?.name || "Your friend"}, {member.name || "a member"} bought you a
              share of the {commitment.poolTitle.toLowerCase()} pool. Collect at{" "}
              {commitment.hubName} on {commitment.shareDateLabel}
              {commitment.windowLabel ? ` at ${commitment.windowLabel}` : ""}. Your code is{" "}
              {beneficiaries[1]?.code ?? "····"}. Bring a cooler if you have one.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
