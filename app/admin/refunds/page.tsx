import { OpsHeader } from "@/components/nav";
import { Btn, GridTable } from "@/components/ui";

export const metadata = { title: "Refund queue" };

const DESTINATIONS: [string, string, string, string][] = [
  ["Tolu Okafor", "₦11,500", "1", "matched"],
  ["Gwarinpa Coop (coordinator)", "₦46,000", "4", "matched"],
  ["Musa Danjuma", "₦23,000", "2", "no account on file"],
  ["14 others", "₦138,000", "12", "all matched"],
];

export default function RefundQueuePage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="refunds" />
      <div className="max-w-4xl mx-auto px-5 sm:px-8 py-8">
        <div className="bg-rust-dark text-white px-5 py-3 flex flex-wrap justify-between gap-2 font-mono text-[12px] -mx-5 sm:-mx-8 mb-6">
          <span className="px-5 sm:px-8">REFUND QUEUE · SLA 24H FROM POOL CANCELLATION</span>
          <span className="px-5 sm:px-8">OLDEST: 6H 22M ELAPSED</span>
        </div>

        <h1 className="font-display text-[26px] tracking-tight mb-1.5">
          A-2226 Catfish · 19 members · ₦218,500
        </h1>
        <p className="text-[15px] leading-relaxed text-text-dim mb-5">
          19 of 50 slots paid against a threshold of 40. Shortfall policy on this pool is cancel,
          snapshotted when the pool opened, so it cannot be argued about now.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-rule border border-rule mb-5">
          <div className="bg-card p-3.5">
            <div className="font-mono text-[10.5px] text-text-dim">TO REFUND</div>
            <div className="text-[17px] font-bold">₦218,500</div>
          </div>
          <div className="bg-card p-3.5">
            <div className="font-mono text-[10.5px] text-text-dim">PAYERS</div>
            <div className="text-[17px] font-bold">17 accounts</div>
          </div>
          <div className="bg-card p-3.5">
            <div className="font-mono text-[10.5px] text-text-dim">VIA COORDINATOR</div>
            <div className="text-[17px] font-bold">2 of 17</div>
          </div>
          <div className="bg-card p-3.5">
            <div className="font-mono text-[10.5px] text-text-dim">SLA REMAINING</div>
            <div className="text-[17px] font-bold text-rust-dark">17h 38m</div>
          </div>
        </div>

        <div className="border border-ink bg-card p-4.5 mb-5">
          <div className="font-mono text-[11px] text-text-dim mb-2.5">
            APPROVALS · TWO DIFFERENT USERS REQUIRED
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 border border-green p-3">
              <div className="text-[14.5px] font-semibold">A. Nwosu, finance</div>
              <div className="font-mono text-[11.5px] text-green">APPROVED 17:42</div>
            </div>
            <div className="flex-1 border border-dashed border-rust-dark p-3">
              <div className="text-[14.5px] font-semibold">Second approver</div>
              <div className="font-mono text-[11.5px] text-rust-dark">WAITING · YOU CAN APPROVE</div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5 mb-2">
          <Btn variant="dark" size="lg">
            Approve and run 19 refunds
          </Btn>
          <Btn variant="outline" size="lg">
            Company absorbs and buys anyway
          </Btn>
        </div>
        <p className="font-mono text-[11px] leading-relaxed text-text-dim mb-8">
          Absorbing needs a written reason and goes to the founder queue. It has been used once,
          on a pool 2 slots short of 40.
        </p>

        <div className="font-mono text-[11.5px] text-text-dim mb-2.5">DESTINATION CHECK, BEFORE YOU APPROVE</div>
        <GridTable
          columns="1.3fr 1fr .9fr 1.1fr"
          headers={["PAYER", "AMOUNT", "SLOTS", "NAME MATCH"]}
          rows={DESTINATIONS.map(([payer, amount, slots, match]) => [
            payer,
            amount,
            slots,
            <span key="m" className={match.includes("no account") ? "text-rust-dark" : "text-green"}>
              {match}
            </span>,
          ])}
        />
        <p className="text-[14.5px] leading-relaxed text-text-dim mt-4">
          Musa paid by card, so his refund reverses to the card and takes up to five working days.
          The SLA clock still shows 24 hours because that is when we send it, and his screen says
          the same thing.
        </p>
      </div>
    </div>
  );
}
