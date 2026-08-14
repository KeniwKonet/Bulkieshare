import { OpsHeader } from "@/components/nav";

export const metadata = { title: "Daily reconciliation" };

export default function ReconciliationPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="reconciliation" />
      <div className="max-w-2xl mx-auto px-5 sm:px-8 py-8">
        <div className="flex justify-between items-center mb-5">
          <h1 className="font-display text-[26px] tracking-tight">Daily reconciliation</h1>
          <span className="font-mono text-[11.5px] text-green">MON 12 AUG · BALANCED</span>
        </div>

        <div className="border border-ink bg-card font-mono text-[13.5px] mb-5">
          <div className="flex justify-between px-4 py-2.5 border-b border-rule-card">
            <span>PSP settlement received</span>
            <span>₦486,200</span>
          </div>
          <div className="flex justify-between px-4 py-2.5 border-b border-rule-card">
            <span>Ledger credits, same window</span>
            <span>₦486,200</span>
          </div>
          <div className="flex justify-between px-4 py-2.5 border-b border-rule-card">
            <span>PSP fees charged</span>
            <span>₦7,293</span>
          </div>
          <div className="flex justify-between px-4 py-2.5 border-b border-rule-card">
            <span>Refunds sent</span>
            <span>₦0</span>
          </div>
          <div className="flex justify-between px-4 py-3 bg-paper">
            <span>Drift</span>
            <span className="text-green">₦0.00</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-ink border border-ink">
          <div className="bg-ink text-paper px-4 py-3.5">
            <div className="font-mono text-[10.5px] text-dark-dim-2">AVAILABLE TO SPEND</div>
            <div className="font-display text-[26px]">₦4.12M</div>
            <div className="font-mono text-[10.5px] text-dark-dim-2">ESCROW EXCLUDED</div>
          </div>
          <div className="bg-card px-4 py-3.5">
            <div className="font-mono text-[10.5px] text-text-dim">NOT OURS, MEMBERS&apos; MONEY</div>
            <div className="font-display text-[26px]">₦1.88M</div>
            <div className="font-mono text-[10.5px] text-text-dim">9 OPEN POOLS</div>
          </div>
        </div>

        <p className="text-[14.5px] leading-relaxed text-text-dim mt-5">
          The big number on this page is deliberately the one with escrow taken out. Nobody in
          the company ever sees a cash figure that includes members&apos; money, which is the
          whole point.
        </p>
      </div>
    </div>
  );
}
