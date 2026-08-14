import { OpsHeader } from "@/components/nav";
import { Btn } from "@/components/ui";
import { Stepper } from "@/components/interactive";

export const metadata = { title: "Open a pool" };

export default function NewPoolPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="pools" />
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-8">
        <h1 className="font-display text-[28px] tracking-tight mb-1">Pool builder</h1>
        <p className="text-[15px] text-text-dim mb-6">
          Policy snapshot, threshold, shortfall rule and quote expiry constraint — set once, then
          locked to this pool for its whole life.
        </p>

        <div className="border border-ink bg-card p-5 mb-5">
          <div className="font-mono text-[11.5px] text-text-dim mb-3">SOURCE QUOTE</div>
          <div className="flex justify-between text-[15px] py-2 border-b border-rule-card">
            <span className="text-text-dim">Supplier</span>
            <span className="font-semibold">Kuje Livestock Aggregators</span>
          </div>
          <div className="flex justify-between text-[15px] py-2 border-b border-rule-card">
            <span className="text-text-dim">Quote price</span>
            <span className="font-mono font-semibold">₦271,500 / head</span>
          </div>
          <div className="flex justify-between text-[15px] py-2">
            <span className="text-text-dim">Quote expires</span>
            <span className="font-mono font-semibold text-rust">28 Aug 2026</span>
          </div>
        </div>

        <div className="border border-ink bg-card p-5 mb-5">
          <div className="font-mono text-[11.5px] text-text-dim mb-3">POOL PARAMETERS</div>
          <div className="flex justify-between items-center py-2.5 border-b border-rule-card">
            <span className="text-[15px] font-semibold">Total slots</span>
            <Stepper min={10} max={60} />
          </div>
          <div className="flex justify-between items-center py-2.5 border-b border-rule-card">
            <span className="text-[15px] font-semibold">Threshold to proceed</span>
            <Stepper min={10} max={40} />
          </div>
          <div className="flex justify-between items-center py-2.5">
            <span className="text-[15px] font-semibold">Closes before quote expires by</span>
            <span className="font-mono text-[14px]">36 hours minimum</span>
          </div>
        </div>

        <div className="border border-amber bg-card p-4 mb-6 text-[14px] leading-relaxed">
          Closing time must land before 28 Aug — the quote expiry. The pool builder will not let
          you save a closing time after that date.
        </div>

        <Btn variant="dark" size="lg">
          Save and open the pool
        </Btn>
      </div>
    </div>
  );
}
