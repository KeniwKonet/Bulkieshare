import { redirect } from "next/navigation";

import { SupplyHeader } from "@/components/nav";
import { GridTable, StatGrid } from "@/components/ui";
import { requireRole } from "@/lib/auth/dal";
import { getSupplier, listPayouts, listPurchaseOrders } from "@/lib/domain/supply";
import { formatKobo } from "@/lib/money";
import { formatShortDate } from "@/lib/time";

export const metadata = { title: "Payouts" };

export default async function PayoutsPage() {
  const member = await requireRole("supplier");
  if (!member.supplierId) redirect("/supply/onboarding");

  const [payouts, orders, supplier] = await Promise.all([
    listPayouts(member.supplierId),
    listPurchaseOrders(member.supplierId),
    getSupplier(member.supplierId),
  ]);

  const paid = payouts.filter((p) => p.state === "paid");
  const paidKobo = paid.reduce((sum, p) => sum + p.amountKobo, 0);
  const pendingKobo = payouts
    .filter((p) => p.state !== "paid")
    .reduce((sum, p) => sum + p.amountKobo, 0);

  const shortPaid = orders.find((o) => o.state === "qc_failed");

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SupplyHeader active="payouts" />
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
        <div className="flex justify-between items-center mb-5 flex-wrap gap-3">
          <h1 className="font-display text-[26px] tracking-tight">Payouts</h1>
          <span className="font-mono text-[11.5px] text-text-dim">
            {payouts.length} PAYOUT{payouts.length === 1 ? "" : "S"}
          </span>
        </div>

        <StatGrid
          columns={3}
          items={[
            { label: "PAID TO YOU", value: formatKobo(paidKobo) },
            { label: "SCHEDULED, NOT YET PAID", value: formatKobo(pendingKobo) },
            { label: "ORDERS DELIVERED", value: String(supplier?.ordersDelivered ?? 0) },
          ]}
        />

        <div className="mt-6">
          {payouts.length === 0 ? (
            <p className="text-[15px] text-text-dim leading-relaxed">
              Nothing paid out yet. A payout is scheduled the moment QC passes on an order.
            </p>
          ) : (
            <GridTable
              columns=".9fr 1.2fr 1fr 1.1fr"
              headers={["PO", "WHAT", "AMOUNT", "STATE"]}
              fontSize={13}
              rows={payouts.map((p) => [
                p.po ?? "—",
                p.item ?? "—",
                formatKobo(p.amountKobo),
                <span key="s" className={p.state === "paid" ? "text-green" : "text-rust"}>
                  {p.paidAt ? `paid ${formatShortDate(p.paidAt)}` : p.state}
                </span>,
              ])}
            />
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
          {shortPaid && (
            <div className="border border-rust-dark bg-card p-4">
              <div className="font-mono text-[11px] text-rust-dark mb-2">
                WHY {shortPaid.po} PAID SHORT
              </div>
              <p className="text-[14.5px] leading-relaxed text-text-mid">
                {shortPaid.qcNote ??
                  "Part of the delivery was rejected at intake and photographed. You were paid for what passed."}
              </p>
            </div>
          )}

          <div className="border border-ink bg-card p-4">
            <div className="font-mono text-[11px] text-text-dim mb-2">PAYOUT ACCOUNT</div>
            <div className="text-[15.5px] font-bold">
              {supplier?.bankName ?? "No bank on file"}
              {supplier?.bankAccountNumber
                ? ` ····${supplier.bankAccountNumber.slice(-4)}`
                : ""}
            </div>
            <div className="text-[14px] text-text-dim mt-0.5">
              {supplier?.bankAccountName ?? "Add an account so we can pay you."}
            </div>
            <p className="font-mono text-[10.5px] leading-relaxed text-text-dim mt-2.5">
              A change needs a field agent visit. Payouts pause until the new name is matched.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
