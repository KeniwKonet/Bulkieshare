import Link from "next/link";
import { OpsHeader } from "@/components/nav";
import { Btn, ProgressBar, StatGrid } from "@/components/ui";

export const metadata = { title: "Pool board" };

const ROWS: {
  pool: string;
  state: string;
  fillPct: number;
  fillLabel: string;
  closes: string;
  quoteExp: string;
  escrow: string;
  action: { label: string; tone: "outline" | "dark" | "rust" | "amber" };
  bad?: boolean;
}[] = [
  { pool: "A-2214 Ram · Lugbe", state: "open", fillPct: 90, fillLabel: "36/40", closes: "Fri 18:00", quoteExp: "Sat 12:00", escrow: "₦302,400", action: { label: "—", tone: "outline" } },
  { pool: "A-2231 Rice · Karu", state: "open", fillPct: 86, fillLabel: "12/14", closes: "Thu 18:00", quoteExp: "Fri 09:00", escrow: "₦744,000", action: { label: "EXTEND", tone: "outline" } },
  { pool: "A-2226 Catfish · Wuse", state: "underfilled", fillPct: 38, fillLabel: "19/50", closes: "closed", quoteExp: "expired", escrow: "₦218,500", action: { label: "REFUND", tone: "rust" }, bad: true },
  { pool: "A-2190 Cow · Kuje", state: "allocating", fillPct: 100, fillLabel: "40/40", closes: "none", quoteExp: "none", escrow: "₦0 released", action: { label: "ALLOCATE", tone: "dark" } },
  { pool: "A-2185 Beans · Karu", state: "distributing", fillPct: 100, fillLabel: "30/30", closes: "none", quoteExp: "none", escrow: "released", action: { label: "22 of 30 done", tone: "outline" } },
  { pool: "A-2244 Palm oil · Wuse", state: "open", fillPct: 45, fillLabel: "36/80", closes: "Tue 18:00", quoteExp: "Wed 12:00", escrow: "₦331,200", action: { label: "—", tone: "outline" } },
];

export default function PoolBoardPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <OpsHeader active="pools" />
      <StatGrid
        columns={5}
        items={[
          { label: "OPERATING CASH, EXCL. ESCROW", value: "₦4.12M" },
          { label: "HELD IN POOL ESCROW", value: "₦1.88M" },
          { label: "LEDGER BALANCE CHECK", value: "0.00", valueClassName: "text-green" },
          { label: "HOLD EXPIRY RATE, 7D", value: "18%" },
          { label: "UNMATCHED TRANSFERS", value: "6", valueClassName: "text-rust-dark" },
        ]}
      />
      <div className="px-5 sm:px-6 py-6">
        <div className="flex justify-between items-end mb-3.5 flex-wrap gap-3">
          <div>
            <h1 className="font-display text-[26px] sm:text-[28px] tracking-tight">Nine live pools</h1>
            <p className="text-[14.5px] text-text-dim mt-1">
              Two quotes expire before their pool closes. Those are the only two rows that need a
              decision today.
            </p>
          </div>
          <Btn href="/admin/pools/new" variant="dark" size="md">
            Open a pool
          </Btn>
        </div>

        <div className="border border-ink bg-card overflow-x-auto">
          <div className="grid grid-cols-[1.5fr_.9fr_1.2fr_.9fr_.9fr_1fr_.9fr] font-mono text-[11.5px] bg-ink text-dark-dim-2 min-w-[860px]">
            {["POOL", "STATE", "FILL", "CLOSES", "QUOTE EXP.", "ESCROW", "ACTION"].map((h) => (
              <div key={h} className="px-4 py-2.5">
                {h}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-[1.5fr_.9fr_1.2fr_.9fr_.9fr_1fr_.9fr] text-[13.5px] min-w-[860px]">
            {ROWS.map((r, i) => (
              <div key={r.pool} className="contents">
                <div className={`px-4 py-2.5 font-semibold ${r.bad ? "text-rust-dark" : ""} ${i < ROWS.length - 1 ? "border-b border-rule-card" : ""}`}>
                  {r.pool}
                </div>
                <div className={`px-4 py-2.5 font-mono ${r.bad ? "text-rust-dark" : ""} ${i < ROWS.length - 1 ? "border-b border-rule-card" : ""}`}>
                  {r.state}
                </div>
                <div className={`px-4 py-2.5 ${i < ROWS.length - 1 ? "border-b border-rule-card" : ""}`}>
                  <ProgressBar paidPct={r.fillPct} height={7} />
                  <span className="font-mono text-[11px] mt-0.5 inline-block">{r.fillLabel}</span>
                </div>
                <div className={`px-4 py-2.5 font-mono text-[12.5px] ${i < ROWS.length - 1 ? "border-b border-rule-card" : ""}`}>
                  {r.closes}
                </div>
                <div className={`px-4 py-2.5 font-mono text-[12.5px] ${r.quoteExp === "expired" ? "text-rust-dark" : ""} ${i < ROWS.length - 1 ? "border-b border-rule-card" : ""}`}>
                  {r.quoteExp}
                </div>
                <div className={`px-4 py-2.5 font-mono text-[12.5px] ${i < ROWS.length - 1 ? "border-b border-rule-card" : ""}`}>
                  {r.escrow}
                </div>
                <div className={`px-4 py-2.5 ${i < ROWS.length - 1 ? "border-b border-rule-card" : ""}`}>
                  <Link
                    href={
                      r.action.label === "ALLOCATE"
                        ? "/admin/pools/a-2190/allocation"
                        : r.action.label === "REFUND"
                          ? "/admin/refunds"
                          : "/admin/pools"
                    }
                    className={`font-mono text-[11.5px] px-1.5 py-1 inline-block ${
                      r.action.tone === "dark"
                        ? "bg-ink text-lime"
                        : r.action.tone === "rust"
                          ? "bg-rust-dark text-white"
                          : "border border-ink"
                    }`}
                  >
                    {r.action.label}
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-2.5 border-t border-rule font-mono text-[11.5px] text-text-dim">
            3 more rows · escrow total ₦1,880,000 reconciles to the ledger
          </div>
        </div>
      </div>
    </div>
  );
}
