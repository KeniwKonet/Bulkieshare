import { SupplyHeader } from "@/components/nav";
import { Btn, GridTable, StatGrid } from "@/components/ui";
import { PURCHASE_ORDERS } from "@/lib/mock-data";

export const metadata = { title: "Payouts" };

export default function PayoutsPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <SupplyHeader active="payouts" />
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
        <div className="flex justify-between items-center mb-5">
          <h1 className="font-display text-[26px] tracking-tight">Payouts</h1>
          <span className="font-mono text-[11.5px] text-text-dim">JULY AND AUGUST 2026</span>
        </div>
        <StatGrid
          columns={3}
          items={[
            { label: "PAID TO YOU, 90 DAYS", value: "₦1.34M" },
            { label: "MEDIAN BALANCE PAYMENT", value: "1.4 days" },
            { label: "LATE PAYMENTS BY US", value: "0" },
          ]}
        />
        <div className="mt-6">
          <GridTable
            columns=".9fr 1.1fr 1fr 1fr 1.1fr"
            headers={["PO", "WHAT", "DEPOSIT", "BALANCE", "SETTLED"]}
            fontSize={13}
            rows={PURCHASE_ORDERS.map((po) => [
              po.po,
              po.item,
              po.deposit ? `₦${po.deposit.toLocaleString()}` : "—",
              po.balance ? `₦${po.balance.toLocaleString()}` : po.balanceStatus,
              <span
                key="s"
                className={
                  po.settled?.includes("short")
                    ? "text-rust-dark"
                    : po.settled
                      ? "text-green"
                      : "text-rust"
                }
              >
                {po.settled ?? "open"}
              </span>,
            ])}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
          <div className="border border-rust-dark bg-card p-4">
            <div className="font-mono text-[11px] text-rust-dark mb-2">WHY PO-8802 PAID SHORT</div>
            <p className="text-[14.5px] leading-relaxed text-text-mid">
              Four rams delivered, one rejected at intake for a visible leg injury and
              photographed. You were paid for three. The rejected animal was returned with the
              driver, not destroyed.
            </p>
          </div>
          <div className="border border-ink bg-card p-4">
            <div className="font-mono text-[11px] text-text-dim mb-2">PAYOUT ACCOUNT</div>
            <div className="text-[15.5px] font-bold">Sterling ····8220</div>
            <div className="text-[14px] text-text-dim mt-0.5">
              KUJE LIVESTOCK AGG. LTD · name matched 04 Jun
            </div>
            <Btn variant="outline" size="sm" className="mt-3">
              Change account
            </Btn>
            <p className="font-mono text-[10.5px] leading-relaxed text-text-dim mt-2.5">
              A change needs a field agent visit. Payouts pause until the new name is matched.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
