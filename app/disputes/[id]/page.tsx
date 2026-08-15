import { notFound } from "next/navigation";

import { PhoneShell } from "@/components/nav";
import { Tag } from "@/components/ui";
import { requireMember } from "@/lib/auth/dal";
import { getDispute } from "@/lib/domain/support";
import { formatKobo } from "@/lib/money";
import { formatEventStamp } from "@/lib/time";

export const metadata = { title: "Dispute tracker" };

export default async function DisputeTrackerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await requireMember(`/disputes/${id}`);

  const dispute = await getDispute(id);
  // Members see only their own; ops has its own screen for all of them.
  if (!dispute) notFound();
  if (dispute.memberId !== member.id && member.role !== "ops" && member.role !== "admin") {
    notFound();
  }

  const isClosed = dispute.state === "resolved" || dispute.state === "rejected";

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
        title={`Dispute ${dispute.reference}`}
        eyebrow={formatEventStamp(dispute.createdAt)}
      >
        <div className="px-5 py-6 border-b border-ink">
          <div className="text-[17px] font-bold mb-2">{dispute.reasonLabel}</div>

          {isClosed ? (
            <Tag tone={dispute.state === "resolved" ? "green" : "outline"}>
              {dispute.state.toUpperCase()}
            </Tag>
          ) : (
            <Tag tone={dispute.breaching ? "rust" : "amber"}>
              SLA 48H · {dispute.breaching ? "BREACHING" : dispute.slaLabel.toUpperCase()}
            </Tag>
          )}

          <p className="text-[15px] leading-relaxed text-text-mid mt-3.5">
            {dispute.poolCode ? `Pool #${dispute.poolCode}` : "No specific pool"}
            {dispute.hubName ? `, ${dispute.hubName}` : ""}. {dispute.detail}
          </p>
        </div>

        <div className="px-5 py-5">
          <div className="font-mono text-[11.5px] text-text-dim mb-3.5">WHAT HAPPENS NEXT</div>
          <div className="flex flex-col gap-3.5">
            {step(true, false, "Received", formatEventStamp(dispute.createdAt))}
            {step(
              dispute.state !== "open",
              dispute.state === "open",
              "Under review by support",
              "usually inside 24 hours",
            )}
            {step(
              isClosed,
              dispute.state === "investigating",
              dispute.state === "rejected" ? "Closed" : "Resolved",
              dispute.resolvedAt
                ? formatEventStamp(dispute.resolvedAt)
                : "credit, refund or replacement, in writing",
            )}
          </div>

          {dispute.resolution && (
            <div className="border border-ink bg-card p-4 mt-5">
              <div className="font-mono text-[11.5px] text-text-dim mb-1.5">WHAT WE DECIDED</div>
              <p className="text-[14.5px] leading-relaxed">{dispute.resolution}</p>
              {dispute.resolvedCreditKobo ? (
                <div className="bg-lime border border-ink px-3 py-2.5 mt-3 flex justify-between items-center">
                  <span className="text-[14.5px] font-semibold">Credited to you</span>
                  <span className="font-display text-[22px]">
                    {formatKobo(dispute.resolvedCreditKobo)}
                  </span>
                </div>
              ) : null}
            </div>
          )}
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
