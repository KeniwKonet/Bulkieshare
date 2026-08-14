import { PhoneShell } from "@/components/nav";
import { Tag } from "@/components/ui";

export const metadata = { title: "Dispute tracker" };

export default async function DisputeTrackerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="bg-[#8E8C86] min-h-screen py-6">
      <PhoneShell title={`Dispute #${id.toUpperCase()}`} eyebrow="OPENED TODAY">
        <div className="px-5 py-6 border-b border-ink">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-[17px] font-bold">The quality was bad or it had spoiled</span>
          </div>
          <Tag tone="amber">SLA 48H · 3H 12M ELAPSED</Tag>
          <p className="text-[15px] leading-relaxed text-text-mid mt-3.5">
            Pool #A-2190, Kuje hub. We have logged your report along with the photo you attached
            and matched it against the hub handover record for your code.
          </p>
        </div>
        <div className="px-5 py-5">
          <div className="font-mono text-[11.5px] text-text-dim mb-3.5">WHAT HAPPENS NEXT</div>
          <div className="flex flex-col gap-3.5">
            <div className="flex gap-3">
              <div className="w-[18px] h-[18px] bg-ink text-lime text-[11px] flex items-center justify-center flex-shrink-0">
                ✓
              </div>
              <div>
                <div className="text-[15px] font-semibold">Received</div>
                <div className="font-mono text-[12px] text-text-dim">Today, 09:14</div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-[18px] h-[18px] border border-ink hatch-unpaid flex-shrink-0" />
              <div>
                <div className="text-[15px] font-semibold">Under review by support</div>
                <div className="font-mono text-[12px] text-text-dim">usually inside 24 hours</div>
              </div>
            </div>
            <div className="flex gap-3 opacity-45">
              <div className="w-[18px] h-[18px] border border-ink flex-shrink-0" />
              <div>
                <div className="text-[15px] font-semibold">Resolved</div>
                <div className="font-mono text-[12px] text-text-dim">
                  credit, refund or replacement, in writing
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-auto px-5 py-5 border-t border-ink">
          <p className="font-mono text-[11.5px] leading-relaxed text-text-dim">
            Outcomes are credit, a cash refund or a replacement in the next pool. We tell you
            which and why, in writing.
          </p>
        </div>
      </PhoneShell>
    </div>
  );
}
