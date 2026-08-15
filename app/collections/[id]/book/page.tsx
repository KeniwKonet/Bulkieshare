import { notFound } from "next/navigation";

import { BookWindowForm } from "@/components/forms";
import { PhoneShell } from "@/components/nav";
import { requireMember } from "@/lib/auth/dal";
import { getOwnedCommitment, listCollectionWindows } from "@/lib/domain/commitments";
import { getHub } from "@/lib/domain/pools";

export const metadata = { title: "Book a collection window" };

export default async function BookWindowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await requireMember(`/collections/${id}/book`);

  const commitment = await getOwnedCommitment(id, member.id);
  if (!commitment) notFound();

  const [slots, hub] = await Promise.all([
    listCollectionWindows(commitment.poolId),
    getHub(commitment.hubId),
  ]);
  if (!slots) notFound();

  const windows = slots.windows.map((w) => ({
    iso: w.at.toISOString(),
    label: w.label,
    isFull: w.isFull,
    booked: w.booked,
    capacity: w.capacity,
  }));

  return (
    <div className="bg-[#8E8C86] min-h-screen py-6">
      <PhoneShell
        title="Book collection"
        eyebrow={`#${commitment.poolCode} · ${commitment.hubName.toUpperCase()}`}
      >
        <div className="px-5 pt-6 pb-4">
          <h2 className="font-display text-[26px] sm:text-[28px] tracking-tight leading-tight mb-2">
            {commitment.shareDateLabel} at {commitment.hubName}
          </h2>
          <p className="text-[15px] leading-relaxed text-text-dim mb-4.5">
            Pick a twenty minute window. The hub handles {hub?.capacityPerHour ?? 20} handovers an
            hour, so a crossed-out window means somebody else got there first.
          </p>

          <BookWindowForm
            commitmentId={commitment.id}
            windows={windows}
            currentWindowIso={commitment.windowAt?.toISOString() ?? null}
          />
        </div>

        <div className="mt-auto px-5 py-5 border-t border-ink">
          <p className="text-[14.5px] leading-relaxed text-text-mid">
            Your {commitment.slots} slot{commitment.slots === 1 ? " is" : "s are"} handed over
            together in one window. Others need their own window only if they are coming
            separately.
          </p>
        </div>
      </PhoneShell>
    </div>
  );
}
