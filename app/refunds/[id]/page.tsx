import { PhoneShell } from "@/components/nav";
import { Btn, Tag } from "@/components/ui";
import { formatNaira } from "@/lib/mock-data";

export const metadata = { title: "Refund tracker" };

export default async function RefundTrackerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="bg-[#8E8C86] min-h-screen py-6">
      <PhoneShell
        title={`#${id.toUpperCase()} cancelled`}
        eyebrow={<Tag tone="rust">REFUNDING</Tag>}
      >
        <div className="px-5 py-6 border-b border-ink">
          <h2 className="font-display text-[27px] sm:text-[30px] tracking-tight leading-tight mb-2.5">
            The pool did not fill. Your money is on its way back.
          </h2>
          <p className="text-[15px] leading-relaxed text-text-mid">
            19 people joined and we needed 40 to make the price work. We did not buy anything, so
            there is nothing to split. {formatNaira(11500)} is going back to the account you paid
            from.
          </p>
        </div>
        <div className="px-5 py-5 border-b border-ink">
          <div className="font-mono text-[11.5px] text-text-dim mb-3.5">
            REFUND, PROMISED WITHIN 24 HOURS
          </div>
          <div className="flex flex-col gap-3.5">
            <div className="flex gap-3">
              <div className="w-[18px] h-[18px] bg-ink text-lime text-[11px] flex items-center justify-center flex-shrink-0">
                ✓
              </div>
              <div>
                <div className="text-[15px] font-semibold">Pool closed underfilled</div>
                <div className="font-mono text-[12px] text-text-dim">Wed 17:00</div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-[18px] h-[18px] bg-ink text-lime text-[11px] flex items-center justify-center flex-shrink-0">
                ✓
              </div>
              <div>
                <div className="text-[15px] font-semibold">Refund approved by two people</div>
                <div className="font-mono text-[12px] text-text-dim">Wed 17:42</div>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-[18px] h-[18px] border border-ink hatch-unpaid flex-shrink-0" />
              <div>
                <div className="text-[15px] font-semibold">Sent to your bank</div>
                <div className="font-mono text-[12px] text-text-dim">Wed 17:44 · usually under an hour</div>
              </div>
            </div>
          </div>
        </div>
        <div className="px-5 py-5">
          <div className="flex justify-between items-baseline">
            <span className="text-[15px] text-text-dim">Refund amount</span>
            <span className="font-display text-[30px]">{formatNaira(11500)}</span>
          </div>
          <div className="font-mono text-[12.5px] text-text-dim mt-1">TO STERLING ····4402 · REF R-88510</div>
        </div>
        <div className="mt-auto px-5 py-5 border-t border-ink">
          <p className="text-[14px] leading-relaxed text-text-mid mb-3">
            The Wuse hub has a 50 slot pool opening Monday at the same price. Nineteen of you are
            already interested.
          </p>
          <Btn block size="lg">
            Tell me when it opens
          </Btn>
        </div>
      </PhoneShell>
    </div>
  );
}
