import { PhoneShell } from "@/components/nav";
import { Btn, PhotoPlaceholder } from "@/components/ui";
import { formatNaira } from "@/lib/mock-data";

export const metadata = { title: "Settlement" };

export default async function SettlementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const poolCode = id.split("-r")[0].toUpperCase();
  return (
    <div className="bg-[#8E8C86] min-h-screen py-6">
      <PhoneShell title={`#${poolCode} complete`} eyebrow="24 AUG">
        <div className="px-5 py-6 border-b border-ink">
          <h2 className="font-display text-[27px] sm:text-[30px] tracking-tight leading-tight mb-2.5">
            Your portion came to 2.28kg, not 2.50kg.
          </h2>
          <p className="text-[15px] leading-relaxed text-text-mid mb-4.5">
            The animal dressed out lighter than the farm weight suggested. That is 8.8% under
            nominal, outside the ±8% band we published, so we have credited the difference. You
            did not have to ask.
          </p>
          <div className="bg-lime border border-ink px-4 py-3.5 flex justify-between items-center">
            <span className="text-[15px] font-semibold">Credited to you</span>
            <span className="font-display text-[30px]">{formatNaira(740)}</span>
          </div>
        </div>
        <div className="px-5 py-5">
          <div className="font-mono text-[11.5px] text-text-dim mb-3">HOW WE GOT THERE</div>
          <div className="flex flex-col font-mono text-[13.5px]">
            <div className="flex justify-between py-2 border-b border-rule">
              <span>Live weight at intake</span>
              <span>57.4kg</span>
            </div>
            <div className="flex justify-between py-2 border-b border-rule">
              <span>Usable after butchering</span>
              <span>91.2kg total</span>
            </div>
            <div className="flex justify-between py-2 border-b border-rule">
              <span>Nominal, 40 × 2.5kg</span>
              <span>100.0kg</span>
            </div>
            <div className="flex justify-between py-2 border-b border-rule">
              <span>Variance</span>
              <span className="text-rust">−8.8%</span>
            </div>
            <div className="flex justify-between py-2">
              <span>Your weighed portion</span>
              <span>2.28kg</span>
            </div>
          </div>
          <PhotoPlaceholder
            caption="your portion on the scale, 2.28kg readout, taken at handover"
            height={96}
            className="mt-4"
          />
        </div>
        <div className="mt-auto px-5 py-5 border-t border-ink flex gap-2">
          <Btn href="/disputes/new" variant="outline" size="md" block>
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
