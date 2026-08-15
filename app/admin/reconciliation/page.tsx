import { OpsHeader } from "@/components/nav";
import { requireOps } from "@/lib/auth/dal";
import { getReconciliationSummary } from "@/lib/domain/ops";
import { listAllPools } from "@/lib/domain/pools";
import { formatKobo } from "@/lib/money";

export const metadata = { title: "Daily reconciliation" };

export default async function ReconciliationPage() {
  await requireOps();

  const [summary, pools] = await Promise.all([getReconciliationSummary(), listAllPools()]);

  // Money members have paid into pools that have not been bought against yet.
  const openPools = pools.filter((p) => p.state === "open" || p.state === "funded");
  const escrowKobo = openPools.reduce((sum, p) => sum + p.paidSlots * p.pricePerSlotKobo, 0);

  // What is genuinely ours: collected, less escrow, less what we owe out.
  const availableKobo =
    summary.money.collectedKobo -
    escrowKobo -
    summary.refundState.outstandingKobo -
    summary.owed.supplierOwedKobo -
    summary.creditOutstanding.kobo;

  const rows: [string, string, boolean?][] = [
    ["Payments settled, all time", formatKobo(summary.money.collectedKobo)],
    ["Payments still pending", formatKobo(summary.money.pendingKobo)],
    ["Held in pool escrow", formatKobo(escrowKobo)],
    ["Refunds outstanding", formatKobo(summary.refundState.outstandingKobo), true],
    ["Refunds already paid", formatKobo(summary.refundState.paidKobo)],
    ["Owed to suppliers", formatKobo(summary.owed.supplierOwedKobo), true],
    ["Paid to suppliers", formatKobo(summary.owed.supplierPaidKobo)],
    ["Member store credit outstanding", formatKobo(summary.creditOutstanding.kobo), true],
    ["Unmatched transfers unapplied", formatKobo(summary.unmatched.amountKobo), true],
  ];

  const balanced = summary.unmatched.n === 0;

  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="reconciliation" />
      <div className="max-w-2xl mx-auto px-5 sm:px-8 py-8">
        <div className="flex justify-between items-center mb-5 flex-wrap gap-2">
          <h1 className="font-display text-[26px] tracking-tight">Daily reconciliation</h1>
          <span className={`font-mono text-[11.5px] ${balanced ? "text-green" : "text-rust-dark"}`}>
            {balanced
              ? "BALANCED"
              : `${summary.unmatched.n} TRANSFER${summary.unmatched.n === 1 ? "" : "S"} UNAPPLIED`}
          </span>
        </div>

        <div className="border border-ink bg-card font-mono text-[13.5px] mb-5">
          {rows.map(([label, value, warn], i) => (
            <div
              key={label}
              className={`flex justify-between px-4 py-2.5 gap-3 ${
                i < rows.length - 1 ? "border-b border-rule-card" : ""
              }`}
            >
              <span>{label}</span>
              <span className={warn && value !== "₦0" ? "text-rust-dark" : ""}>{value}</span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-ink border border-ink">
          <div className="bg-ink text-paper px-4 py-3.5">
            <div className="font-mono text-[10.5px] text-dark-dim-2">AVAILABLE TO SPEND</div>
            <div className="font-display text-[26px]">{formatKobo(Math.max(0, availableKobo))}</div>
            <div className="font-mono text-[10.5px] text-dark-dim-2">
              ESCROW AND LIABILITIES EXCLUDED
            </div>
          </div>
          <div className="bg-card px-4 py-3.5">
            <div className="font-mono text-[10.5px] text-text-dim">
              NOT OURS, MEMBERS&apos; MONEY
            </div>
            <div className="font-display text-[26px]">{formatKobo(escrowKobo)}</div>
            <div className="font-mono text-[10.5px] text-text-dim">
              {openPools.length} OPEN POOL{openPools.length === 1 ? "" : "S"}
            </div>
          </div>
        </div>

        <p className="text-[14.5px] leading-relaxed text-text-dim mt-5">
          The big number on this page is deliberately the one with escrow taken out. Nobody in the
          company ever sees a cash figure that includes members&apos; money, which is the whole
          point.
        </p>
      </div>
    </div>
  );
}
