import { DisputeForm } from "@/components/forms";
import { PhoneShell } from "@/components/nav";
import { requireMember } from "@/lib/auth/dal";
import { listMemberCommitments } from "@/lib/domain/commitments";

export const metadata = { title: "Report a problem" };

export default async function NewDisputePage({
  searchParams,
}: {
  searchParams: Promise<{ commitment?: string }>;
}) {
  const { commitment } = await searchParams;
  const member = await requireMember("/disputes/new");

  // Only pools they actually collected (or should have) can be disputed.
  const commitments = (await listMemberCommitments(member.id)).filter(
    (c) => c.state !== "refunded" && c.poolState !== "open",
  );

  return (
    <div className="bg-[#8E8C86] min-h-screen py-6">
      <PhoneShell title="Report a problem" eyebrow="48H SLA">
        <div className="px-5 py-6">
          <h2 className="font-display text-[25px] sm:text-[27px] tracking-tight leading-tight mb-2">
            What went wrong?
          </h2>
          <p className="text-[15px] leading-relaxed text-text-dim mb-4.5">
            Pick the closest one. We answer within 48 hours and you can watch the clock.
          </p>

          <DisputeForm
            commitments={commitments.map((c) => ({
              id: c.id,
              label: `${c.poolTitle} · #${c.poolCode} · ${c.shareDateLabel}`,
            }))}
            defaultCommitmentId={commitment}
          />
        </div>

        <div className="mt-auto px-5 py-5 border-t border-ink">
          <p className="font-mono text-[11.5px] leading-relaxed text-text-dim">
            Outcomes are credit, a cash refund or a replacement in the next pool. We tell you which
            and why, in writing.
          </p>
        </div>
      </PhoneShell>
    </div>
  );
}
